import {
  get,
  onValue,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getDb } from "./firebase";
import {
  deserializeCharacter,
  serializeCharacter,
  type Character,
  type StoredCharacter,
} from "./character";
import { orderCloseness, sliderCloseness } from "./questions";

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
  character?: StoredCharacter;
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
        character: deserializeCharacter(p.character),
      }))
    : [];
  players.sort((a, b) => a.joinedAt - b.joinedAt);
  return players;
}

/**
 * Create a brand-new, empty room with a unique 4-digit PIN and the host's chosen
 * config. Uses a transaction to CLAIM the PIN atomically, so two hosts creating
 * at the same instant can never land in the same room — if a PIN is already
 * taken (or two hosts race the same PIN), the transaction aborts and we retry
 * with a fresh PIN. The room is created with zero players.
 */
export async function createRoom(config: RoomConfig): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 25; attempt++) {
    const pin = randomPin();
    const result = await runTransaction(
      ref(db, `rooms/${pin}`),
      (current) => {
        if (current !== null) return; // slot already taken → abort, try another PIN
        return {
          status: "lobby" satisfies RoomStatus,
          questionIndex: 0,
          config,
          createdAt: serverTimestamp(),
        };
      },
      { applyLocally: false },
    );
    if (result.committed && result.snapshot.exists()) return pin;
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
  if (character) data.character = serializeCharacter(character);
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
    serializeCharacter(character),
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

/** A player locks in a tile answer (mc / tf / graph) for the current question. */
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

/** A player submits a slider placement (one 0–100 value per factor). */
export async function submitPlacement(
  pin: string,
  questionIndex: number,
  playerId: string,
  placement: number[],
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/answers/${questionIndex}/${playerId}`), {
    placement,
    answeredAt: serverTimestamp(),
  });
}

/** A player submits an ordering (`order[position] = original item index`). */
export async function submitOrder(
  pin: string,
  questionIndex: number,
  playerId: string,
  order: number[],
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/answers/${questionIndex}/${playerId}`), {
    order,
    answeredAt: serverTimestamp(),
  });
}

export type AnswerRecord = {
  choice?: number;
  placement?: number[];
  order?: number[];
  answeredAt: number;
};

/**
 * How the host should score a question at reveal:
 * - choice  → mc / tf / graph (tap the correct tile position)
 * - slider  → closeness of the placement to each factor's target
 * - order   → fraction of items in the correct position
 */
export type Scoring =
  | { kind: "choice"; correctIndex: number }
  | { kind: "slider"; targets: number[]; tolerance: number }
  | { kind: "order"; count: number };

// A slider/order answer counts as "correct" (green flash + streak) at or above
// this closeness; partial credit is still awarded below it.
const CORRECT_THRESHOLD = 0.6;

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
 *
 * Tile questions (mc/tf/graph) are all-or-nothing; slider/order award partial
 * credit by closeness. Both then get the same speed + streak treatment.
 */
export async function scoreAndReveal(
  pin: string,
  questionIndex: number,
  scoring: Scoring,
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

    // quality in [0,1]: 1/0 for tile questions, closeness for slider/order.
    let quality = 0;
    if (ans) {
      if (scoring.kind === "choice") {
        quality = ans.choice === scoring.correctIndex ? 1 : 0;
      } else if (scoring.kind === "slider" && ans.placement) {
        quality = sliderCloseness(ans.placement, scoring.targets, scoring.tolerance);
      } else if (scoring.kind === "order" && ans.order) {
        quality = orderCloseness(ans.order, scoring.count);
      }
    }

    const correct =
      scoring.kind === "choice" ? quality === 1 : quality >= CORRECT_THRESHOLD;

    let timeLeft = 0;
    if (quality > 0 && ans && typeof ans.answeredAt === "number" && startedAt) {
      const elapsed = (ans.answeredAt - startedAt) / 1000;
      timeLeft = Math.max(0, secondsPerQuestion - elapsed);
    }
    const newStreak = correct ? (p.streak ?? 0) + 1 : 0;

    let points: number;
    if (scoring.kind === "choice") {
      points = scoreAnswer(correct, newStreak, secondsPerQuestion, timeLeft);
    } else {
      // Closeness scales the base; speed + streak apply as usual.
      const frac =
        secondsPerQuestion > 0
          ? Math.max(0, Math.min(1, timeLeft / secondsPerQuestion))
          : 0;
      const base = 500 + 500 * frac;
      const streakBonus = correct ? Math.max(0, newStreak - 1) * 100 : 0;
      points = Math.round(quality * base) + streakBonus;
    }

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

/** A transient emote a player broadcasts (lobby / podium). */
export type EmoteBroadcast = { key: string; at: number };

/** Broadcast a player's emote to the room. */
export async function sendEmote(
  pin: string,
  playerId: string,
  key: string,
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/emotes/${playerId}`), {
    key,
    at: serverTimestamp(),
  });
}

/** Subscribe to everyone's latest emote (playerId → {key, at}). */
export function subscribeEmotes(
  pin: string,
  onChange: (emotes: Record<string, EmoteBroadcast>) => void,
): () => void {
  const emotesRef = ref(getDb(), `rooms/${pin}/emotes`);
  return onValue(emotesRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as Record<string, EmoteBroadcast>) : {});
  });
}

/** Host reads the raw answers for a question (to show where people placed). */
export function subscribeAnswers(
  pin: string,
  questionIndex: number,
  onChange: (answers: Record<string, AnswerRecord>) => void,
): () => void {
  const answersRef = ref(getDb(), `rooms/${pin}/answers/${questionIndex}`);
  return onValue(answersRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as Record<string, AnswerRecord>) : {});
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
