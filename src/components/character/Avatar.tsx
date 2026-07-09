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
  type BodyProps,
  type Joints,
  type Pt,
} from "@/lib/poses";

/**
 * A player's character: the official PI profile icon (INTACT) as the head, in a
 * matched-colour ring, on a friendly FILLED little-person body (rounded torso +
 * thick capsule arms & legs) struck in a signature pose. Head-ring + body share
 * ONE colour (matched via `variant` for duplicate distinctness). A single slim
 * build; outfit clothes the whole figure head-to-toe; hat sits on the head.
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
  const b = bodyProps();
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

  const skin = OUTFIT_ART[character.outfit] ?? OUTFIT_ART.casual;
  const legColor = skin?.legs?.(col) ?? col.base;
  const armColor = skin?.arms?.(col) ?? col.base;
  const footColor = skin?.feet?.(col) ?? col.deep;
  const neckMid: Pt = [
    (j.shoulderL[0] + j.shoulderR[0]) / 2,
    (j.shoulderL[1] + j.shoulderR[1]) / 2,
  ];

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
        <ellipse cx="50" cy="95" rx={16} ry="3" fill="rgba(17,17,17,0.16)" />

        {/* LEGS — capsules (outfit may recolour them: trousers) */}
        <Limb ps={[j.hipL, j.kneeL, j.footL]} w={b.limb} color={legColor} />
        <Limb ps={[j.hipR, j.kneeR, j.footR]} w={b.limb} color={legColor} />
        <HipBlob at={j.hipL} r={b.limb * 0.6} color={legColor} />
        <HipBlob at={j.hipR} r={b.limb * 0.6} color={legColor} />

        {/* TORSO — a filled, slightly-waisted body */}
        <path d={torsoPath(j)} fill={col.base} />
        {/* smooth the shoulder corners */}
        <circle cx={j.shoulderL[0]} cy={j.shoulderL[1]} r={b.limb * 0.62} fill={col.base} />
        <circle cx={j.shoulderR[0]} cy={j.shoulderR[1]} r={b.limb * 0.62} fill={col.base} />

        {/* ARMS — capsules (outfit may recolour them: sleeves) */}
        <Limb ps={[j.shoulderL, j.elbowL, j.handL]} w={b.limb} color={armColor} />
        <Limb ps={[j.shoulderR, j.elbowR, j.handR]} w={b.limb} color={armColor} />

        {/* OUTFIT — clothes the whole figure (over torso + limbs, under hands/head) */}
        {skin?.art?.(j, col, b)}

        {/* feet + hands sit on top of trousers / sleeves */}
        <Foot at={j.footL} from={j.kneeL} fill={footColor} />
        <Foot at={j.footR} from={j.kneeR} fill={footColor} />
        <circle cx={j.handL[0]} cy={j.handL[1]} r={b.hand} fill={armColor} />
        <circle cx={j.handR[0]} cy={j.handR[1]} r={b.hand} fill={armColor} />

        {/* neck connects head to torso */}
        <line
          x1={neckMid[0]}
          y1={neckMid[1]}
          x2={j.head[0]}
          y2={j.head[1] + b.headR - 1}
          stroke={col.base}
          strokeWidth={b.limb * 0.82}
          strokeLinecap="round"
        />

        {/* head: matched-colour ring + white disc + intact icon */}
        <circle cx={j.head[0]} cy={j.head[1]} r={b.headR + 1.6} fill={col.deep} />
        <circle cx={j.head[0]} cy={j.head[1]} r={b.headR} fill="#ffffff" stroke={col.base} strokeWidth={2} />
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

/** A limb drawn as a thick round-capped capsule (one or two segments). */
function Limb({ ps, w, color }: { ps: Pt[]; w: number; color: string }) {
  return (
    <polyline
      points={pts(...ps)}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function HipBlob({ at, r, color }: { at: Pt; r: number; color: string }) {
  return <circle cx={at[0]} cy={at[1]} r={r} fill={color} />;
}

/** Filled torso: shoulders → hips, gently waisted. */
function torsoPath(j: Joints): string {
  const { shoulderL: sL, shoulderR: sR, hipL: hL, hipR: hR } = j;
  const wL: Pt = [(sL[0] + hL[0]) / 2 - 0.6, (sL[1] + hL[1]) / 2]; // waist pinch L
  const wR: Pt = [(sR[0] + hR[0]) / 2 + 0.6, (sR[1] + hR[1]) / 2]; // waist pinch R
  return (
    `M${sL[0]} ${sL[1]} ` +
    `L${sR[0]} ${sR[1]} ` +
    `Q${wR[0]} ${wR[1]} ${hR[0]} ${hR[1]} ` +
    `L${hL[0]} ${hL[1]} ` +
    `Q${wL[0]} ${wL[1]} ${sL[0]} ${sL[1]} Z`
  );
}

function Foot({ at, from, fill }: { at: Pt; from: Pt; fill: string }) {
  const ang = Math.atan2(at[1] - from[1], at[0] - from[0]) * (180 / Math.PI);
  return (
    <ellipse
      cx={at[0]}
      cy={at[1] + 0.5}
      rx="5"
      ry="2.9"
      fill={fill}
      transform={`rotate(${ang - 90} ${at[0]} ${at[1]})`}
    />
  );
}

// ---- Outfits — full-body garments ---------------------------------------
// Each outfit optionally recolours the arm/leg capsules (sleeves / trousers)
// via `arms`/`legs`, and draws garment detail (torso, skirt, straps…) via
// `art`. casual = the plain coloured figure.
const INK = "#232733";
const SHIRT = "#f4f6fb";
const TIE = "#ED1C24";
const DENIM = "#4f76ad";
const DENIM_DK = "#33507a";
const HIVIS = "#eaf23a";
const HIVIS_TROUSER = "#26364a";
const REFLECT = "#e9edf3";
const CREAM = "#efe7d2";
// summer casual
const HAWAII = "#17a6b8"; // bright teal aloha shirt
const HAWAII_DK = "#0f7d8c";
const KHAKI = "#e7c98f"; // sandy shorts
const LEAF = "#ffd54a";
// gym
const GYM_SHORT = "#1f2430"; // sporty charcoal shorts
const SNEAKER = "#f4f6fb";
const GYM_TRIM = "#ffffff";
// dress
const DRESS = "#d6337f"; // a distinct dress colour
const DRESS_DK = "#a51f60";
const DRESS_TRIM = "#ffd1e4";

type OutfitArt = {
  legs?: (c: BodyColor) => string;
  arms?: (c: BodyColor) => string;
  feet?: (c: BodyColor) => string;
  art?: (j: Joints, c: BodyColor, b: BodyProps) => React.ReactNode;
};

/** Thick capsule (for garment sleeves / trousers drawn in `art`). */
function Cap({ ps, w, color }: { ps: Pt[]; w: number; color: string }) {
  return (
    <polyline
      points={pts(...ps)}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const OUTFIT_ART: Record<string, OutfitArt> = {
  // Summer look — khaki shorts + a bright short-sleeve aloha shirt.
  casual: {
    art: (j, _c, b) => {
      const top = j.neck;
      return (
        <>
          {/* khaki summer shorts (upper legs) */}
          <Cap ps={[j.hipL, mid(j.hipL, j.kneeL, 0.5)]} w={b.limb + 1.4} color={KHAKI} />
          <Cap ps={[j.hipR, mid(j.hipR, j.kneeR, 0.5)]} w={b.limb + 1.4} color={KHAKI} />
          {/* aloha shirt body + short sleeves */}
          <path d={torsoPath(j)} fill={HAWAII} />
          <Cap ps={[j.shoulderL, mid(j.shoulderL, j.elbowL, 0.42)]} w={b.limb + 1} color={HAWAII} />
          <Cap ps={[j.shoulderR, mid(j.shoulderR, j.elbowR, 0.42)]} w={b.limb + 1} color={HAWAII} />
          {/* open collar */}
          <path d={`M${top[0]} ${top[1] - 1} l-3.4 3 l1.7 1.2 l1.7 -2.6 Z`} fill={HAWAII_DK} />
          <path d={`M${top[0]} ${top[1] - 1} l3.4 3 l-1.7 1.2 l-1.7 -2.6 Z`} fill={HAWAII_DK} />
          {/* button placket + tropical dots */}
          <line x1={top[0]} y1={top[1] + 2} x2={top[0]} y2={j.pelvis[1] - 2} stroke={HAWAII_DK} strokeWidth="0.9" />
          <circle cx={top[0] - 4} cy={top[1] + 6} r="1.5" fill={LEAF} />
          <circle cx={top[0] + 4} cy={top[1] + 9} r="1.5" fill={LEAF} />
          <circle cx={top[0] - 3} cy={top[1] + 12} r="1.2" fill={SHIRT} />
          <circle cx={top[0] + 5} cy={top[1] + 4} r="1.1" fill={SHIRT} />
        </>
      );
    },
  },

  // Full INK suit: jacket torso + long sleeves + trousers, white shirt V + tie.
  suit: {
    legs: () => INK,
    arms: () => INK,
    art: (j) => {
      const top = j.neck;
      const waist = midPt(j.hipL, j.hipR);
      return (
        <>
          {/* jacket torso */}
          <path d={torsoPath(j)} fill={INK} />
          {/* white shirt V */}
          <path
            d={`M${top[0]} ${top[1] - 1} L${top[0] - 4.2} ${top[1] + 9} L${top[0] + 4.2} ${top[1] + 9} Z`}
            fill={SHIRT}
          />
          {/* collar */}
          <path d={`M${top[0]} ${top[1] - 1} l-4.6 4 l2 1.4 l2.6 -3.4 Z`} fill={INK} />
          <path d={`M${top[0]} ${top[1] - 1} l4.6 4 l-2 1.4 l-2.6 -3.4 Z`} fill={INK} />
          {/* tie */}
          <path d={`M${top[0]} ${top[1] + 1.5} l-1.9 2.2 l1.9 2 l1.9 -2 Z`} fill={TIE} />
          <path d={`M${top[0] - 1.5} ${top[1] + 5.6} L${top[0] + 1.5} ${top[1] + 5.6} L${top[0] + 1} ${waist[1] - 2} L${top[0] - 1} ${waist[1] - 2} Z`} fill={TIE} />
          {/* lapel line */}
          <line x1={top[0]} y1={top[1] + 9} x2={top[0]} y2={waist[1] - 1} stroke="#171a22" strokeWidth="1" />
        </>
      );
    },
  },

  // A proper full-length dress in its own distinct colour: fitted bodice +
  // straps + a wide flared skirt down to the ankles.
  dress: {
    art: (j) => {
      const waistY = j.pelvis[1];
      const hemY = j.pelvis[1] + 26; // near the ankles = full length
      const cx = midPt(j.hipL, j.hipR)[0];
      const top = j.neck;
      return (
        <>
          {/* bodice */}
          <path d={torsoPath(j)} fill={DRESS} />
          {/* shoulder straps */}
          <line x1={j.shoulderL[0] + 1.5} y1={j.shoulderL[1]} x2={cx - 3} y2={top[1] + 1} stroke={DRESS} strokeWidth="2.2" strokeLinecap="round" />
          <line x1={j.shoulderR[0] - 1.5} y1={j.shoulderR[1]} x2={cx + 3} y2={top[1] + 1} stroke={DRESS} strokeWidth="2.2" strokeLinecap="round" />
          {/* full-length flared skirt */}
          <path
            d={`M${j.hipL[0] - 1} ${waistY - 1} L${j.hipR[0] + 1} ${waistY - 1} L${cx + 18} ${hemY} Q${cx} ${hemY + 4} ${cx - 18} ${hemY} Z`}
            fill={DRESS}
            stroke={DRESS_DK}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* waist sash, neckline + hem trim */}
          <line x1={j.hipL[0] - 1} y1={waistY - 1} x2={j.hipR[0] + 1} y2={waistY - 1} stroke={DRESS_TRIM} strokeWidth="2.2" />
          <path d={`M${cx - 4} ${top[1] + 1} Q${cx} ${top[1] + 5} ${cx + 4} ${top[1] + 1}`} fill="none" stroke={DRESS_TRIM} strokeWidth="1.6" strokeLinecap="round" />
          <path d={`M${cx - 18} ${hemY} Q${cx} ${hemY + 4} ${cx + 18} ${hemY}`} fill="none" stroke={DRESS_TRIM} strokeWidth="1.3" />
        </>
      );
    },
  },

  // Athletic: sporty tank top + charcoal shorts (white stripe) + sneakers.
  gym: {
    feet: () => SNEAKER,
    art: (j, c, b) => {
      const top = j.neck;
      const kL = mid(j.hipL, j.kneeL, 0.52);
      const kR = mid(j.hipR, j.kneeR, 0.52);
      return (
        <>
          {/* athletic shorts + white side stripe */}
          <Cap ps={[j.hipL, kL]} w={b.limb + 1.6} color={GYM_SHORT} />
          <Cap ps={[j.hipR, kR]} w={b.limb + 1.6} color={GYM_SHORT} />
          <Cap ps={[mid(j.hipL, j.kneeL, 0.14), kL]} w={1.5} color={GYM_TRIM} />
          <Cap ps={[mid(j.hipR, j.kneeR, 0.14), kR]} w={1.5} color={GYM_TRIM} />
          {/* tank top (bare shoulders = sleeveless) */}
          <path d={torsoPath(j)} fill={c.base} />
          {/* cut-in armhole trims */}
          <path d={`M${j.shoulderL[0] + 1.5} ${j.shoulderL[1] - 2} Q${j.shoulderL[0] - 1} ${j.shoulderL[1] + 4} ${j.shoulderL[0] + 3.5} ${j.shoulderL[1] + 7}`} fill="none" stroke={c.deep} strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${j.shoulderR[0] - 1.5} ${j.shoulderR[1] - 2} Q${j.shoulderR[0] + 1} ${j.shoulderR[1] + 4} ${j.shoulderR[0] - 3.5} ${j.shoulderR[1] + 7}`} fill="none" stroke={c.deep} strokeWidth="1.5" strokeLinecap="round" />
          {/* neckline + chest band */}
          <path d={`M${top[0] - 3.5} ${top[1]} Q${top[0]} ${top[1] + 4} ${top[0] + 3.5} ${top[1]}`} fill="none" stroke={c.deep} strokeWidth="1.6" strokeLinecap="round" />
          <line x1={top[0] - 4} y1={j.pelvis[1] - 4} x2={top[0] + 4} y2={j.pelvis[1] - 4} stroke={GYM_TRIM} strokeWidth="1.8" />
        </>
      );
    },
  },

  // Hoodie: deep-colour body + long sleeves + hood + pocket + drawstrings.
  hoodie: {
    arms: (c) => c.deep,
    art: (j, c) => {
      const top = j.neck;
      const waist = midPt(j.hipL, j.hipR);
      return (
        <>
          <path d={torsoPath(j)} fill={c.deep} />
          {/* hood collar */}
          <path d={`M${top[0] - 6} ${top[1] - 1} Q${top[0]} ${top[1] + 7} ${top[0] + 6} ${top[1] - 1} L${top[0] + 4} ${top[1] - 3} Q${top[0]} ${top[1] + 3} ${top[0] - 4} ${top[1] - 3} Z`} fill={c.base} />
          {/* pocket */}
          <path d={`M${waist[0] - 6} ${waist[1] - 8} L${waist[0] + 6} ${waist[1] - 8} L${waist[0] + 5} ${waist[1] - 2} L${waist[0] - 5} ${waist[1] - 2} Z`} fill={c.base} />
          {/* drawstrings */}
          <line x1={top[0] - 1.8} y1={top[1] + 2} x2={top[0] - 2.4} y2={top[1] + 9} stroke={SHIRT} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={top[0] + 1.8} y1={top[1] + 2} x2={top[0] + 2.4} y2={top[1] + 9} stroke={SHIRT} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    },
  },

  // Hi-vis site kit: yellow vest + navy work trousers + reflective bands.
  hivis: {
    legs: () => HIVIS_TROUSER,
    art: (j) => {
      const top = j.neck;
      const waist = midPt(j.hipL, j.hipR);
      return (
        <>
          <path d={torsoPath(j)} fill={HIVIS} />
          {/* vertical reflective bands */}
          <line x1={j.shoulderL[0] + 3} y1={top[1] + 1} x2={j.hipL[0] + 1.5} y2={j.pelvis[1] - 1} stroke={REFLECT} strokeWidth="2.1" />
          <line x1={j.shoulderR[0] - 3} y1={top[1] + 1} x2={j.hipR[0] - 1.5} y2={j.pelvis[1] - 1} stroke={REFLECT} strokeWidth="2.1" />
          {/* waist band */}
          <line x1={j.hipL[0]} y1={waist[1] - 6} x2={j.hipR[0]} y2={waist[1] - 6} stroke={REFLECT} strokeWidth="2.1" />
          {/* zip */}
          <line x1={top[0]} y1={top[1]} x2={top[0]} y2={waist[1] - 1} stroke={HIVIS_TROUSER} strokeWidth="1" />
        </>
      );
    },
  },

  // Varsity: jacket body + cream sleeves + denim jeans + chest stripe.
  varsity: {
    legs: () => DENIM,
    arms: () => CREAM,
    art: (j, c) => {
      const top = j.neck;
      const waist = midPt(j.hipL, j.hipR);
      return (
        <>
          <path d={torsoPath(j)} fill={c.base} />
          {/* placket */}
          <rect x={top[0] - 1} y={top[1]} width="2" height={waist[1] - top[1] - 1} fill={SHIRT} />
          {/* collar + hem ribbing */}
          <path d={`M${top[0] - 5} ${top[1]} L${top[0] + 5} ${top[1]}`} stroke={SHIRT} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M${j.hipL[0]} ${j.pelvis[1] - 2} L${j.hipR[0]} ${j.pelvis[1] - 2}`} stroke={SHIRT} strokeWidth="2.4" />
          {/* chest emblem */}
          <circle cx={top[0] - 3.5} cy={top[1] + 5} r="1.4" fill={TIE} />
        </>
      );
    },
  },

  // Overalls: denim bib + trousers over a coloured tee.
  overalls: {
    legs: () => DENIM,
    art: (j, c) => {
      const top = j.neck;
      const waist = midPt(j.hipL, j.hipR);
      const bibTop = top[1] + 5;
      return (
        <>
          {/* coloured tee under */}
          <path d={torsoPath(j)} fill={c.base} />
          {/* short sleeves */}
          {/* bib */}
          <path
            d={`M${waist[0] - 6} ${bibTop} L${waist[0] + 6} ${bibTop} L${j.hipR[0]} ${j.hipR[1]} L${j.hipL[0]} ${j.hipL[1]} Z`}
            fill={DENIM}
            stroke={DENIM_DK}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* straps */}
          <line x1={j.shoulderL[0] + 1.5} y1={j.shoulderL[1]} x2={waist[0] - 4.5} y2={bibTop + 1} stroke={DENIM} strokeWidth="2.8" strokeLinecap="round" />
          <line x1={j.shoulderR[0] - 1.5} y1={j.shoulderR[1]} x2={waist[0] + 4.5} y2={bibTop + 1} stroke={DENIM} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx={waist[0] - 4} cy={bibTop + 1.5} r="1.2" fill="#F5C400" />
          <circle cx={waist[0] + 4} cy={bibTop + 1.5} r="1.2" fill="#F5C400" />
        </>
      );
    },
  },
};

function midPt(a: Pt, b: Pt): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
/** Point a fraction `t` from a toward b. */
function mid(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ---- Hat line-art (positioned relative to the head) — UNCHANGED ---------
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
