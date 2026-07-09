"use client";

import { EMOTES } from "@/lib/character";

/** A row of emote buttons (lobby + podium). Broadcasts on tap. */
export function EmoteBar({
  onEmote,
  className,
}: {
  onEmote: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex flex-wrap items-center justify-center gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {EMOTES.map((e) => (
        <button
          key={e.key}
          type="button"
          onClick={() => onEmote(e.key)}
          aria-label={e.label}
          className="flex size-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-black/10 transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40"
        >
          <span aria-hidden>{e.emoji}</span>
        </button>
      ))}
    </div>
  );
}
