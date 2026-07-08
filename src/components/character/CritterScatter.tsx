"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ProfileAvatar } from "@/components/character/ProfileAvatar";
import { assignTints, characterFor } from "@/lib/character";
import type { Player } from "@/lib/room";

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
}: {
  players: Player[];
  highlightId?: string;
}) {
  const ordered = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  const tints = assignTints(players);

  if (ordered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="rounded-2xl border border-dashed border-white/15 px-8 py-10 text-center text-lg font-medium text-white/55">
          Waiting for players to join…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-x-6 gap-y-4 py-2 sm:gap-x-12">
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
                <ProfileAvatar
                  character={characterFor(p)}
                  tint={tints[p.id] ?? 0}
                  anim="idle"
                  size={150}
                />
              </div>
              <span
                className={`max-w-[7.5rem] truncate rounded-full px-3 py-1 text-base font-extrabold sm:text-lg ${
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
