"use client";

/**
 * Phone True/False input. `order[position] = optionIndex` (0 = TRUE, 1 = FALSE),
 * the SAME deterministic shuffle the host uses — so which side TRUE/FALSE sits
 * on matches the big screen, and the tapped tile position scores correctly.
 * TRUE is always green and FALSE always red; only their side shuffles.
 */
export function PhoneTrueFalse({
  order,
  onPick,
  disabled = false,
}: {
  order: number[];
  onPick: (position: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid h-full w-full grid-rows-2 gap-3">
      {order.map((optIdx, position) => {
        const isTrue = optIdx === 0;
        return (
          <button
            key={optIdx}
            type="button"
            disabled={disabled}
            onClick={() => onPick(position)}
            aria-label={isTrue ? "True" : "False"}
            style={{ backgroundColor: isTrue ? "var(--tile-c)" : "var(--tile-a)" }}
            className="flex items-center justify-center gap-4 rounded-3xl text-white shadow-[0_6px_0_rgba(0,0,0,0.28)] transition-transform duration-100 active:translate-y-[4px] active:shadow-[0_2px_0_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-black/40 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-12 sm:size-16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {isTrue ? <path d="M5 13l4 4L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
            </svg>
            <span className="font-display text-5xl font-black sm:text-6xl">
              {isTrue ? "TRUE" : "FALSE"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
