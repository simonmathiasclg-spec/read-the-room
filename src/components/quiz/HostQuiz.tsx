"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  correctOptionIndex,
  optionCountFor,
  optionOrder,
  questionById,
} from "@/lib/questions";
import {
  endGame,
  nextQuestion,
  scoreAndReveal,
  subscribeAnswerCount,
  subscribeResults,
  type QuestionResult,
  type Room,
} from "@/lib/room";
import { Countdown } from "./Countdown";
import { Leaderboard } from "./Leaderboard";
import { PatternGraph } from "./PatternGraph";
import { Glyph, TILES } from "./tiles";

export function HostQuiz({ pin, room }: { pin: string; room: Room }) {
  const { status, questionIndex, config, players } = room;
  const total = room.questionIds.length || config.totalQuestions;
  const qId = room.questionIds[questionIndex] ?? "";
  const question = questionById(qId);

  // Per-question shuffle of the answer tiles (display only). `order[tile]` is
  // the original option index shown on that tile; `correctPos` is the tile the
  // correct answer landed on — which is what the player's tap is scored against.
  // TF is a 2-way (TRUE/FALSE), everything else a 4-way; both use the same seed
  // so host + phone always agree.
  const { order, correctPos } = useMemo(() => {
    const ord = optionOrder(
      `${qId}:${pin}`,
      question ? optionCountFor(question) : 4,
    );
    return {
      order: ord,
      correctPos: question ? ord.indexOf(correctOptionIndex(question)) : 0,
    };
  }, [qId, pin, question]);

  const [remaining, setRemaining] = useState(config.secondsPerQuestion);
  // Tie the answered count to its question so a stale count from the previous
  // question can't instantly auto-reveal the next one.
  const [answered, setAnswered] = useState<{ qi: number; n: number }>({
    qi: -1,
    n: 0,
  });
  const [advancing, setAdvancing] = useState(false);
  const answeredNow = answered.qi === questionIndex ? answered.n : 0;
  // Reveal is two beats: the answer, then the standings.
  const [revealStep, setRevealStep] = useState<"answer" | "scores">("answer");
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  // Guard so a question is only revealed/scored once (timer + all-answered race).
  const revealedFor = useRef<number | null>(null);

  const reveal = useCallback(() => {
    if (status !== "question" || !question) return;
    if (revealedFor.current === questionIndex) return;
    revealedFor.current = questionIndex;
    void scoreAndReveal(
      pin,
      questionIndex,
      correctPos,
      config.secondsPerQuestion,
    );
  }, [pin, status, questionIndex, question, correctPos, config.secondsPerQuestion]);

  // Live answer count (during the question), tagged with its question index.
  useEffect(() => {
    if (status !== "question") return;
    return subscribeAnswerCount(pin, questionIndex, (n) =>
      setAnswered({ qi: questionIndex, n }),
    );
  }, [pin, status, questionIndex]);

  // This round's scored results (for the leaderboard deltas).
  useEffect(() => {
    if (status !== "reveal") return;
    return subscribeResults(pin, questionIndex, setResults);
  }, [pin, status, questionIndex]);

  // Per-question countdown. Host-authoritative, driven by local time.
  useEffect(() => {
    if (status !== "question") return;
    const secs = config.secondsPerQuestion;
    const startedAt = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the visible timer when a new question opens
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

  // Everyone answered *this* question → reveal early.
  useEffect(() => {
    if (status === "question" && players.length > 0 && answeredNow >= players.length) {
      reveal();
    }
  }, [status, answeredNow, players.length, reveal]);

  const deltas = useMemo(() => {
    const d: Record<string, number> = {};
    for (const [id, r] of Object.entries(results)) d[id] = r.points;
    return d;
  }, [results]);

  const isReveal = status === "reveal";
  const isLast = questionIndex >= total - 1;

  const handleNext = useCallback(async () => {
    setAdvancing(true);
    try {
      if (isLast) await endGame(pin);
      else await nextQuestion(pin, questionIndex + 1);
      setRevealStep("answer");
    } finally {
      setAdvancing(false);
    }
  }, [pin, isLast, questionIndex]);

  if (!question) {
    return (
      <main className="stage flex flex-1 items-center justify-center">
        <p className="text-white/60">Loading question…</p>
      </main>
    );
  }

  // ----- Standings beat -------------------------------------------------
  if (isReveal && revealStep === "scores") {
    return (
      <main className="stage flex flex-1 flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white/80">
            Question {questionIndex + 1} / {total}
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-psc-gold">
            Standings
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-6">
          <h1 className="mb-6 text-center font-display text-4xl font-black sm:text-5xl">
            Leaderboard
          </h1>
          <Leaderboard players={players} deltas={deltas} reshuffle max={5} />
        </div>

        <div className="flex justify-center">
          <Button onClick={handleNext} loading={advancing} variant="gold" size="lg">
            {isLast ? "Finish round →" : "Next question →"}
          </Button>
        </div>
      </main>
    );
  }

  // ----- Question / answer-reveal beat ----------------------------------
  return (
    <main className="stage flex flex-1 flex-col px-6 py-6 sm:px-10">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white/80">
          Question {questionIndex + 1} / {total}
        </span>
        <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-psc-gold sm:inline">
          {question.tier} · {question.topic}
        </span>
        <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold tabular-nums text-white/80">
          {answeredNow} / {players.length} answered
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 py-5 text-center sm:gap-6 sm:py-6">
        {status === "question" ? (
          <Countdown remaining={remaining} total={config.secondsPerQuestion} />
        ) : (
          <span className="rounded-full bg-psc-gold px-5 py-2 font-display text-lg font-extrabold text-psc-black">
            Answer revealed
          </span>
        )}
        <h1 className="max-w-4xl font-display text-3xl font-black leading-tight sm:text-5xl">
          {question.q}
        </h1>
        {question.type === "graph" && <PatternGraph pattern={question.pattern} />}
      </div>

      {question.type === "tf" ? (
        // True/False — two big tiles. Colors follow the label (TRUE green /
        // FALSE red); only their side shuffles per question.
        <div className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {order.map((optIdx, i) => {
            const isTrue = optIdx === 0;
            const correct = isReveal && i === correctPos;
            const dimmed = isReveal && i !== correctPos;
            return (
              <div
                key={optIdx}
                style={{ backgroundColor: isTrue ? "var(--tile-c)" : "var(--tile-a)" }}
                className={[
                  "flex items-center justify-center gap-4 rounded-3xl px-6 py-10 text-white transition-all duration-300 sm:py-16",
                  dimmed ? "opacity-30 grayscale" : "",
                  correct
                    ? "shadow-[0_0_0_5px_#fff,0_10px_0_rgba(0,0,0,0.3)] scale-[1.02]"
                    : "shadow-[0_8px_0_rgba(0,0,0,0.25)]",
                ].join(" ")}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-9 sm:size-14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {isTrue ? <path d="M5 13l4 4L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
                </svg>
                <span className="font-display text-4xl font-black sm:text-6xl">
                  {isTrue ? "TRUE" : "FALSE"}
                </span>
                {correct && (
                  <span className="ml-1 text-3xl font-black sm:text-5xl" aria-label="correct">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {order.map((optIdx, i) => {
            const tile = TILES[i];
            const opt = question.options[optIdx];
            const correct = isReveal && i === correctPos;
            const dimmed = isReveal && i !== correctPos;
            return (
              <div
                key={tile.label}
                style={{ backgroundColor: tile.bg }}
                className={[
                  "flex items-center gap-4 rounded-3xl px-6 py-5 transition-all duration-300 sm:gap-5 sm:px-8 sm:py-7",
                  dimmed ? "opacity-30 grayscale" : "",
                  correct
                    ? "shadow-[0_0_0_5px_#fff,0_10px_0_rgba(0,0,0,0.3)] scale-[1.02]"
                    : "shadow-[0_8px_0_rgba(0,0,0,0.25)]",
                ].join(" ")}
              >
                <Glyph
                  kind={tile.kind}
                  fill={tile.ink}
                  className="size-9 shrink-0 sm:size-12"
                />
                <span
                  style={{ color: tile.ink }}
                  className="font-display text-xl font-extrabold sm:text-3xl"
                >
                  {opt}
                </span>
                {correct && (
                  <span
                    style={{ color: tile.ink }}
                    className="ml-auto text-2xl font-black sm:text-4xl"
                    aria-label="correct"
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isReveal && (
        <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-white/85 sm:text-xl">
            💡 {question.teach}
          </p>
          <Button
            onClick={() => setRevealStep("scores")}
            variant="gold"
            size="lg"
          >
            Show standings →
          </Button>
        </div>
      )}
    </main>
  );
}
