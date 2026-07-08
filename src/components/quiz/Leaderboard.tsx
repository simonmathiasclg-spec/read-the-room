"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/character/ProfileAvatar";
import { assignTints, characterFor } from "@/lib/character";
import { rankPlayers, type Player } from "@/lib/room";

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Live standings. When `reshuffle` is set, the rows first render in the
 * *previous* order (current score minus this round's points) and then animate
 * into the new order — so the leaderboard visibly reshuffles between questions.
 */
export function Leaderboard({
  players,
  deltas,
  highlightId,
  max = 5,
  reshuffle = false,
}: {
  players: Player[];
  deltas?: Record<string, number>;
  highlightId?: string;
  max?: number;
  reshuffle?: boolean;
}) {
  const [showFinal, setShowFinal] = useState(!reshuffle);

  useEffect(() => {
    if (!reshuffle) return;
    const t = setTimeout(() => setShowFinal(true), 800);
    return () => clearTimeout(t);
  }, [reshuffle]);

  const previous = players.map((p) => ({
    ...p,
    score: p.score - (deltas?.[p.id] ?? 0),
  }));
  const ordered = rankPlayers(showFinal ? players : previous).slice(0, max);
  const tints = assignTints(players);

  return (
    <ul className="flex w-full flex-col gap-2.5">
      {ordered.map((p, i) => {
        const me = p.id === highlightId;
        const delta = deltas?.[p.id] ?? 0;
        return (
          <motion.li
            key={p.id}
            layout
            transition={{ type: "spring", stiffness: 600, damping: 42 }}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 ${
              me
                ? "bg-psc-red text-white shadow-[0_4px_0_var(--psc-red-deep)]"
                : "bg-white/[0.08] text-white"
            }`}
          >
            <span className="w-9 shrink-0 text-center text-xl font-black tabular-nums sm:text-2xl">
              {i < 3 ? MEDAL[i] : i + 1}
            </span>
            <ProfileAvatar
              character={characterFor(p)}
              tint={tints[p.id] ?? 0}
              size={40}
              className="shrink-0"
            />
            <span className="flex-1 truncate font-display text-lg font-extrabold sm:text-xl">
              {p.name}
              {me ? " · you" : ""}
            </span>
            {showFinal && delta > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 text-sm font-bold text-psc-gold"
              >
                +{delta}
              </motion.span>
            )}
            <span className="shrink-0 font-mono text-xl font-black tabular-nums sm:text-2xl">
              {p.score.toLocaleString()}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
