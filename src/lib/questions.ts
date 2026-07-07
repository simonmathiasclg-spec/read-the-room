import bank from "@/data/question-bank.json";
import pack from "@/data/question-pack.json";

export type Tier = "rookie" | "pro" | "practitioner";

/** Question kinds this build knows how to render + score. */
export type QuestionType = "mc" | "tf" | "graph" | "slider" | "order";

type QuestionBase = {
  id: string;
  tier: Tier;
  topic: string;
  q: string;
  teach: string;
};

/** Classic multiple choice (the original type). `style` is a harmless flavor
 *  hint on some items — spot-the-drive / odd-one-out / best-move / etc. */
export type McQuestion = QuestionBase & {
  type: "mc";
  style?: string;
  options: [string, string, string, string];
  answer: number; // 0–3
};

/** True/False — rendered as two big tiles; scored exactly like mc. */
export type TfQuestion = QuestionBase & {
  type: "tf";
  answer: boolean;
};

/** Read-the-pattern: host draws the A/B/C/D pattern, then asks an mc question. */
export type GraphPattern = { A: number; B: number; C: number; D: number };
export type GraphQuestion = QuestionBase & {
  type: "graph";
  pattern: GraphPattern;
  options: [string, string, string, string];
  answer: number; // 0–3
};

/** Slider "build the profile": drag each factor on a Low↔High 0–100 scale. */
export type SliderFactor = {
  key: "A" | "B" | "C" | "D";
  label: string;
  target: number; // 0–100
  low: string;
  high: string;
};
export type SliderQuestion = QuestionBase & {
  type: "slider";
  factors: SliderFactor[];
  tolerance: number; // full credit within ± this many points of target
};

/** Order "put in sequence": items are stored IN CORRECT ORDER; shown shuffled. */
export type OrderQuestion = QuestionBase & {
  type: "order";
  items: string[];
};

export type Question =
  | McQuestion
  | TfQuestion
  | GraphQuestion
  | SliderQuestion
  | OrderQuestion;

const SUPPORTED: ReadonlySet<string> = new Set<QuestionType>([
  "mc",
  "tf",
  "graph",
  "slider",
  "order",
]);

/**
 * Merge the base bank (untyped legacy = "mc") with the types pack, normalize the
 * `type` field, and drop any kinds this build can't render yet (e.g. slider /
 * order, which would need a new answer field + a Firebase rules change).
 */
function loadQuestions(): Question[] {
  const raw = [
    ...(bank.questions as unknown[]),
    ...(pack.questions as unknown[]),
  ];
  const out: Question[] = [];
  for (const item of raw) {
    const q = item as Record<string, unknown>;
    const type = (q.type as string) ?? "mc"; // legacy items have no type
    if (!SUPPORTED.has(type)) continue;
    out.push({ ...q, type } as Question);
  }
  return out;
}

export const QUESTION_BANK: Question[] = loadQuestions();

const BY_ID = new Map(QUESTION_BANK.map((q) => [q.id, q]));

export function questionById(id: string): Question | undefined {
  return BY_ID.get(id);
}

/** How many answer tiles a question shows (TF is a 2-way; the rest are 4-way). */
export function optionCountFor(q: Question): number {
  return q.type === "tf" ? 2 : 4;
}

/**
 * The original option index of the correct answer, in a form the shared
 * position-shuffle can place. For TF, option 0 = TRUE and option 1 = FALSE.
 */
export function correctOptionIndex(q: Question): number {
  if (q.type === "tf") return q.answer ? 0 : 1;
  if (q.type === "mc" || q.type === "graph") return q.answer;
  return 0; // slider/order don't use tile positions
}

/**
 * Deterministic per-question tile order shared by the host big screen and every
 * phone, so the correct answer lands in a varying position but all clients
 * agree. Seeded by question id + room pin. `order[tileIndex] = optionIndex`.
 */
export function optionOrder(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// ----- Closeness scoring for the interactive types -----------------------

/**
 * Per-factor slider credit: full (1) within ±tolerance of the target, then
 * scaling linearly to 0 at the far end of the 0–100 scale. Pure + testable.
 */
export function sliderPerFactor(
  placed: number,
  target: number,
  tolerance: number,
): number {
  const d = Math.abs(placed - target);
  if (d <= tolerance) return 1;
  const maxDist = Math.max(target, 100 - target);
  if (maxDist <= tolerance) return 1;
  return Math.max(0, 1 - (d - tolerance) / (maxDist - tolerance));
}

/** Average per-factor credit across a placement (0–1). */
export function sliderCloseness(
  placement: number[],
  targets: number[],
  tolerance: number,
): number {
  if (targets.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < targets.length; i++) {
    sum += sliderPerFactor(placement[i] ?? 0, targets[i], tolerance);
  }
  return sum / targets.length;
}

/**
 * Order closeness: fraction of items in their correct position. The submitted
 * `order[position] = originalItemIndex`, and items are stored in correct order,
 * so a position is right when `order[i] === i` (0–1).
 */
export function orderCloseness(order: number[], count: number): number {
  if (count === 0) return 0;
  let correct = 0;
  for (let i = 0; i < count; i++) if (order[i] === i) correct++;
  return correct / count;
}

/** "mixed" blends all tiers; otherwise the round is a single tier. */
export type Difficulty = "mixed" | Tier;

const TIER_ORDER: Tier[] = ["rookie", "pro", "practitioner"];

/** Fisher–Yates shuffle (Math.random is fine in app runtime). */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick `count` question ids for a round, filtered by difficulty. Draws from the
 * whole merged bank, so a round naturally mixes mc / tf / graph.
 *
 * - A single tier ("rookie" | "pro" | "practitioner") draws only that tier.
 * - "mixed" deliberately spreads across tiers via round-robin, so the blend is
 *   balanced (never accidentally all-easy) even for small rounds. The chosen
 *   set is then shuffled so the play order isn't a predictable easy→hard ramp.
 *
 * Capped at what the bank holds.
 */
export function pickQuestionIds(
  count: number,
  difficulty: Difficulty = "mixed",
): string[] {
  if (difficulty !== "mixed") {
    const pool = shuffle(QUESTION_BANK.filter((q) => q.tier === difficulty));
    return pool.slice(0, Math.min(count, pool.length)).map((q) => q.id);
  }

  // Mixed: take one from each tier in rotation until we have enough.
  const pools = TIER_ORDER.map((t) =>
    shuffle(QUESTION_BANK.filter((q) => q.tier === t)),
  );
  const picked: Question[] = [];
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const pool of pools) {
      if (picked.length >= count) break;
      const q = pool.pop();
      if (q) {
        picked.push(q);
        progressed = true;
      }
    }
  }
  return shuffle(picked).map((q) => q.id);
}
