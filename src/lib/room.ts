import {
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getDb } from "./firebase";

export type RoomStatus = "lobby" | "question" | "reveal" | "podium";

/** Only "quiz" is playable today; the others are teased as coming soon. */
export type GameMode = "quiz" | "spot-the-drive" | "defuse-the-pattern";

export type RoomConfig = {
  mode: GameMode;
  totalQuestions: number;
  secondsPerQuestion: number;
};

export const DEFAULT_CONFIG: RoomConfig = {
  mode: "quiz",
  totalQuestions: 10,
  secondsPerQuestion: 20,
};

export type Player = {
  id: string;
  name: string;
  joinedAt: number;
};

export type Room = {
  status: RoomStatus;
  questionIndex: number;
  config: RoomConfig;
  questionIds: string[];
  players: Player[];
};

/** Stored under rooms/{pin}/players/{playerId}. */
type PlayerRecord = {
  name: string;
  joinedAt: number | object; // number once the server resolves serverTimestamp()
};

function randomPin(): string {
  // 4 digits, 1000–9999, so it never renders with a dropped leading zero.
  return String(Math.floor(1000 + Math.random() * 9000));
}

function parsePlayers(value: Record<string, PlayerRecord> | null): Player[] {
  const players: Player[] = value
    ? Object.entries(value).map(([id, p]) => ({
        id,
        name: p.name,
        joinedAt: typeof p.joinedAt === "number" ? p.joinedAt : 0,
      }))
    : [];
  players.sort((a, b) => a.joinedAt - b.joinedAt);
  return players;
}

/**
 * Create a fresh room with a unique 4-digit PIN and the host's chosen config.
 * Retries on the (rare) collision with an existing room before giving up.
 */
export async function createRoom(config: RoomConfig): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt++) {
    const pin = randomPin();
    const snap = await get(ref(db, `rooms/${pin}`));
    if (!snap.exists()) {
      await set(ref(db, `rooms/${pin}`), {
        status: "lobby" satisfies RoomStatus,
        questionIndex: 0,
        config,
        createdAt: serverTimestamp(),
      });
      return pin;
    }
  }
  throw new Error("Couldn't find a free PIN. Please try again.");
}

export async function roomExists(pin: string): Promise<boolean> {
  const snap = await get(ref(getDb(), `rooms/${pin}`));
  return snap.exists();
}

/**
 * Add (or re-add) a player to a room's lobby. Using a caller-supplied playerId
 * means a dropped phone can reconnect to the same identity.
 */
export async function joinRoom(
  pin: string,
  playerId: string,
  name: string,
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/players/${playerId}`), {
    name,
    joinedAt: serverTimestamp(),
  } satisfies PlayerRecord);
}

/**
 * Host begins the game with a fixed set of questions (so every client shows
 * the same ones) and opens the first question.
 */
export async function startGame(
  pin: string,
  questionIds: string[],
): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "question" satisfies RoomStatus,
    questionIndex: 0,
    questionIds,
    questionStartedAt: serverTimestamp(),
  });
}

/** A player locks in their answer for the current question. */
export async function submitAnswer(
  pin: string,
  questionIndex: number,
  playerId: string,
  choice: number,
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/answers/${questionIndex}/${playerId}`), {
    choice,
    answeredAt: serverTimestamp(),
  });
}

/** Host (or the timer) reveals the correct answer for the current question. */
export async function revealQuestion(pin: string): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "reveal" satisfies RoomStatus,
  });
}

/** Host advances to the next question. */
export async function nextQuestion(
  pin: string,
  nextIndex: number,
): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "question" satisfies RoomStatus,
    questionIndex: nextIndex,
    questionStartedAt: serverTimestamp(),
  });
}

/** Host ends the round (leaderboard/podium arrive in a later phase). */
export async function endGame(pin: string): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "podium" satisfies RoomStatus,
  });
}

/** Live count of how many players have answered the given question. */
export function subscribeAnswerCount(
  pin: string,
  questionIndex: number,
  onChange: (count: number) => void,
): () => void {
  const answersRef = ref(getDb(), `rooms/${pin}/answers/${questionIndex}`);
  return onValue(answersRef, (snap) => {
    onChange(snap.exists() ? Object.keys(snap.val()).length : 0);
  });
}

/**
 * Subscribe to the live roster for a room. Returns an unsubscribe function.
 * Players are sorted by join order so the list is stable as it grows.
 */
export function subscribePlayers(
  pin: string,
  onChange: (players: Player[]) => void,
): () => void {
  const playersRef = ref(getDb(), `rooms/${pin}/players`);
  return onValue(playersRef, (snap) => {
    onChange(parsePlayers(snap.val() as Record<string, PlayerRecord> | null));
  });
}

/**
 * Subscribe to the whole room (status, config, roster). Used by the host so a
 * refresh resumes the right screen. Returns null while the room is missing.
 */
export function subscribeRoom(
  pin: string,
  onChange: (room: Room | null) => void,
): () => void {
  const roomRef = ref(getDb(), `rooms/${pin}`);
  return onValue(roomRef, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const v = snap.val() as {
      status?: RoomStatus;
      questionIndex?: number;
      config?: Partial<RoomConfig>;
      questionIds?: string[];
      players?: Record<string, PlayerRecord> | null;
    };
    onChange({
      status: v.status ?? "lobby",
      questionIndex: v.questionIndex ?? 0,
      config: { ...DEFAULT_CONFIG, ...v.config },
      questionIds: v.questionIds ?? [],
      players: parsePlayers(v.players ?? null),
    });
  });
}
