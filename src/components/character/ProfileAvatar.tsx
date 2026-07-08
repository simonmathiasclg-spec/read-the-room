import {
  ACCESSORY_PARTS,
  profileSrc,
  tintFilter,
  type Character,
} from "@/lib/character";

/**
 * Renders a PI Reference Profile icon with an optional duplicate tint and goofy
 * emoji accessories on top. Sized by the numeric `size` (px); accessories scale
 * with it. `tint` (0 = original) recolors the icon so same-profile players stay
 * distinct.
 */
export function ProfileAvatar({
  character,
  tint = 0,
  size = 48,
  ring = true,
  anim,
  className,
}: {
  character: Character;
  tint?: number;
  size?: number;
  ring?: boolean;
  /** Optional gentle CSS motion (auto-disabled under prefers-reduced-motion). */
  anim?: "idle" | "wiggle";
  className?: string;
}) {
  const parts = ACCESSORY_PARTS[character.accessory] ?? [];
  const animClass =
    anim === "idle" ? "critter-idle" : anim === "wiggle" ? "critter-wiggle" : "";

  return (
    <div
      className={[animClass, className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        width: size,
        height: size,
        ...(ring
          ? { filter: "drop-shadow(0 2px 4px rgba(17,17,17,0.22))" }
          : {}),
      }}
      role="img"
      aria-label={`${character.profile} profile`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static decorative icon; next/image adds no value here */}
      <img
        src={profileSrc(character.profile)}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: tintFilter(tint),
          userSelect: "none",
        }}
      />
      {parts.map((pt, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            fontSize: size * pt.s,
            lineHeight: 1,
            transform: `translate(-50%, -50%)${pt.flip ? " scaleX(-1)" : ""}`,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {pt.e}
        </span>
      ))}
    </div>
  );
}
