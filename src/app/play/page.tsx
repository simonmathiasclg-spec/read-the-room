"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  joinRoom,
  roomExists,
  subscribePlayers,
  type Player,
} from "@/lib/room";

const PLAYER_ID_KEY = "rtr:playerId";
const SESSION_KEY = "rtr:session";

/** Stable per-device id so a dropped phone reconnects as the same player. */
function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export default function PlayPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const unsubscribe = useRef<(() => void) | null>(null);

  // Bootstrap: identity, deep-linked ?pin=, and auto-reconnect to a live room.
  // These are one-time syncs from browser-only sources (localStorage, the URL),
  // so the setState-in-effect calls here are intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const id = getPlayerId();
    setPlayerId(id);

    const linkedPin = new URLSearchParams(window.location.search).get("pin");
    if (linkedPin) setPin(linkedPin.replace(/\D/g, "").slice(0, 4));

    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as { pin: string; name: string };
      roomExists(session.pin).then((exists) => {
        if (!exists) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }
        // Re-assert our player record and resume the lobby.
        setPin(session.pin);
        setName(session.name);
        joinRoom(session.pin, id, session.name)
          .then(() => setJoined(true))
          .catch(() => {});
      });
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live roster once we're in a room.
  useEffect(() => {
    if (!joined || !pin) return;
    unsubscribe.current = subscribePlayers(pin, setPlayers);
    return () => {
      unsubscribe.current?.();
      unsubscribe.current = null;
    };
  }, [joined, pin]);

  const handleJoin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanPin = pin.trim();
      const cleanName = name.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        setError("Enter the 4-digit PIN from the big screen.");
        return;
      }
      if (!cleanName) {
        setError("Pick a name so the room knows it's you.");
        return;
      }

      setJoining(true);
      setError(null);
      try {
        if (!(await roomExists(cleanPin))) {
          setError("No room with that PIN. Check the big screen.");
          return;
        }
        await joinRoom(cleanPin, playerId, cleanName);
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ pin: cleanPin, name: cleanName }),
        );
        setJoined(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      } finally {
        setJoining(false);
      }
    },
    [pin, name, playerId],
  );

  const handleLeave = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    unsubscribe.current?.();
    unsubscribe.current = null;
    setJoined(false);
    setPlayers([]);
    setName("");
  }, []);

  if (!isFirebaseConfigured) return <SetupNotice />;

  if (joined) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-10 text-center">
        <span className="inline-block h-1 w-16 rounded-full bg-psc-gold" />
        <h1 className="mt-4 text-3xl font-black">You&apos;re in! 🎉</h1>
        <p className="mt-1 text-psc-gray-2">
          Room <span className="font-mono font-bold text-psc-black">{pin}</span> ·
          look up at the big screen.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-psc-gray-1/40 p-5">
          <PlayerRoster players={players} highlightId={playerId} />
        </div>

        <button
          onClick={handleLeave}
          className="mt-8 text-sm font-semibold text-psc-gray-2 underline"
        >
          Leave room
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <span className="mb-4 inline-block h-1 w-16 rounded-full bg-psc-gold" />
      <h1 className="text-4xl font-black">Join the game</h1>

      <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-psc-gray-2">
            Game PIN
          </span>
          <input
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            className="rounded-xl border-2 border-psc-gray-1 px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.3em] tabular-nums outline-none focus:border-psc-red"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-psc-gray-2">
            Your name
          </span>
          <input
            autoComplete="off"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            className="rounded-xl border-2 border-psc-gray-1 px-4 py-4 text-xl font-semibold outline-none focus:border-psc-red"
          />
        </label>

        {error && <p className="font-medium text-psc-red">{error}</p>}

        <button
          type="submit"
          disabled={joining}
          className="rounded-2xl bg-psc-red px-8 py-5 text-xl font-bold text-white shadow-lg shadow-psc-red/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-psc-red"
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </form>

      <Link href="/" className="mt-8 text-sm text-psc-gray-2 underline">
        ← Back
      </Link>
    </main>
  );
}
