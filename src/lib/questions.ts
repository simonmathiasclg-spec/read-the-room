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

/**
 * Pick `count` random question ids for a round. A "round" is just a filter —
 * for the quiz mode we draw across all tiers. Capped at what the bank holds.
 */
export function pickQuestionIds(count: number): string[] {
  const pool = [...QUESTION_BANK];
  // Fisher–Yates shuffle (Math.random is fine in app runtime).
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map((q) => q.id);
}
