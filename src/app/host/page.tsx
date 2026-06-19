"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { Wordmark } from "@/components/brand/Wordmark";
import { ButtonLink, Button } from "@/components/ui/Button";
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

  // ---- Pre-create: invite to start the show ----------------------------
  if (!pin) {
    return (
      <main className="stage flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <Wordmark tone="light" />
        <h1 className="font-display text-5xl font-black leading-[0.95] sm:text-7xl">
          Host the
          <br />
          <span className="text-psc-gold">big screen</span>
        </h1>
        <p className="max-w-sm text-lg text-white/70">
          Create a room, put this on the projector, and players join from their
          phones with the PIN.
        </p>
        <Button onClick={handleCreate} loading={creating} size="lg">
          {creating ? "Creating…" : "Create a room"}
        </Button>
        {error && <p className="font-semibold text-psc-gold">{error}</p>}
        <ButtonLink href="/" variant="ghost" size="sm" className="!text-white/60">
          ← Back
        </ButtonLink>
      </main>
    );
  }

  // ---- Live lobby: the projected game-show screen ----------------------
  return (
    <main className="stage flex flex-1 flex-col px-6 py-8 sm:px-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Wordmark tone="light" size="sm" />
        <p className="text-right text-sm font-semibold text-white/60 sm:text-base">
          Join at{" "}
          <span className="font-bold text-white">
            {(origin || "this site").replace(/^https?:\/\//, "")}/play
          </span>
        </p>
      </div>

      {/* PIN hero */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-psc-gold">
          Game PIN
        </p>
        <div className="flex gap-3 sm:gap-5" style={{ animation: "var(--animate-pop)" }}>
          {pin.split("").map((digit, i) => (
            <span
              key={i}
              className="flex size-20 items-center justify-center rounded-2xl bg-white font-mono text-5xl font-black text-psc-black shadow-[0_8px_0_rgba(0,0,0,0.35)] sm:size-32 sm:rounded-3xl sm:text-8xl"
            >
              {digit}
            </span>
          ))}
        </div>
        <p className="text-base text-white/55">
          Enter this PIN at <span className="font-semibold text-white/80">/play</span> to jump in.
        </p>
      </div>

      {/* Roster */}
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
        <PlayerRoster players={players} tone="stage" />
      </div>

      <div className="mt-6 flex justify-center">
        <Button onClick={handleNewRoom} variant="ghost" size="sm" className="!text-white/50">
          End &amp; start a new room
        </Button>
      </div>
    </main>
  );
}
