"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "@/components/character/Avatar";
import { assignVariants, characterFor } from "@/lib/character";
import type { Player } from "@/lib/room";
import { useRoomEmotes } from "@/lib/useRoomEmotes";

/** Seeded per-player jitter (stable) so the scatter feels lively, not gridded. */
function jitter(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r1 = ((h >>> 0) % 1000) / 1000;
  const r2 = ((h >>> 11) % 1000) / 1000;
  return { rot: (r1 * 2 - 1) * 8, dy: (r2 * 2 - 1) * 30 };
}

/**
 * Big, playful scatter of player critters that fills the host stage and grows
 * live as players join / customize. Each critter idles gently and pops in.
 */
export function CritterScatter({
  players,
  highlightId,
  pin,
}: {
  players: Player[];
  highlightId?: string;
  pin?: string;
}) {
  const ordered = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  const variants = assignVariants(players);
  const emotes = useRoomEmotes(pin ?? null);

  if (ordered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="rounded-2xl border border-dashed border-white/15 px-8 py-10 text-center text-lg font-medium text-white/55">
          Waiting for players to join…
        </p>
      </div>
    );
  }

  // Shrink the figures a touch as the lobby fills so a big crowd still fits,
  // but keep them large and proud for small/medium groups.
  const size = ordered.length <= 6 ? 240 : ordered.length <= 12 ? 200 : 168;

  return (
    <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-x-8 gap-y-6 py-2 sm:gap-x-12">
      <AnimatePresence mode="popLayout">
        {ordered.map((p) => {
          const me = p.id === highlightId;
          const j = jitter(p.id);
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              style={{ marginTop: j.dy }}
              className="flex flex-col items-center gap-2"
            >
              <div style={{ transform: `rotate(${j.rot}deg)` }}>
                <Avatar
                  character={characterFor(p)}
                  variant={variants[p.id] ?? 0}
                  emote={emotes[p.id]}
                  anim="idle"
                  size={size}
                />
              </div>
              <span
                className={`max-w-[9rem] truncate rounded-full px-4 py-1 text-lg font-extrabold sm:text-xl ${
                  me ? "bg-psc-red text-white" : "bg-white/10 text-white"
                }`}
              >
                {p.name}
                {me ? " · you" : ""}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
