"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/character/Avatar";
import { Confetti } from "@/components/quiz/Confetti";
import { Countdown } from "@/components/quiz/Countdown";
import { Button } from "@/components/ui/Button";
import { assignVariants, characterFor } from "@/lib/character";
import {
  countDefused,
  endDefuse,
  nextScenario,
  revealDefuse,
  scenarioById,
  subscribeLockin,
  subscribeLockins,
  subscribeRoles,
  type Lockin,
  type RoleMap,
} from "@/lib/defuse";
import type { Room } from "@/lib/room";

/**
 * Big-screen ("host") view for Defuse the Pattern. Shows ONLY the situation +
 * timer + the pod's critters — never the clues or options, which live on phones.
 * Resolves the pod's single lock-in against the bundled bank (no scoring).
 */
export function HostDefuse({
  pin,
  room,
  onExit,
}: {
  pin: string;
  room: Room;
  onExit: () => void;
}) {
  const { status, questionIndex, players, config } = room;
  const total = room.questionIds.length || config.totalQuestions;
  const scenarioId = room.questionIds[questionIndex] ?? "";
  const scenario = scenarioById(scenarioId);

  const [remaining, setRemaining] = useState(config.secondsPerQuestion);
  const [lockin, setLockin] = useState<Lockin | null>(null);
  const [roles, setRoles] = useState<RoleMap>({});
  const [allLockins, setAllLockins] = useState<Record<string, Lockin>>({});
  const [advancing, setAdvancing] = useState(false);
  // Guard so a scenario is only revealed once (timer + lock-in race).
  const revealedFor = useRef<number | null>(null);

  const reveal = useCallback(() => {
    if (status !== "question") return;
    if (revealedFor.current === questionIndex) return;
    revealedFor.current = questionIndex;
    void revealDefuse(pin);
  }, [pin, status, questionIndex]);
  // Always-latest reveal, so the per-scenario subscription can trigger it
  // without re-subscribing (and without capturing a stale closure).
  const revealRef = useRef(reveal);
  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);

  // Current scenario's lock-in + role map (the latter only for the Lead crown).
  // Reset both on scenario change so a previous scenario's lock-in can't linger
  // and spuriously resolve the next one. The lock-in itself drives the reveal,
  // from inside this callback, so it only ever fires for the current scenario.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale per-scenario state on change
    setLockin(null);
    setRoles({});
    const off1 = subscribeLockin(pin, questionIndex, (lk) => {
      setLockin(lk);
      if (lk) revealRef.current();
    });
    const off2 = subscribeRoles(pin, questionIndex, setRoles);
    return () => {
      off1();
      off2();
    };
  }, [pin, questionIndex]);

  // Whole-session lock-ins for the closing summary.
  useEffect(() => subscribeLockins(pin, setAllLockins), [pin]);

  // Host-authoritative countdown; out of time resolves the scenario too.
  useEffect(() => {
    if (status !== "question") return;
    const secs = config.secondsPerQuestion;
    const startedAt = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the visible timer when a scenario opens
    setRemaining(secs);
    const id = setInterval(() => {
      const left = Math.max(0, secs - (Date.now() - startedAt) / 1000);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        reveal();
      }
    }, 100);
    return () => clearInterval(id);
  }, [status, questionIndex, config.secondsPerQuestion, reveal]);

  const leadId = useMemo(
    () => Object.entries(roles).find(([, r]) => r?.lead)?.[0],
    [roles],
  );

  const isLast = questionIndex >= total - 1;
  const chosen =
    lockin && scenario ? scenario.options[lockin.option] : undefined;
  const defused = !!chosen?.correct;

  const handleNext = useCallback(async () => {
    setAdvancing(true);
    try {
      if (isLast) {
        await endDefuse(pin);
      } else {
        const nextIdx = questionIndex + 1;
        await nextScenario(
          pin,
          nextIdx,
          room.questionIds[nextIdx],
          players.map((p) => p.id),
        );
      }
    } finally {
      setAdvancing(false);
    }
  }, [pin, isLast, questionIndex, room.questionIds, players]);

  // ===== Session summary =================================================
  if (status === "podium") {
    const defusedCount = countDefused(room.questionIds, allLockins);
    const all = defusedCount === total && total > 0;
    return (
      <main className="stage relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        {defusedCount > 0 && <Confetti count={all ? 70 : 40} />}
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-psc-gold">
          Defuse the Pattern · Session complete
        </p>
        <h1 className="font-display text-6xl font-black leading-[0.95] sm:text-7xl">
          Your pod defused
          <br />
          <span className="text-psc-gold">
            {defusedCount} of {total}
          </span>
        </h1>
        <p className="max-w-xl text-xl text-white/70">
          {all
            ? "A clean sweep — you read every pattern right. 🎉"
            : "Every pattern you talked through is a drive you'll spot for real."}
        </p>
        <PodRow players={players} />
        <Button onClick={onExit} variant="gold" size="lg">
          New game →
        </Button>
      </main>
    );
  }

  if (!scenario) {
    return (
      <main className="stage flex flex-1 items-center justify-center">
        <p className="text-white/60">Loading scenario…</p>
      </main>
    );
  }

  // ===== Resolution =====================================================
  if (status === "reveal") {
    return (
      <main className="stage relative flex flex-1 flex-col px-6 py-8 sm:px-12">
        {defused && <Confetti count={54} />}
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white/80">
            Scenario {questionIndex + 1} / {total}
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-psc-gold">
            {scenario.setting}
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 py-4 text-center">
          <span className="text-6xl" aria-hidden>
            {defused ? "🎉" : "🫧"}
          </span>
          <h1 className="font-display text-5xl font-black sm:text-6xl">
            {defused ? (
              <span className="text-tile-c">Defused!</span>
            ) : (
              <span className="text-psc-gold">Didn&apos;t land</span>
            )}
          </h1>

          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              {lockin ? "Your pod chose" : "Out of time — no answer locked in"}
            </p>
            {lockin && (
              <p className="mt-1.5 font-display text-xl font-extrabold text-white sm:text-2xl">
                “{scenario.options[lockin.option]?.text}”
              </p>
            )}
          </div>

          <p className="max-w-2xl text-lg text-white/85 sm:text-xl">
            💡 {defused ? scenario.whyCorrect : scenario.whyWrongCommon}
          </p>

          {scenario.facilitatorPrompt && (
            <p className="max-w-2xl rounded-2xl border border-psc-gold/30 bg-psc-gold/10 px-5 py-3 text-base text-psc-gold sm:text-lg">
              🗣 Ask the group: {scenario.facilitatorPrompt}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleNext} loading={advancing} variant="gold" size="lg">
            {isLast ? "See your results →" : "Next scenario →"}
          </Button>
        </div>
      </main>
    );
  }

  // ===== Live scenario (question) =======================================
  return (
    <main className="stage flex flex-1 flex-col px-6 py-6 sm:px-12">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white/80">
          Scenario {questionIndex + 1} / {total}
        </span>
        <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-psc-gold sm:inline">
          {scenario.setting}
        </span>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${
            lockin
              ? "bg-tile-c/25 text-white"
              : "bg-white/10 text-white/80"
          }`}
        >
          {lockin ? "● Locked in" : "Not locked in"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 py-5 text-center">
        <Countdown remaining={remaining} total={config.secondsPerQuestion} />
        <h1 className="max-w-4xl font-display text-3xl font-black leading-tight sm:text-5xl">
          {scenario.situation}
        </h1>
        <p className="max-w-2xl text-base font-semibold text-white/55 sm:text-lg">
          Each phone holds a clue or a response — nobody can see it all. Talk it
          out and lock in one answer together.
        </p>
      </div>

      <PodRow players={players} leadId={leadId} />
    </main>
  );
}

/** A compact row of the pod's critters, optionally crowning the Lead. */
function PodRow({
  players,
  leadId,
}: {
  players: Room["players"];
  leadId?: string;
}) {
  if (players.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-white/50">Waiting for the pod…</p>
      </div>
    );
  }
  const variants = assignVariants(players);
  return (
    <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-x-6 gap-y-3 py-2 sm:gap-x-10">
      {players.map((p) => {
        const isLead = p.id === leadId;
        return (
          <div key={p.id} className="flex flex-col items-center gap-1.5">
            <div className="relative">
              {isLead && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl"
                  aria-hidden
                >
                  👑
                </span>
              )}
              <Avatar
                character={characterFor(p)}
                variant={variants[p.id] ?? 0}
                anim="idle"
                size={110}
              />
            </div>
            <span
              className={`max-w-[7rem] truncate rounded-full px-3 py-0.5 text-sm font-extrabold sm:text-base ${
                isLead ? "bg-psc-gold text-psc-black" : "bg-white/10 text-white"
              }`}
            >
              {p.name}
              {isLead ? " · Lead" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
