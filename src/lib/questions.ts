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

/** Fisher–Yates shuffle (Math.random is fine in app runtime). */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Interactive / visual types — sprinkled in (one-ish each) rather than used as
 *  the backbone, both for pacing and because the bank holds few of them. */
const SPECIAL_TYPES: ReadonlySet<string> = new Set(["graph", "slider", "order"]);

/**
 * Order a round so it feels varied throughout: the rare special types
 * (graph/slider/order) are reserved into evenly-spaced slots so they're spread
 * across the whole round (not clustered at the end), and the mc/tf backbone is
 * greedily alternated around them — which, with balanced mc/tf, yields NO
 * same-type back-to-back.
 */
function spaceOutTypes(items: Question[]): Question[] {
  const n = items.length;
  const specials: Question[] = [];
  const backbone: Record<string, Question[]> = {};
  for (const q of items) {
    if (SPECIAL_TYPES.has(q.type)) specials.push(q);
    else (backbone[q.type] ??= []).push(q);
  }
  for (const t of Object.keys(backbone)) backbone[t] = shuffle(backbone[t]);

  // Reserve evenly-spaced slots for the (shuffled) specials.
  const spec = shuffle(specials);
  const reserved = new Map<number, Question>();
  const usedSlots = new Set<number>();
  for (let k = 0; k < spec.length; k++) {
    let slot = Math.min(n - 1, Math.floor(((k + 0.5) * n) / spec.length));
    while (usedSlots.has(slot)) slot = (slot + 1) % n;
    usedSlots.add(slot);
    reserved.set(slot, spec[k]);
  }

  // Fill the rest with the backbone, always the most-plentiful type ≠ last.
  const out: Question[] = [];
  let last = "";
  for (let i = 0; i < n; i++) {
    const r = reserved.get(i);
    if (r) {
      out.push(r);
      last = r.type;
      continue;
    }
    const avail = Object.keys(backbone).filter((t) => backbone[t].length > 0);
    let pick: string | null = null;
    for (const t of shuffle(avail)) {
      if (t === last) continue;
      if (pick === null || backbone[t].length > backbone[pick].length) pick = t;
    }
    if (pick === null) pick = avail[0] ?? null;
    if (!pick) continue;
    out.push(backbone[pick].shift()!);
    last = pick;
  }
  return out;
}

/**
 * Pick `count` question ids for a round. Beyond "distinct & random", the round:
 *
 * - TYPE VARIETY: a coverage pass takes one of every available type
 *   (mc/tf/graph/slider/order) first, so none is ever missing. The rest is
 *   filled — mc/tf stay the backbone since the bank holds more of them, while
 *   the interactive/visual types are capped low so they stay a sprinkle.
 * - TIER SPREAD: every pick chooses the least-used tier so far, so a "mixed"
 *   round stays balanced across rookie/pro/practitioner instead of clustering.
 * - NO CLUSTERING: the final order spaces types out so the same type doesn't
 *   play back-to-back when the mix allows it (guaranteed by a per-type cap).
 *
 * Every call reshuffles, so consecutive games differ; ids are always distinct.
 */
export function pickQuestionIds(
  count: number,
  difficulty: Difficulty = "mixed",
): string[] {
  if (count <= 0) return [];
  const eligible =
    difficulty === "mixed"
      ? QUESTION_BANK
      : QUESTION_BANK.filter((q) => q.tier === difficulty);
  if (eligible.length === 0) return [];
  const n = Math.min(count, eligible.length);

  // Group by type; shuffle each so ties resolve randomly.
  const groups: Record<string, Question[]> = {};
  for (const q of eligible) (groups[q.type] ??= []).push(q);
  for (const t of Object.keys(groups)) groups[t] = shuffle(groups[t]);

  // Per-type caps: backbone (mc/tf) may fill up to half (keeps a clustering-free
  // order achievable); the special types stay a light sprinkle.
  const backboneCap = Math.max(1, Math.ceil(n / 2));
  const specialCap = Math.max(1, Math.round(n / 10));
  const capFor = (type: string) =>
    SPECIAL_TYPES.has(type) ? specialCap : backboneCap;

  const picked: Question[] = [];
  const used = new Set<string>();
  const typeCount: Record<string, number> = {};
  const tierCount: Record<string, number> = {};
  const take = (q: Question) => {
    picked.push(q);
    used.add(q.id);
    typeCount[q.type] = (typeCount[q.type] ?? 0) + 1;
    tierCount[q.tier] = (tierCount[q.tier] ?? 0) + 1;
  };
  // Of the candidates, choose one in the currently least-represented tier (so
  // tiers stay balanced); the pre-shuffle makes ties random.
  const pickLeastTier = (cands: Question[]): Question | undefined => {
    let best: Question | undefined;
    let min = Infinity;
    for (const q of cands) {
      const tc = tierCount[q.tier] ?? 0;
      if (tc < min) {
        min = tc;
        best = q;
      }
    }
    return best;
  };

  // Coverage: one of every available type, tier-balanced.
  for (const t of shuffle(Object.keys(groups))) {
    if (picked.length >= n) break;
    const q = pickLeastTier(groups[t].filter((x) => !used.has(x.id)));
    if (q) take(q);
  }

  // Fill: honor the per-type caps, keeping the mc/tf backbone balanced (fewest
  // of its type first) so the final order can be fully back-to-back-free; tier
  // is the tie-breaker so a mixed round stays tier-balanced.
  while (picked.length < n) {
    let cands = eligible.filter(
      (q) => !used.has(q.id) && (typeCount[q.type] ?? 0) < capFor(q.type),
    );
    if (cands.length === 0) cands = eligible.filter((q) => !used.has(q.id));
    if (cands.length === 0) break;
    let best: Question | null = null;
    for (const q of shuffle(cands)) {
      const qt = typeCount[q.type] ?? 0;
      const bt = best ? typeCount[best.type] ?? 0 : Infinity;
      if (
        best === null ||
        qt < bt ||
        (qt === bt && (tierCount[q.tier] ?? 0) < (tierCount[best.tier] ?? 0))
      ) {
        best = q;
      }
    }
    if (!best) break;
    take(best);
  }

  return spaceOutTypes(picked).map((q) => q.id);
}
