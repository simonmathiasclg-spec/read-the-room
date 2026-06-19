import {
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getDb } from "./firebase";
import type { Character } from "./character";

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
  score: number;
  streak: number;
  character?: Character;
};

/** Per-player outcome of a single question (written by the host at reveal). */
export type QuestionResult = {
  correct: boolean;
  points: number;
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
  score?: number;
  streak?: number;
  character?: Character;
};

function randomPin(): string {
  // 4 digits, 1000–9999, so it never renders with a dropped leading zero.
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Sorted by score (desc) then join order, so the leaderboard is stable. */
export function rankPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => b.score - a.score || a.joinedAt - b.joinedAt,
  );
}

function parsePlayers(value: Record<string, PlayerRecord> | null): Player[] {
  const players: Player[] = value
    ? Object.entries(value).map(([id, p]) => ({
        id,
        name: p.name,
        joinedAt: typeof p.joinedAt === "number" ? p.joinedAt : 0,
        score: p.score ?? 0,
        streak: p.streak ?? 0,
        character: p.character,
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
  character?: Character,
): Promise<void> {
  // update (not set) so a mid-game reconnect keeps the player's score/streak
  // (and existing character, when no new one is supplied).
  const data: Record<string, unknown> = { name, joinedAt: serverTimestamp() };
  if (character) data.character = character;
  await update(ref(getDb(), `rooms/${pin}/players/${playerId}`), data);
}

/** Live cosmetic update of a player's chosen character. */
export async function updateCharacter(
  pin: string,
  playerId: string,
  character: Character,
): Promise<void> {
  await update(
    ref(getDb(), `rooms/${pin}/players/${playerId}/character`),
    character,
  );
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

type AnswerRecord = { choice: number; answeredAt: number };

/**
 * Compute the points for a single answer (host-authoritative scoring).
 * Correct = 500 + 500 × (timeLeft / total), rounded, plus a +100-per-extra
 * streak bonus. Wrong / no answer = 0.
 */
export function scoreAnswer(
  correct: boolean,
  newStreak: number,
  secondsPerQuestion: number,
  timeLeftSeconds: number,
): number {
  if (!correct) return 0;
  const frac = secondsPerQuestion > 0 ? timeLeftSeconds / secondsPerQuestion : 0;
  const base = Math.round(500 + 500 * Math.max(0, Math.min(1, frac)));
  const streakBonus = Math.max(0, newStreak - 1) * 100;
  return base + streakBonus;
}

/**
 * Host reveals the current question AND scores it in one atomic write:
 * updates each player's cumulative score + streak, records per-player results,
 * and flips the room to "reveal".
 */
export async function scoreAndReveal(
  pin: string,
  questionIndex: number,
  correctIndex: number,
  secondsPerQuestion: number,
): Promise<void> {
  const db = getDb();
  const snap = await get(ref(db, `rooms/${pin}`));
  const room = snap.val() as {
    questionStartedAt?: number;
    players?: Record<string, PlayerRecord>;
    answers?: Record<string, Record<string, AnswerRecord>>;
  } | null;
  if (!room) return;

  const startedAt = room.questionStartedAt ?? 0;
  const answers = room.answers?.[questionIndex] ?? {};
  const players = room.players ?? {};

  const updates: Record<string, unknown> = {
    status: "reveal" satisfies RoomStatus,
  };

  for (const [pid, p] of Object.entries(players)) {
    const ans = answers[pid];
    const correct = !!ans && ans.choice === correctIndex;

    let timeLeft = 0;
    if (correct && typeof ans.answeredAt === "number" && startedAt) {
      const elapsed = (ans.answeredAt - startedAt) / 1000;
      timeLeft = Math.max(0, secondsPerQuestion - elapsed);
    }
    const newStreak = correct ? (p.streak ?? 0) + 1 : 0;
    const points = scoreAnswer(correct, newStreak, secondsPerQuestion, timeLeft);

    updates[`players/${pid}/score`] = (p.score ?? 0) + points;
    updates[`players/${pid}/streak`] = newStreak;
    updates[`results/${questionIndex}/${pid}`] = { correct, points };
  }

  await update(ref(db, `rooms/${pin}`), updates);
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

/** A player watches for their own scored result on the current question. */
export function subscribeResult(
  pin: string,
  questionIndex: number,
  playerId: string,
  onChange: (result: QuestionResult | null) => void,
): () => void {
  const resultRef = ref(
    getDb(),
    `rooms/${pin}/results/${questionIndex}/${playerId}`,
  );
  return onValue(resultRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as QuestionResult) : null);
  });
}

/** Host watches all scored results for a question (to show per-round deltas). */
export function subscribeResults(
  pin: string,
  questionIndex: number,
  onChange: (results: Record<string, QuestionResult>) => void,
): () => void {
  const resultsRef = ref(getDb(), `rooms/${pin}/results/${questionIndex}`);
  return onValue(resultsRef, (snap) => {
    onChange(
      snap.exists() ? (snap.val() as Record<string, QuestionResult>) : {},
    );
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
