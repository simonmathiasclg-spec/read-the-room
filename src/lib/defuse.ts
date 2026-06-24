/**
 * "Defuse the Pattern" — the cooperative team-building mode.
 *
 * Reuses the existing room model (PIN, players, critters, the lobby→question→
 * reveal→podium status machine). The genuinely new parts live here:
 *  - role assignment: each scenario splits its clue cards and option cards
 *    across the pod's phones, so every phone shows ONLY its own card;
 *  - the single-pod lock-in + resolve (no per-player scoring at all).
 *
 * Scenario content is bundled (src/data/defuse-scenarios.json) exactly like the
 * quiz bank, so which option is "correct" never has to live in the database —
 * the host resolves a lock-in against the local bank. The DB only stores the
 * role split and the pod's one locked-in option.
 */
import { onValue, ref, serverTimestamp, set, update } from "firebase/database";
import { getDb } from "./firebase";
import scenarioData from "@/data/defuse-scenarios.json";

export type DefuseDifficulty = "gimme" | "standard" | "tricky";

export type DefuseClue = { plain: string; term: string };
export type DefuseOption = { text: string; correct: boolean };

export type DefuseScenario = {
  id: string;
  difficulty: DefuseDifficulty;
  setting: string;
  situation: string;
  clues: DefuseClue[];
  options: DefuseOption[];
  whyCorrect: string;
  whyWrongCommon: string;
  facilitatorPrompt?: string;
};

export const SCENARIOS = (scenarioData.scenarios as DefuseScenario[]) ?? [];

const BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));

export function scenarioById(id: string): DefuseScenario | undefined {
  return BY_ID.get(id);
}

/** The gimme that always opens a session (the pod wins it and learns the loop). */
const GIMME_ID = "s01";

const DIFF_RANK: Record<DefuseDifficulty, number> = {
  gimme: 0,
  standard: 1,
  tricky: 2,
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick the scenario order for a session.
 * - `s01` (the gimme) is ALWAYS first, by design.
 * - The rest are drawn at random, then ordered easy→hard so difficulty ramps.
 * Capped at what the bank holds.
 */
export function pickScenarioIds(count: number): string[] {
  const first = scenarioById(GIMME_ID) ?? SCENARIOS[0];
  if (!first) return [];
  const rest = shuffle(SCENARIOS.filter((s) => s.id !== first.id))
    .slice(0, Math.max(0, count - 1))
    .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
  return [first.id, ...rest.map((s) => s.id)];
}

// ---- Role assignment ----------------------------------------------------

/** A single phone's job for one scenario. Empty arrays = a floater/observer. */
export type DefuseRole = {
  lead: boolean;
  clues: number[]; // indices into scenario.clues this phone must describe
  options: number[]; // indices into scenario.options this phone holds
};

export type RoleMap = Record<string, DefuseRole>;

/**
 * Split a scenario's clues + options across the pod so each phone holds only
 * its own piece. Players are shuffled every scenario so roles rotate.
 *
 * Options are dealt first (round-robin), so every option lands on a distinct
 * player whenever the pod is at least as big as the option count; clues follow
 * in the same rotation. One player is flagged Lead to anchor the conversation.
 * If the pod is smaller than clues+options, a player simply holds two cards;
 * if it's larger, the extras are floaters (lead/observer).
 */
export function assignRoles(
  playerIds: string[],
  scenario: DefuseScenario,
): RoleMap {
  const order = shuffle(playerIds);
  const roles: RoleMap = {};
  for (const id of order) roles[id] = { lead: false, clues: [], options: [] };

  const P = order.length;
  if (P === 0) return roles;

  const O = scenario.options.length;
  const C = scenario.clues.length;
  for (let j = 0; j < O; j++) roles[order[j % P]].options.push(j);
  for (let k = 0; k < C; k++) roles[order[(O + k) % P]].clues.push(k);

  // Lead falls on the first floater when the pod is bigger than the deck,
  // otherwise on a card-holder (additive — the Lead may also hold a card).
  roles[order[(O + C) % P]].lead = true;
  return roles;
}

// ---- Lock-in shape ------------------------------------------------------

export type Lockin = { option: number; by: string; at?: number };

// ---- Host: drive the session -------------------------------------------

/**
 * Host opens the session: fixes the scenario order, assigns roles for the
 * first scenario, and flips the room to "question". Mirrors the quiz's
 * startGame but writes a role split instead of a question list of answers.
 */
export async function startDefuse(
  pin: string,
  scenarioIds: string[],
  playerIds: string[],
): Promise<void> {
  const first = scenarioById(scenarioIds[0]);
  const roles = first ? assignRoles(playerIds, first) : {};
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "question",
    questionIndex: 0,
    questionIds: scenarioIds,
    questionStartedAt: serverTimestamp(),
    [`roles/0`]: roles,
  });
}

/** Host advances to the next scenario, dealing a fresh role split. */
export async function nextScenario(
  pin: string,
  nextIndex: number,
  scenarioId: string,
  playerIds: string[],
): Promise<void> {
  const scenario = scenarioById(scenarioId);
  const roles = scenario ? assignRoles(playerIds, scenario) : {};
  await update(ref(getDb(), `rooms/${pin}`), {
    status: "question",
    questionIndex: nextIndex,
    questionStartedAt: serverTimestamp(),
    [`roles/${nextIndex}`]: roles,
  });
}

/** Host reveals the resolution (lock-in landed, or time ran out). No scoring. */
export async function revealDefuse(pin: string): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), { status: "reveal" });
}

/** Host ends the session → shared summary. */
export async function endDefuse(pin: string): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), { status: "podium" });
}

// ---- Player: lock in the pod's one answer ------------------------------

/** An option-holder commits the pod's agreed answer (one submission per pod). */
export async function lockIn(
  pin: string,
  scenarioIndex: number,
  playerId: string,
  optionIndex: number,
): Promise<void> {
  await set(ref(getDb(), `rooms/${pin}/lockins/${scenarioIndex}`), {
    option: optionIndex,
    by: playerId,
    at: serverTimestamp(),
  });
}

// ---- Subscriptions ------------------------------------------------------

/** A phone watches for its own role on the current scenario. */
export function subscribeRole(
  pin: string,
  scenarioIndex: number,
  playerId: string,
  onChange: (role: DefuseRole | null) => void,
): () => void {
  const roleRef = ref(getDb(), `rooms/${pin}/roles/${scenarioIndex}/${playerId}`);
  return onValue(roleRef, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const v = snap.val() as Partial<DefuseRole>;
    onChange({
      lead: !!v.lead,
      clues: v.clues ? Object.values(v.clues) : [],
      options: v.options ? Object.values(v.options) : [],
    });
  });
}

/** Everyone (host + phones) watches the current scenario's lock-in. */
export function subscribeLockin(
  pin: string,
  scenarioIndex: number,
  onChange: (lockin: Lockin | null) => void,
): () => void {
  const lockRef = ref(getDb(), `rooms/${pin}/lockins/${scenarioIndex}`);
  return onValue(lockRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as Lockin) : null);
  });
}

/** The host watches the lead assignment for the current scenario (for the crown). */
export function subscribeRoles(
  pin: string,
  scenarioIndex: number,
  onChange: (roles: RoleMap) => void,
): () => void {
  const rolesRef = ref(getDb(), `rooms/${pin}/roles/${scenarioIndex}`);
  return onValue(rolesRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as RoleMap) : {});
  });
}

/** All lock-ins so far, for the end-of-session "defused X of Y" summary. */
export function subscribeLockins(
  pin: string,
  onChange: (lockins: Record<string, Lockin>) => void,
): () => void {
  const lockRef = ref(getDb(), `rooms/${pin}/lockins`);
  return onValue(lockRef, (snap) => {
    onChange(snap.exists() ? (snap.val() as Record<string, Lockin>) : {});
  });
}

/**
 * Count how many scenarios the pod defused, given the session's scenario ids
 * and every lock-in. A scenario counts only if its locked option was correct.
 */
export function countDefused(
  scenarioIds: string[],
  lockins: Record<string, Lockin>,
): number {
  let defused = 0;
  scenarioIds.forEach((id, i) => {
    const lock = lockins[i];
    const scenario = scenarioById(id);
    if (lock && scenario && scenario.options[lock.option]?.correct) defused++;
  });
  return defused;
}
