"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import SetupNotice from "@/components/SetupNotice";
import { CritterScatter } from "@/components/character/CritterScatter";
import { Wordmark } from "@/components/brand/Wordmark";
import { HostQuiz } from "@/components/quiz/HostQuiz";
import { HostDefuse } from "@/components/defuse/HostDefuse";
import { Podium } from "@/components/quiz/Podium";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { isFirebaseConfigured } from "@/lib/firebase";
import { pickQuestionIds, type Difficulty } from "@/lib/questions";
import { pickScenarioIds, startDefuse } from "@/lib/defuse";
import { stingIfPlaying } from "@/lib/hostMusic";
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
const HOST_DIFFICULTY_KEY = "rtr:hostDifficulty";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const SECONDS_PER_Q = [10, 15, 20, 30] as const;

// Defuse the Pattern uses scenario counts + a pace (which maps to the timer).
const SCENARIO_COUNTS = [3, 5, 8, 10] as const;
const DEFUSE_PACES = [90, 60] as const; // seconds → "Standard" / "Pressure"
const DEFUSE_PACE_LABELS: Record<number, string> = {
  90: "Standard · 90s",
  60: "Pressure · 60s",
};
const DEFUSE_DEFAULTS = { totalQuestions: 5, secondsPerQuestion: 90 } as const;
const DIFFICULTIES = ["mixed", "rookie", "pro", "practitioner"] as const;
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  mixed: "Mixed",
  rookie: "Rookie",
  pro: "Pro",
  practitioner: "Hard",
};
const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  mixed: "A balanced blend of rookie, pro & practitioner questions.",
  rookie: "The four factors, behaviors & needs.",
  pro: "Factor combinations & reference profiles.",
  practitioner: "Interpretation & the Cognitive Assessment.",
};

const MODES: {
  id: GameMode;
  name: string;
  blurb: string;
  active: boolean;
}[] = [
  { id: "quiz", name: "PI Training", blurb: "Timed multiple-choice PI trivia.", active: true },
  { id: "defuse-the-pattern", name: "Defuse the Pattern", blurb: "Co-op: split the clues, read the drives, defuse it together.", active: true },
  { id: "spot-the-drive", name: "Spot the Drive", blurb: "Read the behavioral drives.", active: false },
];

export default function HostPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [config, setConfig] = useState<RoomConfig>(DEFAULT_CONFIG);
  // Difficulty filters which tiers the round draws from. Kept host-side (drives
  // question selection at start) rather than in the room config, so it needs no
  // security-rules change.
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const unsubscribe = useRef<(() => void) | null>(null);

  // Mount: capture origin (for the QR/join URL) and restore only the difficulty
  // preference. Hosting ALWAYS starts fresh — we never resume/join a leftover
  // room, so we clear any stale saved PIN and land on the setup screen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reads from window/localStorage
    setOrigin(window.location.origin);
    const savedDifficulty = localStorage.getItem(HOST_DIFFICULTY_KEY);
    if (savedDifficulty && savedDifficulty in DIFFICULTY_LABELS) {
      setDifficulty(savedDifficulty as Difficulty);
    }
    localStorage.removeItem(HOST_PIN_KEY);
  }, []);

  const handleDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(HOST_DIFFICULTY_KEY, d); // survive a host refresh
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

  // Celebratory sting when the podium first appears (no-op unless music is on).
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (room?.status === "podium" && prevStatus.current !== "podium") {
      stingIfPlaying();
    }
    prevStatus.current = room?.status;
  }, [room?.status]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const newPin = await createRoom(config);
      setPin(newPin); // session-only; never persisted, so a reload starts fresh
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
      if (room.config.mode === "defuse-the-pattern") {
        const scenarioIds = pickScenarioIds(room.config.totalQuestions);
        await startDefuse(
          pin,
          scenarioIds,
          room.players.map((p) => p.id),
        );
      } else {
        const questionIds = pickQuestionIds(
          room.config.totalQuestions,
          difficulty,
        );
        await startGame(pin, questionIds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the game.");
      setStarting(false);
    }
  }, [pin, room, difficulty]);

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
            Pick a mode, difficulty &amp; round length, then put the big screen
            on the projector.
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
                    onClick={() =>
                      m.active &&
                      setConfig((c) =>
                        m.id === "defuse-the-pattern"
                          ? { ...c, mode: m.id, ...DEFUSE_DEFAULTS }
                          : m.id === "quiz"
                            ? { ...c, mode: m.id, totalQuestions: DEFAULT_CONFIG.totalQuestions, secondsPerQuestion: DEFAULT_CONFIG.secondsPerQuestion }
                            : { ...c, mode: m.id },
                      )
                    }
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

          {/* Round options — differ by mode */}
          {config.mode === "defuse-the-pattern" ? (
            <div className="mt-8 flex flex-col gap-7">
              <div>
                <Segmented
                  label="Pace"
                  name="pace"
                  options={DEFUSE_PACES}
                  value={config.secondsPerQuestion}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, secondsPerQuestion: v }))
                  }
                  renderOption={(s) => DEFUSE_PACE_LABELS[s]}
                />
                <p className="mt-2 text-sm text-psc-gray-2">
                  How long the pod gets to talk it out and lock in each answer.
                </p>
              </div>
              <div>
                <Segmented
                  label="Number of scenarios"
                  name="scenarios"
                  options={SCENARIO_COUNTS}
                  value={config.totalQuestions}
                  onChange={(v) => setConfig((c) => ({ ...c, totalQuestions: v }))}
                />
                <p className="mt-2 text-sm text-psc-gray-2">
                  Always opens with an easy gimme so the pod learns the loop.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-7">
              <div>
                <Segmented
                  label="Difficulty"
                  name="difficulty"
                  options={DIFFICULTIES}
                  value={difficulty}
                  onChange={handleDifficulty}
                  renderOption={(d) => DIFFICULTY_LABELS[d]}
                />
                <p className="mt-2 text-sm text-psc-gray-2">
                  {DIFFICULTY_HINTS[difficulty]}
                </p>
              </div>
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
          )}

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

  const isDefuse = room.config.mode === "defuse-the-pattern";

  // ===== C. Live game — Defuse the Pattern (situation → resolve → summary)
  if (
    isDefuse &&
    (room.status === "question" ||
      room.status === "reveal" ||
      room.status === "podium") &&
    room.questionIds.length > 0
  ) {
    return <HostDefuse pin={pin} room={room} onExit={handleNewRoom} />;
  }

  // ===== C. Live quiz — question + reveal loop ==========================
  // Require questionIds so a stale/half-written room can't dead-end the host;
  // without them it falls back to the lobby, where "Start" re-seeds the round.
  if (
    (room.status === "question" || room.status === "reveal") &&
    room.questionIds.length > 0
  ) {
    return <HostQuiz pin={pin} room={room} />;
  }

  // ===== D. Podium — the winner moment ==================================
  if (room.status === "podium") {
    return (
      <main className="stage flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
        <Podium players={room.players} pin={pin ?? undefined} />
        <Button onClick={handleNewRoom} variant="gold" size="lg">
          New game →
        </Button>
      </main>
    );
  }

  // ===== B. Waiting room — the projected stage =========================
  const canStart = room.players.length > 0;
  return (
    <main className="stage flex flex-1 flex-col px-6 py-6 sm:px-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Wordmark tone="light" size="sm" />
        <p className="text-right text-sm font-semibold text-white/60 sm:text-base">
          Join at <span className="font-bold text-white">{joinHost}/play</span>
        </p>
      </div>

      {/* Compact PIN + QR band */}
      <div className="mt-5 flex items-center justify-center gap-8 sm:gap-14">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-psc-gold">
            Game PIN
          </p>
          <div className="flex gap-2 sm:gap-2.5">
            {pin.split("").map((digit, i) => (
              <span
                key={i}
                className="flex size-12 items-center justify-center rounded-xl bg-white font-mono text-2xl font-black text-psc-black shadow-[0_5px_0_rgba(0,0,0,0.35)] sm:size-16 sm:text-4xl"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-psc-gold">
            Scan to join
          </p>
          <div className="rounded-2xl bg-white p-2.5 shadow-[0_5px_0_rgba(0,0,0,0.35)]">
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={120}
                level="M"
                marginSize={0}
                aria-label={`QR code to join room ${pin}`}
              />
            ) : (
              <div className="size-[120px]" />
            )}
          </div>
        </div>
      </div>

      {/* Player critters — big, scattered, filling the screen as they join */}
      <CritterScatter players={room.players} pin={pin ?? undefined} />

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
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
