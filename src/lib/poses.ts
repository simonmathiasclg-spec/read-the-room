/**
 * Jointed stick-figure rig. A Pose is authored as compact joint ANGLES (degrees,
 * 0 = pointing straight down, + = toward the figure's right / viewer-right,
 * ±180 = up). computeJoints() turns a pose + body proportions into concrete
 * joint coordinates in a 0–100 viewBox, which Avatar strokes as capsule limbs.
 *
 * Poses are the profiles' identity (a signature default stance each). Because
 * everything is angle-driven, poses can be interpolated for emotes/idle.
 */

export type Pt = [number, number];

export type Pose = {
  lean?: number; // torso lean (deg, + leans figure's top to the right)
  headX?: number; // head nudge x
  headY?: number; // head nudge y (+ = down)
  bounce?: number; // whole-figure vertical offset (- = lifted, for leaps)
  arms: { l: [number, number]; r: [number, number] }; // [upperArm, forearm] abs angles
  legs: { l: [number, number]; r: [number, number] }; // [thigh, shin] abs angles
};

export type BodyProps = {
  stroke: number;
  shoulder: number; // half shoulder span
  hip: number; // half hip span
  upperArm: number;
  foreArm: number;
  thigh: number;
  shin: number;
  hand: number; // hand radius
  headR: number;
};

export const BODY_PROPS: Record<string, BodyProps> = {
  skinny: { stroke: 5.5, shoulder: 8, hip: 5, upperArm: 12, foreArm: 11, thigh: 14, shin: 14, hand: 3.1, headR: 14 },
  muscular: { stroke: 8.5, shoulder: 11.5, hip: 5.5, upperArm: 11.5, foreArm: 10.5, thigh: 13.5, shin: 13.5, hand: 4, headR: 14 },
  broad: { stroke: 9.5, shoulder: 12.5, hip: 8.5, upperArm: 11.5, foreArm: 10.5, thigh: 13, shin: 13.5, hand: 4.3, headR: 14 },
};

export function bodyProps(bodyType: string): BodyProps {
  return BODY_PROPS[bodyType] ?? BODY_PROPS.skinny;
}

export type Joints = {
  head: Pt;
  neck: Pt;
  pelvis: Pt;
  shoulderL: Pt;
  shoulderR: Pt;
  elbowL: Pt;
  elbowR: Pt;
  handL: Pt;
  handR: Pt;
  hipL: Pt;
  hipR: Pt;
  kneeL: Pt;
  kneeR: Pt;
  footL: Pt;
  footR: Pt;
};

const rad = (d: number) => (d * Math.PI) / 180;
/** Point at `len` from `p`, angle `a` (0 = down, + = toward +x). */
function reach(p: Pt, a: number, len: number): Pt {
  return [p[0] + len * Math.sin(rad(a)), p[1] + len * Math.cos(rad(a))];
}
function rot(p: Pt, origin: Pt, deg: number): Pt {
  const s = Math.sin(rad(deg));
  const c = Math.cos(rad(deg));
  const dx = p[0] - origin[0];
  const dy = p[1] - origin[1];
  return [origin[0] + dx * c - dy * s, origin[1] + dx * s + dy * c];
}

const TORSO_LEN = 15;

export function computeJoints(pose: Pose, b: BodyProps): Joints {
  const dy = pose.bounce ?? 0;
  const pelvis: Pt = [50, 63 + dy];
  const lean = pose.lean ?? 0;
  // torso rises from the pelvis; lean rotates the upper body around the pelvis
  let neck: Pt = [50, pelvis[1] - TORSO_LEN];
  neck = rot(neck, pelvis, lean);
  const headBase: Pt = rot([50, neck[1] - 16], pelvis, lean);
  const head: Pt = [
    headBase[0] + (pose.headX ?? 0),
    headBase[1] + (pose.headY ?? 0),
  ];

  const shoulderL = rot([50 - b.shoulder, neck[1] + 1.5], pelvis, lean);
  const shoulderR = rot([50 + b.shoulder, neck[1] + 1.5], pelvis, lean);
  const elbowL = reach(shoulderL, pose.arms.l[0], b.upperArm);
  const elbowR = reach(shoulderR, pose.arms.r[0], b.upperArm);
  const handL = reach(elbowL, pose.arms.l[1], b.foreArm);
  const handR = reach(elbowR, pose.arms.r[1], b.foreArm);

  const hipL: Pt = [50 - b.hip, pelvis[1]];
  const hipR: Pt = [50 + b.hip, pelvis[1]];
  const kneeL = reach(hipL, pose.legs.l[0], b.thigh);
  const kneeR = reach(hipR, pose.legs.r[0], b.thigh);
  const footL = reach(kneeL, pose.legs.l[1], b.shin);
  const footR = reach(kneeR, pose.legs.r[1], b.shin);

  return { head, neck, pelvis, shoulderL, shoulderR, elbowL, elbowR, handL, handR, hipL, hipR, kneeL, kneeR, footL, footR };
}

// ---- Signature poses, one per profile -----------------------------------
// Authored by intent; verified visually. Angles: 0 down, + right, ±180 up.

// leg presets (thigh, shin) — narrower + more varied than before
const L = {
  together: { l: [-3, -1] as [number, number], r: [3, 1] as [number, number] },
  stand: { l: [-7, -5] as [number, number], r: [7, 5] as [number, number] },
  wide: { l: [-14, -12] as [number, number], r: [14, 12] as [number, number] },
  lunge: { l: [-28, -12] as [number, number], r: [22, 42] as [number, number] },
  leap: { l: [-34, -60] as [number, number], r: [28, 46] as [number, number] },
  step: { l: [-22, -26] as [number, number], r: [11, 7] as [number, number] },
  cross: { l: [-2, 0] as [number, number], r: [10, 30] as [number, number] },
};

export const POSES: Record<string, Pose> = {
  // thoughtful — right hand to chin, weight settled
  Analyzer: { arms: { l: [-16, -13], r: [26, 208] }, legs: L.stand, headX: 1 },
  // disciplined — arms crossed, firm wide stance
  Controller: { arms: { l: [-72, 96], r: [72, -96] }, legs: L.wide },
  // risk-taker — lunge forward, arm punching up-ahead
  Venturer: { arms: { l: [-30, -60], r: [128, 148] }, legs: L.lunge, bounce: -1 },
  // precise — hands clasped neatly at centre, feet together
  Specialist: { arms: { l: [-20, 44], r: [20, -44] }, legs: L.together },
  // visionary — one arm raised presenting the plan
  Strategist: { arms: { l: [-18, -14], r: [150, 166] }, legs: L.stand },
  // scholar — both hands up holding a book
  Scholar: { arms: { l: [-40, -128], r: [40, 128] }, legs: L.together },
  // independent — cool crossed arms, leaning, ankle crossed
  Individualist: { lean: 8, arms: { l: [-70, 98], r: [74, -92] }, legs: L.cross },
  // social — arms wide, mid-pitch
  Persuader: { arms: { l: [-74, -104], r: [74, 104] }, legs: L.wide },
  // extravert — big wave, other hand out, light on feet
  Promoter: { arms: { l: [-46, -84], r: [158, 148] }, legs: L.step, bounce: -1 },
  // bold — fist up, leaping
  Maverick: { arms: { l: [-24, -18], r: [172, 188] }, legs: L.leap, bounce: -6 },
  // leader — point ahead, hand on hip, chest out
  Captain: { lean: -3, arms: { l: [-56, -150], r: [96, 96] }, legs: L.wide },
  // team — open welcoming arms
  Collaborator: { arms: { l: [-52, -58], r: [52, 58] }, legs: L.stand },
  // empathetic — hands to heart
  Altruist: { arms: { l: [-22, 36], r: [22, -36] }, legs: L.together },
  // steady — planted, arms ready and slightly out
  Guardian: { arms: { l: [-26, -24], r: [26, 24] }, legs: L.wide },
  // methodical — hands on hips
  Operator: { arms: { l: [-56, -150], r: [56, 150] }, legs: L.wide },
  // craftsman — one hand raised holding a tool, other across
  Artisan: { arms: { l: [-26, 40], r: [142, 176] }, legs: L.stand },
  // flexible — dynamic mid-step, arms counter-balancing
  Adapter: { lean: 4, arms: { l: [-96, -80], r: [40, 92] }, legs: L.step, bounce: -1 },
};

const STAND_POSE: Pose = { arms: { l: [-14, -12], r: [14, 12] }, legs: L.stand };

export function poseFor(profile: string): Pose {
  return POSES[profile] ?? STAND_POSE;
}

// ---- Emote poses (transient; override the whole body while active) -------
export const EMOTE_POSES: Record<string, Pose> = {
  wave: { arms: { l: [-16, -13], r: [162, 150] }, legs: L.stand },
  celebrate: { arms: { l: [-160, -178], r: [160, 178] }, legs: L.leap, bounce: -6 },
  flex: { arms: { l: [-58, -168], r: [58, 168] }, legs: L.wide },
  laugh: { lean: -6, arms: { l: [-30, 40], r: [30, -40] }, legs: L.stand },
  love: { arms: { l: [-30, -128], r: [30, 128] }, legs: L.together },
  cool: { arms: { l: [-50, -145], r: [16, 12] }, legs: L.cross, lean: 5 },
  mindblown: { arms: { l: [-150, -170], r: [150, 170] }, legs: L.wide },
};
