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
  limb: number; // limb capsule thickness (legs/arms)
  shoulder: number; // half shoulder span
  hip: number; // half hip span
  upperArm: number;
  foreArm: number;
  thigh: number;
  shin: number;
  hand: number; // hand radius
  headR: number;
};

/**
 * A single, slim build. Proportions are tuned so the figure reads as a little
 * PERSON — head ≈ ¼ of the standing height, a substantial torso, and limbs
 * thick enough to look like arms/legs rather than an armature.
 */
export const BODY: BodyProps = {
  limb: 7.4,
  shoulder: 10.5,
  hip: 7,
  upperArm: 13,
  foreArm: 12,
  thigh: 15,
  shin: 15,
  hand: 3.3,
  headR: 11.5,
};

// Kept as a function for call-site compatibility; body type was removed, so
// every character now uses the one slim build regardless of the argument.
export function bodyProps(_bodyType?: string): BodyProps {
  return BODY;
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

const TORSO_LEN = 22;

export function computeJoints(pose: Pose, b: BodyProps): Joints {
  const dy = pose.bounce ?? 0;
  const pelvis: Pt = [50, 58 + dy];
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

// leg presets (thigh, shin)
const L = {
  together: { l: [-3, -1] as [number, number], r: [3, 1] as [number, number] },
  stand: { l: [-7, -5] as [number, number], r: [7, 5] as [number, number] },
  planted: { l: [-11, -9] as [number, number], r: [11, 9] as [number, number] },
  wide: { l: [-15, -13] as [number, number], r: [15, 13] as [number, number] },
  contra: { l: [-4, -10] as [number, number], r: [13, 9] as [number, number] }, // weight on one leg
  lunge: { l: [-30, -12] as [number, number], r: [22, 44] as [number, number] },
  leap: { l: [-34, -60] as [number, number], r: [28, 46] as [number, number] },
  step: { l: [-22, -26] as [number, number], r: [11, 7] as [number, number] },
  cross: { l: [-2, 0] as [number, number], r: [10, 30] as [number, number] },
};

// Each profile gets its OWN signature stance — combinations of arm gesture,
// leg stance, lean and bounce chosen so all 17 read as visibly different.
export const POSES: Record<string, Pose> = {
  // thoughtful — right hand to chin, left arm across waist, weight on one leg
  Analyzer: { lean: 2, headX: 1, arms: { l: [-14, 30], r: [30, 200] }, legs: L.contra },
  // disciplined — arms crossed high, firm wide stance
  Controller: { arms: { l: [-70, 92], r: [70, -92] }, legs: L.wide },
  // risk-taker — deep lunge, right arm punching up-ahead
  Venturer: { arms: { l: [-34, -70], r: [120, 150] }, legs: L.lunge, bounce: -1 },
  // precise — hands clasped neatly at the waist, feet together
  Specialist: { arms: { l: [-18, 46], r: [18, -46] }, legs: L.together },
  // visionary — right arm raised presenting the plan, left hand on hip
  Strategist: { arms: { l: [-52, -150], r: [150, 165] }, legs: L.planted },
  // scholar — both hands holding a book up at the chest, feet together
  Scholar: { arms: { l: [-40, -120], r: [40, 120] }, legs: L.together },
  // independent — cool crossed arms, leaning, ankle crossed
  Individualist: { lean: 9, arms: { l: [-64, 100], r: [78, -88] }, legs: L.cross },
  // social — big enthusiastic pitch, arms wide & up, right higher
  Persuader: { arms: { l: [-84, -108], r: [116, 132] }, legs: L.stand },
  // extravert — big wave (right up), left hand out, light on feet
  Promoter: { arms: { l: [-58, -96], r: [156, 150] }, legs: L.step, bounce: -1 },
  // bold — fist punched straight up, leaping, legs apart
  Maverick: { arms: { l: [-22, -16], r: [174, 190] }, legs: L.leap, bounce: -6 },
  // leader — right arm pointing ahead, left hand on hip, chest out, wide
  Captain: { lean: -3, arms: { l: [-54, -150], r: [78, 74] }, legs: L.wide },
  // team — both arms open welcoming, mid-height, planted
  Collaborator: { arms: { l: [-54, -60], r: [54, 60] }, legs: L.planted },
  // empathetic — both hands to the heart
  Altruist: { lean: -2, arms: { l: [-28, 40], r: [28, -40] }, legs: L.together },
  // steady — wide planted stance, arms low & slightly out (guarding)
  Guardian: { arms: { l: [-18, -14], r: [18, 14] }, legs: L.wide },
  // methodical — both hands on hips, wide stance
  Operator: { arms: { l: [-56, -150], r: [56, 150] }, legs: L.wide },
  // craftsman — right hand raised holding a tool, left across body, mid-step
  Artisan: { arms: { l: [-24, 44], r: [138, 172] }, legs: L.step },
  // flexible — dynamic mid-step, arms counter-balancing, leaning
  Adapter: { lean: 5, arms: { l: [-100, -84], r: [44, 96] }, legs: L.step, bounce: -1 },
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
