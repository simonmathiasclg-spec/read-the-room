/**
 * Circular countdown for the host stage. Shows the whole seconds remaining
 * with a depleting ring; turns red in the final 5 seconds.
 */
export function Countdown({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const urgent = remaining <= 5;
  const color = urgent ? "var(--psc-red)" : "var(--psc-gold)";
  const seconds = Math.ceil(remaining);

  return (
    <div className="relative size-24 sm:size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="9"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-4xl font-black tabular-nums ${
          urgent ? "text-psc-red" : "text-white"
        }`}
        aria-label={`${seconds} seconds remaining`}
      >
        {seconds}
      </span>
    </div>
  );
}
