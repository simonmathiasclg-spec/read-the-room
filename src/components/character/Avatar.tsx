import {
  EMOTE_MAP,
  profileSrc,
  resolveBodyColor,
  type BodyColor,
  type Character,
} from "@/lib/character";
import {
  bodyProps,
  computeJoints,
  EMOTE_POSES,
  poseFor,
  type Joints,
  type Pt,
} from "@/lib/poses";

/**
 * A player's character: the official PI profile icon (INTACT) as the head, in a
 * colored ring, on a minimal line-art / stick-figure body struck a signature
 * pose. Head-ring + body share ONE color (matched via `variant` for duplicate
 * distinctness). Body type sets the proportions; outfit + hat + emote layer on.
 */
export function Avatar({
  character,
  variant = 0,
  size = 48,
  anim,
  emote,
  celebrating = false,
  className,
}: {
  character: Character;
  variant?: number;
  size?: number;
  anim?: "idle" | "wiggle";
  emote?: string | null;
  /** Hold a looping celebration (podium default) — celebrate pose, no bubble. */
  celebrating?: boolean;
  className?: string;
}) {
  const col = resolveBodyColor(character, variant);
  const b = bodyProps(character.bodyType);
  const pose =
    emote && EMOTE_POSES[emote]
      ? EMOTE_POSES[emote]
      : celebrating
        ? EMOTE_POSES.celebrate
        : poseFor(character.profile);
  const j = computeJoints(pose, b);
  const emoteData = emote ? EMOTE_MAP[emote] : null;

  const animClass = celebrating
    ? "avatar-celebrate"
    : anim === "idle"
      ? "critter-idle"
      : anim === "wiggle"
        ? "critter-wiggle"
        : "";

  const line = {
    fill: "none",
    stroke: col.base,
    strokeWidth: b.stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div
      className={[animClass, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, lineHeight: 0, position: "relative" }}
      role="img"
      aria-label={`${character.profile} character`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={emoteData ? "avatar-emote" : undefined}
        style={{ overflow: "visible", display: "block" }}
      >
        {/* ground shadow */}
        <ellipse cx="50" cy="95.5" rx={b.hip + 12} ry="3" fill="rgba(17,17,17,0.16)" />

        {/* legs (back to front doesn't matter much for a facing figure) */}
        <polyline points={pts(j.hipL, j.kneeL, j.footL)} {...line} />
        <polyline points={pts(j.hipR, j.kneeR, j.footR)} {...line} />
        <Foot at={j.footL} from={j.kneeL} color={col} />
        <Foot at={j.footR} from={j.kneeR} color={col} />

        {/* torso shell — a rounded quad from shoulders to hips (line-art) */}
        <path
          d={`M${j.shoulderL[0]} ${j.shoulderL[1]} L${j.shoulderR[0]} ${j.shoulderR[1]} L${j.hipR[0]} ${j.hipR[1]} L${j.hipL[0]} ${j.hipL[1]} Z`}
          {...line}
        />

        {/* outfit sits on the torso, under the arms */}
        {OUTFIT_ART[character.outfit]?.(j, col)}

        {/* arms + hands */}
        <polyline points={pts(j.shoulderL, j.elbowL, j.handL)} {...line} />
        <polyline points={pts(j.shoulderR, j.elbowR, j.handR)} {...line} />
        <circle cx={j.handL[0]} cy={j.handL[1]} r={b.hand} fill={col.base} />
        <circle cx={j.handR[0]} cy={j.handR[1]} r={b.hand} fill={col.base} />

        {/* neck */}
        <line
          x1={(j.shoulderL[0] + j.shoulderR[0]) / 2}
          y1={(j.shoulderL[1] + j.shoulderR[1]) / 2}
          x2={j.head[0]}
          y2={j.head[1] + b.headR - 1}
          {...line}
        />

        {/* head: matched-color ring + white disc + intact icon */}
        <circle cx={j.head[0]} cy={j.head[1]} r={b.headR + 1.4} fill={col.deep} />
        <circle cx={j.head[0]} cy={j.head[1]} r={b.headR} fill="#ffffff" stroke={col.base} strokeWidth={b.stroke * 0.7} />
        <image
          href={profileSrc(character.profile)}
          x={j.head[0] - b.headR * 0.9}
          y={j.head[1] - b.headR * 0.9}
          width={b.headR * 1.8}
          height={b.headR * 1.8}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* hat */}
        {HAT_ART[character.hat]?.(j.head, b.headR, col)}
      </svg>

      {emoteData && (
        <span
          aria-hidden
          className="avatar-emote-bubble"
          style={{
            position: "absolute",
            left: "72%",
            top: "-4%",
            transform: "translateX(-50%)",
            fontSize: size * 0.34,
            lineHeight: 1,
          }}
        >
          {emoteData.emoji}
        </span>
      )}
    </div>
  );
}

// ---- helpers ------------------------------------------------------------
function pts(...ps: Pt[]): string {
  return ps.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
}

function Foot({ at, from, color }: { at: Pt; from: Pt; color: BodyColor }) {
  // point the foot forward-ish, perpendicular to the shin
  const ang = Math.atan2(at[1] - from[1], at[0] - from[0]) * (180 / Math.PI);
  return (
    <ellipse
      cx={at[0]}
      cy={at[1]}
      rx="4.4"
      ry="2.7"
      fill={color.deep}
      transform={`rotate(${ang - 90} ${at[0]} ${at[1]})`}
    />
  );
}

// ---- Outfit line-art (a garment layer on the torso; casual = bare) ------
const INK = "#232733";
const SHIRT = "#f4f6fb";

function torsoGeo(j: Joints) {
  const { shoulderL: sL, shoulderR: sR, hipL: hL, hipR: hR } = j;
  return {
    path: `M${sL[0]} ${sL[1]} L${sR[0]} ${sR[1]} L${hR[0]} ${hR[1]} L${hL[0]} ${hL[1]} Z`,
    sL,
    sR,
    hL,
    hR,
    neck: [(sL[0] + sR[0]) / 2, (sL[1] + sR[1]) / 2] as Pt,
    waist: [(hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2] as Pt,
  };
}

type OutfitArt = (j: Joints, c: BodyColor) => React.ReactNode;
const OUTFIT_ART: Record<string, OutfitArt> = {
  casual: () => null, // pure line-art figure
  suit: (j) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={t.path} fill={INK} />
        <path d={`M${t.neck[0]} ${t.neck[1]} L${t.neck[0] - 4.5} ${t.waist[1] - 2} L${t.neck[0] + 4.5} ${t.waist[1] - 2} Z`} fill={SHIRT} />
        <path d={`M${t.neck[0]} ${t.neck[1] + 1} l-1.9 2 l1.9 2 l1.9 -2 Z`} fill="#ED1C24" />
        <path d={`M${t.neck[0] - 1.5} ${t.neck[1] + 5} L${t.neck[0] + 1.5} ${t.neck[1] + 5} L${t.neck[0] + 1} ${t.waist[1] - 3} L${t.neck[0] - 1} ${t.waist[1] - 3} Z`} fill="#ED1C24" />
      </>
    );
  },
  gym: (j, c) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={t.path} fill={c.base} />
        <path d={`M${t.sL[0] + 2} ${t.sL[1]} L${t.neck[0]} ${t.neck[1] + 3.5} L${t.sR[0] - 2} ${t.sR[1]}`} fill="none" stroke={c.deep} strokeWidth="2.4" strokeLinecap="round" />
        <line x1={t.waist[0] - 6} y1={t.waist[1] - 8} x2={t.waist[0] + 6} y2={t.waist[1] - 8} stroke={SHIRT} strokeWidth="2.6" />
      </>
    );
  },
  hoodie: (j, c) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={t.path} fill={c.deep} />
        <rect x={t.waist[0] - 6} y={t.waist[1] - 9} width="12" height="8" rx="2" fill={c.base} />
        <line x1={t.neck[0] - 2} y1={t.neck[1] + 1} x2={t.neck[0] - 2.6} y2={t.neck[1] + 8} stroke={SHIRT} strokeWidth="1.5" strokeLinecap="round" />
        <line x1={t.neck[0] + 2} y1={t.neck[1] + 1} x2={t.neck[0] + 2.6} y2={t.neck[1] + 8} stroke={SHIRT} strokeWidth="1.5" strokeLinecap="round" />
      </>
    );
  },
  dress: (j, c) => {
    const t = torsoGeo(j);
    const skirtY = t.waist[1] + 13;
    return (
      <>
        <path d={`M${t.sL[0]} ${t.sL[1]} L${t.sR[0]} ${t.sR[1]} L${t.waist[0] + 4} ${t.waist[1]} L${t.waist[0] - 4} ${t.waist[1]} Z`} fill={c.base} />
        <path d={`M${t.waist[0] - 4} ${t.waist[1]} L${t.waist[0] + 4} ${t.waist[1]} L${t.waist[0] + 12} ${skirtY} L${t.waist[0] - 12} ${skirtY} Z`} fill={c.base} stroke={c.deep} strokeWidth="1" strokeLinejoin="round" />
      </>
    );
  },
  hivis: (j) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={t.path} fill="#F2C200" />
        <line x1={t.sL[0] + 1.5} y1={t.sL[1] + 2} x2={t.hL[0] + 1.5} y2={t.hL[1] - 1} stroke="#E7ECF2" strokeWidth="2" />
        <line x1={t.sR[0] - 1.5} y1={t.sR[1] + 2} x2={t.hR[0] - 1.5} y2={t.hR[1] - 1} stroke="#E7ECF2" strokeWidth="2" />
        <line x1={t.waist[0] - 8} y1={t.waist[1] - 7} x2={t.waist[0] + 8} y2={t.waist[1] - 7} stroke="#E7ECF2" strokeWidth="2" />
      </>
    );
  },
  varsity: (j, c) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={t.path} fill={c.base} />
        <rect x={t.neck[0] - 1} y={t.neck[1]} width="2" height={t.waist[1] - t.neck[1]} fill={SHIRT} />
        <path d={`M${t.hL[0]} ${t.hL[1] - 3} L${t.hR[0]} ${t.hR[1] - 3}`} stroke={SHIRT} strokeWidth="2.4" />
        <circle cx={t.neck[0] - 3.5} cy={t.neck[1] + 5} r="1" fill={SHIRT} />
      </>
    );
  },
  overalls: (j) => {
    const t = torsoGeo(j);
    return (
      <>
        <path d={`M${t.waist[0] - 6} ${t.neck[1] + 5} L${t.waist[0] + 6} ${t.neck[1] + 5} L${t.hR[0]} ${t.hR[1]} L${t.hL[0]} ${t.hL[1]} Z`} fill="#6B93C9" stroke="#3C5C86" strokeWidth="1" strokeLinejoin="round" />
        <line x1={t.sL[0] + 1} y1={t.sL[1]} x2={t.waist[0] - 4.5} y2={t.neck[1] + 6} stroke="#6B93C9" strokeWidth="2.6" strokeLinecap="round" />
        <line x1={t.sR[0] - 1} y1={t.sR[1]} x2={t.waist[0] + 4.5} y2={t.neck[1] + 6} stroke="#6B93C9" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx={t.waist[0] - 4} cy={t.neck[1] + 7} r="1.2" fill="#F5C400" />
        <circle cx={t.waist[0] + 4} cy={t.neck[1] + 7} r="1.2" fill="#F5C400" />
      </>
    );
  },
};

// ---- Hat line-art (positioned relative to the head) ---------------------
// head center = h, radius = r. TOP of head ≈ h[1]-r.
type HatArt = (h: Pt, r: number, c: BodyColor) => React.ReactNode;
const HAT_ART: Record<string, HatArt> = {
  none: () => null,
  cap: (h, r) => (
    <>
      <path d={`M${h[0] - r * 0.95} ${h[1] - r * 0.55} Q${h[0]} ${h[1] - r * 1.7} ${h[0] + r * 0.95} ${h[1] - r * 0.55} Z`} fill="#ED1C24" />
      <path d={`M${h[0] + r * 0.5} ${h[1] - r * 0.62} L${h[0] + r * 1.6} ${h[1] - r * 0.5} L${h[0] + r * 1.5} ${h[1] - r * 0.2} L${h[0] + r * 0.4} ${h[1] - r * 0.35} Z`} fill="#B41118" />
      <circle cx={h[0]} cy={h[1] - r * 1.6} r="1.6" fill="#B41118" />
    </>
  ),
  tophat: (h, r) => (
    <>
      <ellipse cx={h[0]} cy={h[1] - r * 0.85} rx={r * 1.25} ry={r * 0.28} fill="#1b1b20" />
      <rect x={h[0] - r * 0.72} y={h[1] - r * 2.15} width={r * 1.44} height={r * 1.35} rx="1.5" fill="#26262d" />
      <rect x={h[0] - r * 0.72} y={h[1] - r * 1.35} width={r * 1.44} height={r * 0.3} fill="#ED1C24" />
    </>
  ),
  bow: (h, r) => (
    <>
      <path d={`M${h[0]} ${h[1] - r} L${h[0] - r * 0.7} ${h[1] - r * 1.45} L${h[0] - r * 0.7} ${h[1] - r * 0.7} Z`} fill="#EC4899" />
      <path d={`M${h[0]} ${h[1] - r} L${h[0] + r * 0.7} ${h[1] - r * 1.45} L${h[0] + r * 0.7} ${h[1] - r * 0.7} Z`} fill="#EC4899" />
      <circle cx={h[0]} cy={h[1] - r * 1.02} r="2" fill="#BE2A6E" />
    </>
  ),
  crown: (h, r) => (
    <path
      d={`M${h[0] - r * 0.8} ${h[1] - r * 0.72} L${h[0] - r * 0.78} ${h[1] - r * 1.5} L${h[0] - r * 0.32} ${h[1] - r * 1.05} L${h[0]} ${h[1] - r * 1.75} L${h[0] + r * 0.32} ${h[1] - r * 1.05} L${h[0] + r * 0.78} ${h[1] - r * 1.5} L${h[0] + r * 0.8} ${h[1] - r * 0.72} Z`}
      fill="#F5A800"
      stroke="#BD8200"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  ),
  beanie: (h, r, c) => (
    <>
      <path d={`M${h[0] - r * 0.98} ${h[1] - r * 0.5} Q${h[0]} ${h[1] - r * 1.9} ${h[0] + r * 0.98} ${h[1] - r * 0.5} Z`} fill={c.base} />
      <rect x={h[0] - r} y={h[1] - r * 0.72} width={r * 2} height={r * 0.42} rx={r * 0.2} fill={c.deep} />
      <circle cx={h[0]} cy={h[1] - r * 1.82} r="2.4" fill="#ffffff" />
    </>
  ),
  party: (h, r) => (
    <>
      <path d={`M${h[0]} ${h[1] - r * 2.2} L${h[0] - r * 0.72} ${h[1] - r * 0.6} L${h[0] + r * 0.72} ${h[1] - r * 0.6} Z`} fill="#2D5BA8" />
      <path d={`M${h[0] - r * 0.42} ${h[1] - r * 1.15} L${h[0] + r * 0.42} ${h[1] - r * 1.15}`} stroke="#F5A800" strokeWidth="2" strokeLinecap="round" />
      <circle cx={h[0]} cy={h[1] - r * 2.2} r="2.2" fill="#EC4899" />
    </>
  ),
  headband: (h, r) => (
    <>
      <path d={`M${h[0] - r} ${h[1] - r * 0.55} Q${h[0]} ${h[1] - r * 1.15} ${h[0] + r} ${h[1] - r * 0.55}`} fill="none" stroke="#ED1C24" strokeWidth={r * 0.42} strokeLinecap="round" />
      <path d={`M${h[0] + r * 0.9} ${h[1] - r * 0.65} L${h[0] + r * 1.7} ${h[1] - r * 0.95} L${h[0] + r * 1.7} ${h[1] - r * 0.3} Z`} fill="#ED1C24" />
    </>
  ),
  grad: (h, r) => (
    <>
      <path d={`M${h[0] - r * 1.2} ${h[1] - r * 0.95} L${h[0]} ${h[1] - r * 1.5} L${h[0] + r * 1.2} ${h[1] - r * 0.95} L${h[0]} ${h[1] - r * 0.4} Z`} fill="#1b1b20" />
      <circle cx={h[0]} cy={h[1] - r * 0.95} r="1.6" fill="#F5A800" />
      <path d={`M${h[0]} ${h[1] - r * 0.95} L${h[0] + r * 0.9} ${h[1] - r * 0.8} L${h[0] + r * 0.9} ${h[1] - r * 0.1}`} stroke="#F5A800" strokeWidth="1.2" fill="none" />
      <circle cx={h[0] + r * 0.9} cy={h[1] - r * 0.05} r="1.6" fill="#F5A800" />
    </>
  ),
  flower: (h, r) => (
    <g>
      {[0, 72, 144, 216, 288].map((a) => {
        const rr = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={h[0] - r * 0.72 + Math.cos(rr) * 3}
            cy={h[1] - r * 1.05 + Math.sin(rr) * 3}
            r="2.2"
            fill="#EC4899"
          />
        );
      })}
      <circle cx={h[0] - r * 0.72} cy={h[1] - r * 1.05} r="2" fill="#F5A800" />
    </g>
  ),
};
