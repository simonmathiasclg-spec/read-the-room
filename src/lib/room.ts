import {
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";
import { getDb } from "./firebase";

export type RoomStatus = "lobby" | "question" | "reveal" | "podium";

export type Player = {
  id: string;
  name: string;
  joinedAt: number;
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

/**
 * Create a fresh room with a unique 4-digit PIN. Retries on the (rare)
 * collision with an existing room before giving up.
 */
export async function createRoom(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt++) {
    const pin = randomPin();
    const snap = await get(ref(db, `rooms/${pin}`));
    if (!snap.exists()) {
      await set(ref(db, `rooms/${pin}`), {
        status: "lobby" satisfies RoomStatus,
        questionIndex: 0,
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
 * Subscribe to the live roster for a room. Returns an unsubscribe function.
 * Players are sorted by join order so the list is stable as it grows.
 */
export function subscribePlayers(
  pin: string,
  onChange: (players: Player[]) => void,
): () => void {
  const playersRef = ref(getDb(), `rooms/${pin}/players`);
  return onValue(playersRef, (snap) => {
    const value = snap.val() as Record<string, PlayerRecord> | null;
    const players: Player[] = value
      ? Object.entries(value).map(([id, p]) => ({
          id,
          name: p.name,
          joinedAt: typeof p.joinedAt === "number" ? p.joinedAt : 0,
        }))
      : [];
    players.sort((a, b) => a.joinedAt - b.joinedAt);
    onChange(players);
  });
}
