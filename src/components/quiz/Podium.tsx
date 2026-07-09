"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/character/Avatar";
import { assignVariants, characterFor } from "@/lib/character";
import { rankPlayers, type Player } from "@/lib/room";
import { useRoomEmotes } from "@/lib/useRoomEmotes";
import { Confetti } from "./Confetti";

const STEP = [
  { place: 1, medal: "🥇", height: "h-44 sm:h-56", bg: "bg-psc-gold", delay: 0.5 },
  { place: 2, medal: "🥈", height: "h-32 sm:h-40", bg: "bg-psc-gray-1", delay: 0.25 },
  { place: 3, medal: "🥉", height: "h-24 sm:h-28", bg: "bg-[#cd7f32]", delay: 0.1 },
];

function Step({
  player,
  variant,
  emote,
  place,
  medal,
  height,
  bg,
  delay,
  highlight,
}: {
  player: Player;
  variant: number;
  emote?: string | null;
  place: number;
  medal: string;
  height: string;
  bg: string;
  delay: number;
  highlight: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 320, damping: 22 }}
      className={`flex flex-col items-center ${
        place === 1 ? "w-40 sm:w-56" : "w-32 sm:w-44"
      }`}
    >
      {place === 1 && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.3, type: "spring", stiffness: 400 }}
          className="text-4xl sm:text-6xl"
          aria-hidden
        >
          👑
        </motion.span>
      )}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: delay + 0.18,
          type: "spring",
          stiffness: place === 1 ? 360 : 300,
          damping: place === 1 ? 11 : 16,
        }}
      >
        <Avatar
          character={characterFor(player)}
          variant={variant}
          size={place === 1 ? 208 : 128}
          emote={emote}
          celebrating={!emote}
        />
      </motion.div>
      <span
        className={place === 1 ? "-mt-1 text-3xl sm:text-5xl" : "-mt-1 text-xl sm:text-3xl"}
        aria-hidden
      >
        {medal}
      </span>
      <span
        className={`mt-0.5 max-w-full truncate font-display font-extrabold ${
          place === 1 ? "text-xl sm:text-3xl" : "text-base sm:text-2xl"
        } ${highlight ? "text-psc-red" : "text-white"}`}
      >
        {player.name}
      </span>
      <span className="font-mono text-sm font-black tabular-nums text-psc-gold sm:text-xl">
        {player.score.toLocaleString()}
      </span>
      <div
        className={`mt-3 flex w-full items-start justify-center rounded-t-2xl pt-3 ${height} ${bg}`}
      >
        <span className="font-display text-3xl font-black text-psc-black sm:text-5xl">
          {place}
        </span>
      </div>
    </motion.div>
  );
}

export function Podium({
  players,
  highlightId,
  pin,
}: {
  players: Player[];
  highlightId?: string;
  pin?: string;
}) {
  const ranked = rankPlayers(players);
  const winner = ranked[0];
  const byPlace = new Map(ranked.slice(0, 3).map((p, i) => [i + 1, p]));
  const variants = assignVariants(players);
  const emotes = useRoomEmotes(pin ?? null);

  return (
    <div className="relative flex w-full flex-col items-center">
      <Confetti />
      {winner && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <p className="text-base font-bold uppercase tracking-[0.32em] text-psc-gold sm:text-lg">
            🏆 Winner
          </p>
          <motion.h1
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 12 }}
            className="mt-1 font-display text-6xl font-black leading-none text-white drop-shadow-[0_4px_24px_rgba(245,168,0,0.35)] sm:text-8xl"
          >
            {winner.name}
          </motion.h1>
        </motion.div>
      )}

      {/* Pedestals: 2nd · 1st · 3rd */}
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {[2, 1, 3].map((place) => {
          const player = byPlace.get(place);
          if (!player) return null;
          const step = STEP.find((s) => s.place === place)!;
          return (
            <Step
              key={place}
              player={player}
              variant={variants[player.id] ?? 0}
              emote={emotes[player.id]}
              place={step.place}
              medal={step.medal}
              height={step.height}
              bg={step.bg}
              delay={step.delay}
              highlight={player.id === highlightId}
            />
          );
        })}
      </div>
    </div>
  );
}
