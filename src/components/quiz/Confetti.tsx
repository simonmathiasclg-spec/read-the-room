"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const COLORS = [
  "var(--psc-red)",
  "var(--psc-gold)",
  "var(--tile-c)",
  "var(--tile-d)",
  "#8b3fe0",
  "#ec4899",
];

/** Pure, deterministic pseudo-random in [0,1) from an index + salt (so the
 *  burst varies per piece without an impure Math.random during render). */
function rand(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A one-shot confetti burst overlay. Renders nothing under reduced motion. */
export function Confetti({ count = 46 }: { count?: number }) {
  const reduce = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const dir = rand(i, 1) * 2 - 1; // -1 (left) … 1 (right)
        return {
          color: COLORS[i % COLORS.length],
          w: 6 + rand(i, 2) * 7,
          h: 9 + rand(i, 3) * 7,
          x: dir * (120 + rand(i, 4) * 460),
          up: 80 + rand(i, 5) * 170,
          fall: 360 + rand(i, 6) * 360,
          rot: (rand(i, 7) * 2 - 1) * 540,
          dur: 1.8 + rand(i, 8) * 1.4,
          delay: rand(i, 9) * 0.3,
          round: rand(i, 10) < 0.4,
        };
      }),
    [count],
  );

  if (reduce) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[26%]"
          style={{
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: [0, p.x * 0.55, p.x],
            y: [0, -p.up, p.fall],
            rotate: [0, p.rot * 0.5, p.rot],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            ease: "easeOut",
            times: [0, 0.35, 1],
          }}
        />
      ))}
    </div>
  );
}
