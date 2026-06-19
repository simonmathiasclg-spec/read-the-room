"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button, ButtonLink } from "@/components/ui/Button";
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

  // ---- Joined: the waiting-room controller -----------------------------
  if (joined) {
    return (
      <main className="wash flex flex-1 flex-col items-center px-6 py-10 text-center">
        <div
          className="flex w-full max-w-md flex-1 flex-col items-center"
          style={{ animation: "var(--animate-rise)" }}
        >
          <span className="text-5xl" aria-hidden>
            🎉
          </span>
          <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">
            You&apos;re in!
          </h1>
          <p className="mt-2 text-lg text-psc-gray-2">
            <span className="font-bold text-psc-black">{name}</span> · room{" "}
            <span className="font-mono font-bold text-psc-red">{pin}</span>
          </p>

          <div className="mt-7 w-full rounded-2xl bg-psc-black px-6 py-5 text-xl font-extrabold text-white">
            👀 Look up at the big screen
          </div>

          <div className="mt-7 w-full rounded-3xl border border-black/5 bg-white p-5 text-left shadow-[0_2px_24px_rgba(17,17,17,0.07)]">
            <PlayerRoster
              players={players}
              highlightId={playerId}
              emptyLabel="You're first in — hang tight!"
            />
          </div>

          <Button
            onClick={handleLeave}
            variant="ghost"
            size="sm"
            className="mt-8"
          >
            Leave room
          </Button>
        </div>
      </main>
    );
  }

  // ---- Join form -------------------------------------------------------
  return (
    <main className="wash flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <Wordmark className="mb-8" />
        <h1 className="font-display text-5xl font-black leading-[0.95]">
          Join the
          <br />
          <span className="text-psc-red">game</span>
        </h1>

        <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
              Game PIN
            </span>
            <input
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="1234"
              aria-label="Game PIN"
              className="rounded-2xl border-2 border-psc-gray-1 bg-white px-4 py-5 text-center font-mono text-4xl font-black tracking-[0.4em] tabular-nums outline-none transition-colors placeholder:text-psc-gray-1/50 focus:border-psc-red focus:ring-4 focus:ring-psc-red/15"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
              Your name
            </span>
            <input
              autoComplete="off"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              aria-label="Your name"
              className="rounded-2xl border-2 border-psc-gray-1 bg-white px-4 py-4 text-xl font-semibold outline-none transition-colors placeholder:text-psc-gray-1 focus:border-psc-red focus:ring-4 focus:ring-psc-red/15"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-psc-red/10 px-4 py-3 font-semibold text-psc-red"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={joining} size="lg" fullWidth>
            {joining ? "Joining…" : "Join game"}
          </Button>
        </form>

        <ButtonLink href="/" variant="ghost" size="sm" className="mt-6">
          ← Back
        </ButtonLink>
      </div>
    </main>
  );
}
