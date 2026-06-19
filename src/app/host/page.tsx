"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { Wordmark } from "@/components/brand/Wordmark";
import { HostQuiz } from "@/components/quiz/HostQuiz";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { isFirebaseConfigured } from "@/lib/firebase";
import { pickQuestionIds } from "@/lib/questions";
import {
  createRoom,
  startGame,
  subscribeRoom,
  DEFAULT_CONFIG,
  type GameMode,
  type Room,
  type RoomConfig,
} from "@/lib/room";

const HOST_PIN_KEY = "rtr:hostPin";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const SECONDS_PER_Q = [10, 15, 20, 30] as const;

const MODES: {
  id: GameMode;
  name: string;
  blurb: string;
  active: boolean;
}[] = [
  { id: "quiz", name: "Kahoot Quiz", blurb: "Timed multiple-choice PI trivia.", active: true },
  { id: "spot-the-drive", name: "Spot the Drive", blurb: "Read the behavioral drives.", active: false },
  { id: "defuse-the-pattern", name: "Defuse the Pattern", blurb: "Crack the PI pattern.", active: false },
];

export default function HostPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [config, setConfig] = useState<RoomConfig>(DEFAULT_CONFIG);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const unsubscribe = useRef<(() => void) | null>(null);

  // Mount: capture origin (for the QR/join URL) and resume a saved room.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reads from window/localStorage
    setOrigin(window.location.origin);
    if (!isFirebaseConfigured) return;
    const saved = localStorage.getItem(HOST_PIN_KEY);
    if (saved) setPin(saved); // subscribe effect validates and may clear it
  }, []);

  // Live room subscription (status, config, roster) for whatever PIN we host.
  useEffect(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    if (!pin) return; // room is reset by the handler that cleared the pin
    unsubscribe.current = subscribeRoom(pin, (r) => {
      if (r === null) {
        // Room was removed (e.g. cleaned up) — drop back to setup.
        localStorage.removeItem(HOST_PIN_KEY);
        setPin(null);
        setRoom(null);
      } else {
        setRoom(r);
      }
    });
    return () => {
      unsubscribe.current?.();
      unsubscribe.current = null;
    };
  }, [pin]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const newPin = await createRoom(config);
      localStorage.setItem(HOST_PIN_KEY, newPin);
      setPin(newPin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }, [config]);

  const handleStart = useCallback(async () => {
    if (!pin || !room) return;
    setStarting(true);
    setError(null);
    try {
      const questionIds = pickQuestionIds(room.config.totalQuestions);
      await startGame(pin, questionIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the game.");
      setStarting(false);
    }
  }, [pin, room]);

  const handleNewRoom = useCallback(() => {
    localStorage.removeItem(HOST_PIN_KEY);
    setPin(null);
    setRoom(null);
  }, []);

  if (!isFirebaseConfigured) return <SetupNotice />;

  // ===== A. Setup — configure the game ==================================
  if (!pin) {
    return (
      <main className="wash flex flex-1 flex-col items-center px-6 py-10 sm:py-14">
        <div className="w-full max-w-xl">
          <Wordmark className="mb-6" />
          <h1 className="font-display text-4xl font-black leading-[0.95] sm:text-5xl">
            Set up your game
          </h1>
          <p className="mt-3 text-lg text-psc-gray-2">
            Pick a mode and a round length, then put the big screen on the
            projector.
          </p>

          {/* Game mode */}
          <div className="mt-9">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
              Game mode
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => {
                const selected = config.mode === m.id && m.active;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.active}
                    aria-pressed={selected}
                    onClick={() => m.active && setConfig((c) => ({ ...c, mode: m.id }))}
                    className={[
                      "relative rounded-2xl border-2 p-4 text-left transition-all duration-100",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
                      !m.active
                        ? "cursor-not-allowed border-black/5 bg-black/[0.02] opacity-70"
                        : selected
                          ? "border-psc-red bg-psc-red/5 shadow-[0_4px_0_var(--psc-red-deep)]"
                          : "border-black/10 bg-white hover:border-psc-black/40",
                    ].join(" ")}
                  >
                    {!m.active && (
                      <span className="absolute right-3 top-3 rounded-full bg-psc-gray-1/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-psc-gray-2">
                        Coming soon
                      </span>
                    )}
                    <span className="block font-display text-lg font-extrabold">
                      {m.name}
                    </span>
                    <span className="mt-1 block text-sm text-psc-gray-2">
                      {m.blurb}
                    </span>
                    {selected && (
                      <span className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-psc-red">
                        ● Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Round options */}
          <div className="mt-8 flex flex-col gap-7">
            <Segmented
              label="Number of questions"
              name="questions"
              options={QUESTION_COUNTS}
              value={config.totalQuestions}
              onChange={(v) => setConfig((c) => ({ ...c, totalQuestions: v }))}
            />
            <Segmented
              label="Seconds per question"
              name="seconds"
              options={SECONDS_PER_Q}
              value={config.secondsPerQuestion}
              onChange={(v) =>
                setConfig((c) => ({ ...c, secondsPerQuestion: v }))
              }
              renderOption={(s) => `${s}s`}
            />
          </div>

          {error && <p className="mt-6 font-semibold text-psc-red">{error}</p>}

          <Button
            onClick={handleCreate}
            loading={creating}
            size="lg"
            fullWidth
            className="mt-9"
          >
            {creating ? "Creating…" : "Host game →"}
          </Button>
        </div>
      </main>
    );
  }

  // While resuming a saved room, before the first snapshot arrives.
  if (!room) {
    return (
      <main className="stage flex flex-1 items-center justify-center">
        <p className="text-lg text-white/60">Loading room…</p>
      </main>
    );
  }

  const joinHost = (origin || "this site").replace(/^https?:\/\//, "");
  const joinUrl = origin ? `${origin}/play?pin=${pin}` : "";

  // ===== C. Live quiz — question + reveal loop ==========================
  // Require questionIds so a stale/half-written room can't dead-end the host;
  // without them it falls back to the lobby, where "Start" re-seeds the round.
  if (
    (room.status === "question" || room.status === "reveal") &&
    room.questionIds.length > 0
  ) {
    return <HostQuiz pin={pin} room={room} />;
  }

  // ===== D. Round complete (leaderboard/podium arrive next phase) =======
  if (room.status === "podium") {
    return (
      <main className="stage flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <Wordmark tone="light" size="sm" />
        <h1 className="font-display text-5xl font-black sm:text-7xl">
          That&apos;s a wrap! 🎉
        </h1>
        <p className="max-w-md text-lg text-white/70">
          {room.players.length} player{room.players.length === 1 ? "" : "s"} ·{" "}
          {room.config.totalQuestions} questions played. Scoring, the
          leaderboard, and the podium land in the next phase.
        </p>
        <Button
          onClick={handleNewRoom}
          variant="gold"
          size="lg"
        >
          New game →
        </Button>
      </main>
    );
  }

  // ===== B. Waiting room — the projected stage =========================
  const canStart = room.players.length > 0;
  return (
    <main className="stage flex flex-1 flex-col px-6 py-7 sm:px-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Wordmark tone="light" size="sm" />
        <p className="text-right text-sm font-semibold text-white/60 sm:text-base">
          Join at <span className="font-bold text-white">{joinHost}/play</span>
        </p>
      </div>

      {/* PIN + QR */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-8 lg:flex-row lg:gap-16">
        <div
          className="flex flex-col items-center gap-5"
          style={{ animation: "var(--animate-pop)" }}
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-psc-gold">
            Game PIN
          </p>
          <div className="flex gap-3 sm:gap-4">
            {pin.split("").map((digit, i) => (
              <span
                key={i}
                className="flex size-16 items-center justify-center rounded-2xl bg-white font-mono text-4xl font-black text-psc-black shadow-[0_8px_0_rgba(0,0,0,0.35)] sm:size-24 sm:text-6xl"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-psc-gold">
            Scan to join
          </p>
          <div className="rounded-3xl bg-white p-4 shadow-[0_8px_0_rgba(0,0,0,0.35)]">
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={196}
                level="M"
                marginSize={0}
                aria-label={`QR code to join room ${pin}`}
              />
            ) : (
              <div className="size-[196px]" />
            )}
          </div>
          <p className="text-sm text-white/55">Points straight to the name screen</p>
        </div>
      </div>

      {/* Roster */}
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
        <PlayerRoster players={room.players} tone="stage" />
      </div>

      {/* Controls */}
      <div className="mt-7 flex flex-col items-center gap-3">
        <Button
          onClick={handleStart}
          loading={starting}
          variant="gold"
          size="lg"
          disabled={!canStart}
        >
          {starting
            ? "Starting…"
            : canStart
              ? `Start game · ${room.players.length} in →`
              : "Waiting for players…"}
        </Button>
        {error && <p className="font-semibold text-psc-gold">{error}</p>}
        <Button
          onClick={handleNewRoom}
          variant="ghost"
          size="sm"
          className="!text-white/50"
        >
          End &amp; start a new room
        </Button>
      </div>
    </main>
  );
}
