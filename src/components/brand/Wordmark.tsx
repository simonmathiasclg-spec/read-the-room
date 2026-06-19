/**
 * "Read the Room" wordmark lockup.
 * tone="dark" for light backgrounds, tone="light" for the dark host stage.
 */
export function Wordmark({
  className,
  tone = "dark",
  size = "md",
}: {
  className?: string;
  tone?: "dark" | "light";
  size?: "sm" | "md";
}) {
  const ink = tone === "light" ? "text-white" : "text-psc-black";
  const scale = size === "sm" ? "text-lg" : "text-2xl";
  return (
    <span
      className={[
        "inline-flex items-center gap-2 font-display font-extrabold tracking-tight",
        scale,
        ink,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden
        className="inline-block size-2.5 rotate-45 rounded-[3px] bg-psc-gold"
      />
      <span>
        Read the <span className="text-psc-red">Room</span>
      </span>
    </span>
  );
}
