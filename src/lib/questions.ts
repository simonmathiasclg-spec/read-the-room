import bank from "@/data/question-bank.json";

export type Tier = "rookie" | "pro" | "practitioner";

export type Question = {
  id: string;
  tier: Tier;
  topic: string;
  q: string;
  options: [string, string, string, string];
  answer: number; // 0–3, index of the correct option
  teach: string;
};

export const QUESTION_BANK = (bank.questions as Question[]) ?? [];

const BY_ID = new Map(QUESTION_BANK.map((q) => [q.id, q]));

export function questionById(id: string): Question | undefined {
  return BY_ID.get(id);
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
 * Pick `count` question ids for a round, filtered by difficulty.
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
