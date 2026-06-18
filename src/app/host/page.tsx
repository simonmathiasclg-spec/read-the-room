"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  createRoom,
  roomExists,
  subscribePlayers,
  type Player,
} from "@/lib/room";

const HOST_PIN_KEY = "rtr:hostPin";

export default function HostPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const unsubscribe = useRef<(() => void) | null>(null);

  // Resume a room we previously hosted (survives a refresh / accidental nav away).
  // One-time sync from browser-only sources (window, localStorage) on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read window origin once on mount
    setOrigin(window.location.origin);
    if (!isFirebaseConfigured) return;
    const saved = localStorage.getItem(HOST_PIN_KEY);
    if (!saved) return;
    roomExists(saved)
      .then((exists) => {
        if (exists) setPin(saved);
        else localStorage.removeItem(HOST_PIN_KEY);
      })
      .catch(() => {});
  }, []);

  // Keep the live roster in sync with whatever room we're hosting.
  useEffect(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    if (!pin) return;
    unsubscribe.current = subscribePlayers(pin, setPlayers);
    return () => {
      unsubscribe.current?.();
      unsubscribe.current = null;
    };
  }, [pin]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const newPin = await createRoom();
      localStorage.setItem(HOST_PIN_KEY, newPin);
      setPin(newPin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }, []);

  const handleNewRoom = useCallback(() => {
    localStorage.removeItem(HOST_PIN_KEY);
    setPlayers([]);
    setPin(null);
  }, []);

  if (!isFirebaseConfigured) return <SetupNotice />;

  if (!pin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <span className="inline-block h-1 w-16 rounded-full bg-psc-gold" />
        <h1 className="text-4xl font-black">Host the big screen</h1>
        <p className="max-w-sm text-psc-gray-2">
          Create a room and players join by PIN on their phones.
        </p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-2xl bg-psc-red px-10 py-5 text-xl font-bold text-white shadow-lg shadow-psc-red/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-psc-red"
        >
          {creating ? "Creating…" : "Create a room"}
        </button>
        {error && <p className="font-medium text-psc-red">{error}</p>}
        <Link href="/" className="text-sm text-psc-gray-2 underline">
          ← Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-psc-gray-2">
        Join at <span className="text-psc-black">{origin || "this site"}/play</span>
      </p>

      <div className="my-6 flex flex-col items-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-psc-gray-2">
          Game PIN
        </span>
        <span className="font-mono text-7xl font-black tracking-[0.15em] text-psc-red tabular-nums sm:text-8xl">
          {pin}
        </span>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-psc-gray-1/40 p-5">
        <PlayerRoster players={players} />
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleNewRoom}
          className="text-sm font-semibold text-psc-gray-2 underline"
        >
          End &amp; start a new room
        </button>
      </div>
    </main>
  );
}
