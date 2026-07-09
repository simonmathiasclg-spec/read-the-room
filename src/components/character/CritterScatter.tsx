"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar } from "@/components/character/Avatar";
import { assignVariants, characterFor } from "@/lib/character";
import type { Player } from "@/lib/room";
import { useRoomEmotes } from "@/lib/useRoomEmotes";

/** Small stable per-player tilt so the grid feels lively, not rigid. */
function tilt(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % 1000) / 1000) * 2 * 3.5 - 3.5; // ±3.5°
}

/**
 * Responsive grid layout: columns + character size scale to the head-count so
 * everyone fits on the host stage at once without overlapping — big for a few
 * players, smaller (but still clearly named) for a crowd. Past a cap the size
 * holds and the grid scrolls as a safety net.
 */
function layoutFor(n: number): { size: number; cols: number } {
  if (n <= 2) return { size: 248, cols: n || 1 };
  if (n <= 4) return { size: 236, cols: n };
  if (n <= 8) return { size: 188, cols: 4 };
  if (n <= 12) return { size: 156, cols: 6 };
  if (n <= 16) return { size: 128, cols: 8 }; // ≤2 rows on a wide stage
  if (n <= 30) return { size: 108, cols: 8 };
  return { size: 92, cols: 10 }; // cap; container scrolls beyond this
}

/**
 * Grid of player characters that fills the host stage and grows live as players
 * join / customize. Each character idles gently and pops in.
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

  const { size, cols } = layoutFor(ordered.length);
  const gap = Math.max(12, Math.round(size * 0.1));
  const nameSize = size >= 190 ? "text-xl" : size >= 132 ? "text-lg" : "text-sm";

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto py-2">
      <div
        className="grid w-full justify-center justify-items-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, ${size}px))`,
          gap,
        }}
      >
        <AnimatePresence mode="popLayout">
          {ordered.map((p) => {
            const me = p.id === highlightId;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="flex flex-col items-center gap-1"
                style={{ width: size }}
              >
                <div style={{ transform: `rotate(${tilt(p.id)}deg)` }}>
                  <Avatar
                    character={characterFor(p)}
                    variant={variants[p.id] ?? 0}
                    emote={emotes[p.id]}
                    anim="idle"
                    size={size}
                  />
                </div>
                <span
                  className={`max-w-full truncate rounded-full px-3 py-0.5 font-extrabold ${nameSize} ${
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
    </div>
  );
}
