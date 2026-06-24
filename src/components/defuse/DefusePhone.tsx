"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  countDefused,
  lockIn,
  scenarioById,
  subscribeLockin,
  subscribeLockins,
  subscribeRole,
  type DefuseRole,
  type Lockin,
} from "@/lib/defuse";
import type { Room } from "@/lib/room";

/**
 * Phone view for Defuse the Pattern. Shows ONLY this player's piece of the
 * scenario — the clue(s) they must describe and/or the option(s) they hold —
 * and never which option is correct. An option-holder can lock in the pod's
 * single agreed answer (with a confirm step so it isn't a stray tap).
 */
export function DefusePhone({
  pin,
  room,
  playerId,
  onLeave,
}: {
  pin: string;
  room: Room;
  playerId: string;
  onLeave: () => void;
}) {
  const { status, questionIndex } = room;
  const total = room.questionIds.length || room.config.totalQuestions;
  const scenarioId = room.questionIds[questionIndex] ?? "";
  const scenario = scenarioById(scenarioId);

  const [role, setRole] = useState<DefuseRole | null>(null);
  const [lockin, setLockin] = useState<Lockin | null>(null);
  const [allLockins, setAllLockins] = useState<Record<string, Lockin>>({});
  const [confirming, setConfirming] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // A new scenario opens → drop the previous scenario's card, lock-in and
    // half-tapped confirm before re-subscribing, so nothing stale flashes.
    /* eslint-disable react-hooks/set-state-in-effect -- reset per-scenario state on change */
    setConfirming(null);
    setRole(null);
    setLockin(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    const off1 = subscribeRole(pin, questionIndex, playerId, setRole);
    const off2 = subscribeLockin(pin, questionIndex, setLockin);
    return () => {
      off1();
      off2();
    };
  }, [pin, questionIndex, playerId]);

  useEffect(() => subscribeLockins(pin, setAllLockins), [pin]);

  const handleLock = useCallback(
    async (optionIndex: number) => {
      setSubmitting(true);
      try {
        await lockIn(pin, questionIndex, playerId, optionIndex);
      } finally {
        setSubmitting(false);
        setConfirming(null);
      }
    },
    [pin, questionIndex, playerId],
  );

  // ===== Session summary ================================================
  if (status === "podium") {
    const defusedCount = countDefused(room.questionIds, allLockins);
    const all = defusedCount === total && total > 0;
    return (
      <main
        className="wash flex flex-1 flex-col items-center justify-center px-6 text-center"
        style={{ animation: "var(--animate-rise)" }}
      >
        <span className="text-7xl" aria-hidden>
          {all ? "🏆" : "🤝"}
        </span>
        <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">
          Your pod defused
        </h1>
        <p className="mt-1 font-display text-6xl font-black text-psc-red">
          {defusedCount} of {total}
        </p>
        <p className="mt-3 max-w-xs text-lg text-psc-gray-2">
          {all ? "A clean sweep — nice teamwork!" : "Great reading together."}
        </p>
        <Button onClick={onLeave} variant="ghost" size="sm" className="mt-8">
          Leave
        </Button>
      </main>
    );
  }

  // ===== Resolution mirror ==============================================
  if (status === "reveal") {
    const chosen =
      lockin && scenario ? scenario.options[lockin.option] : undefined;
    const defused = !!chosen?.correct;
    return (
      <main
        className={`flex flex-1 flex-col items-center justify-center px-6 text-center text-white ${
          defused ? "bg-tile-c" : "bg-psc-gold text-psc-black"
        }`}
        style={{ animation: "var(--animate-pop)" }}
      >
        <span className="text-7xl" aria-hidden>
          {defused ? "🎉" : "🫧"}
        </span>
        <h1 className="mt-3 font-display text-5xl font-black sm:text-6xl">
          {defused ? "Defused!" : "Didn't land"}
        </h1>
        <p
          className={`mt-3 max-w-sm text-lg font-semibold ${
            defused ? "text-white/85" : "text-psc-black/75"
          }`}
        >
          Look up at the big screen 👀
        </p>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="flex flex-1 items-center justify-center bg-psc-ink">
        <p className="text-white/60">Loading your card…</p>
      </main>
    );
  }

  // ===== Locked in — hold for the resolution ============================
  if (lockin) {
    return (
      <main
        className="flex flex-1 flex-col items-center justify-center gap-4 bg-psc-ink px-6 text-center text-white"
        style={{ animation: "var(--animate-pop)" }}
      >
        <span className="text-6xl" aria-hidden>
          🔒
        </span>
        <h1 className="font-display text-4xl font-black sm:text-5xl">
          Locked in!
        </h1>
        <p className="text-lg text-white/70">
          Your pod committed an answer. Look up at the big screen 👀
        </p>
      </main>
    );
  }

  // ===== Live scenario — this phone's piece =============================
  const clues = role?.clues ?? [];
  const options = role?.options ?? [];
  const isLead = !!role?.lead;
  const isFloater = clues.length === 0 && options.length === 0;

  return (
    <main className="wash flex flex-1 flex-col px-5 py-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-psc-gray-2">
          <span>
            Scenario {questionIndex + 1} / {total}
          </span>
          <span className="text-psc-gray-1">👀 Situation on the big screen</span>
        </div>

        {isLead && (
          <div className="mt-3 rounded-2xl bg-psc-gold px-4 py-3 text-psc-black shadow-[0_3px_0_var(--psc-gold-deep)]">
            <p className="font-display text-base font-black">👑 You&apos;re the Lead</p>
            <p className="text-sm font-semibold text-psc-black/80">
              Get everyone to share what they have, then call the vote.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-1 flex-col gap-3">
          {clues.map((ci) => {
            const clue = scenario.clues[ci];
            if (!clue) return null;
            return (
              <div
                key={`c${ci}`}
                className="rounded-3xl border-2 border-psc-red/20 bg-white p-5 shadow-[0_2px_20px_rgba(17,17,17,0.06)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-psc-red">
                  🗣 Tell your team
                </p>
                <p className="mt-2 font-display text-xl font-extrabold leading-snug text-psc-black">
                  {clue.plain}
                </p>
                <span className="mt-3 inline-block rounded-full bg-psc-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {clue.term}
                </span>
              </div>
            );
          })}

          {options.map((oi) => {
            const opt = scenario.options[oi];
            if (!opt) return null;
            const isConfirming = confirming === oi;
            return (
              <div
                key={`o${oi}`}
                className="rounded-3xl border-2 border-tile-d/30 bg-white p-5 shadow-[0_2px_20px_rgba(17,17,17,0.06)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-tile-d">
                  📣 A possible response — read it out
                </p>
                <p className="mt-2 font-display text-xl font-extrabold leading-snug text-psc-black">
                  {opt.text}
                </p>
                {isConfirming ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold text-psc-gray-2">
                      Lock this in as the whole pod&apos;s answer?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleLock(oi)}
                        loading={submitting}
                        variant="primary"
                        size="md"
                        fullWidth
                      >
                        Yes, lock it in
                      </Button>
                      <Button
                        onClick={() => setConfirming(null)}
                        variant="outline"
                        size="md"
                      >
                        Wait
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirming(oi)}
                    variant="gold"
                    size="md"
                    fullWidth
                    className="mt-4"
                    disabled={confirming !== null}
                  >
                    This is our answer →
                  </Button>
                )}
              </div>
            );
          })}

          {isFloater && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/10 bg-white/60 p-6 text-center">
              <span className="text-4xl" aria-hidden>
                🤝
              </span>
              <p className="font-display text-xl font-extrabold text-psc-black">
                You&apos;re a floater
              </p>
              <p className="text-sm text-psc-gray-2">
                Listen to everyone&apos;s clues and options, and help the pod
                decide on one answer.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={onLeave}
          variant="ghost"
          size="sm"
          className="mt-5 self-center"
        >
          Leave
        </Button>
      </div>
    </main>
  );
}
