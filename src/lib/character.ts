/**
 * A player's avatar = one of the 17 PI Reference Profiles (an icon in
 * public/profiles/<Name>.png) plus an optional goofy accessory. When two
 * players pick the same profile, each duplicate is auto-tinted a different hue
 * so they stay visually distinct (see assignTints / tintFilter).
 *
 * Storage note: to avoid a Firebase-rules change, this maps onto the existing
 * validated character shape {animal,color,accessory,accent} at the DB boundary
 * (serializeCharacter / deserializeCharacter) — `animal` carries the profile.
 */

export type Character = {
  profile: string; // one of PROFILES
  accessory: string; // one of ACCESSORIES
};

/** The 17 official PI Reference Profiles (match the filenames in public/profiles). */
export const PROFILES = [
  "Analyzer",
  "Controller",
  "Venturer",
  "Specialist",
  "Strategist",
  "Scholar",
  "Individualist",
  "Persuader",
  "Promoter",
  "Maverick",
  "Captain",
  "Collaborator",
  "Altruist",
  "Guardian",
  "Operator",
  "Artisan",
  "Adapter",
] as const;

export function profileSrc(profile: string): string {
  return `/profiles/${profile}.png`;
}

// ---- Accessories (goofy overlays on top of the icon) --------------------
export const ACCESSORIES = [
  "none",
  "hat",
  "arms",
  "shades",
  "crown",
  "bow",
] as const;
export const ACCESSORY_LABELS: Record<string, string> = {
  none: "None",
  hat: "Hat",
  arms: "Flex",
  shades: "Shades",
  crown: "Crown",
  bow: "Bow",
};

/** Emoji parts per accessory, positioned as % of the avatar box (x,y = center),
 *  `s` = emoji size as a fraction of the avatar size. Consumed by ProfileAvatar. */
export const ACCESSORY_PARTS: Record<
  string,
  { e: string; x: number; y: number; s: number; flip?: boolean }[]
> = {
  none: [],
  hat: [{ e: "🎩", x: 50, y: -4, s: 0.5 }],
  crown: [{ e: "👑", x: 50, y: -2, s: 0.52 }],
  shades: [{ e: "🕶️", x: 50, y: 44, s: 0.5 }],
  bow: [{ e: "🎀", x: 50, y: 4, s: 0.42 }],
  arms: [
    { e: "💪", x: -6, y: 60, s: 0.44 },
    { e: "💪", x: 106, y: 60, s: 0.44, flip: true },
  ],
};

// ---- Duplicate distinctness (auto hue tint) -----------------------------

/** CSS filter that recolors a duplicate's icon. Index 0 = original. */
const TINT_FILTERS = [
  "none",
  "hue-rotate(150deg) saturate(1.2)", // → red/orange
  "hue-rotate(268deg) saturate(1.15)", // → green
  "hue-rotate(112deg) saturate(1.25)", // → magenta/pink
  "hue-rotate(320deg) saturate(1.2)", // → teal
  "hue-rotate(210deg) saturate(1.15)", // → purple
  "hue-rotate(60deg) saturate(1.2)", // → deep blue/indigo
];

export function tintFilter(index: number): string {
  if (index <= 0) return "none";
  return (
    TINT_FILTERS[index] ??
    `hue-rotate(${(index * 137) % 360}deg) saturate(1.15)`
  );
}

/** A representative accent color for a tint (for the name chip / ring). */
export function tintAccent(index: number): string {
  const hues = [205, 355, 118, 322, 178, 262, 45];
  const hue = hues[index] ?? (index * 137) % 360;
  return `hsl(${hue} 70% 55%)`;
}

type Rosterish = { id: string; joinedAt: number; character?: Character };

/**
 * Assign each player a tint index: the Nth (join-ordered) player to pick a
 * given profile gets tint N. So the first Maverick is original, the second is
 * tinted, etc. Returns a map playerId → tint index.
 */
export function assignTints(players: Rosterish[]): Record<string, number> {
  const next: Record<string, number> = {};
  const map: Record<string, number> = {};
  const ordered = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  for (const p of ordered) {
    const key = characterFor(p).profile;
    const idx = next[key] ?? 0;
    map[p.id] = idx;
    next[key] = idx + 1;
  }
  return map;
}

/** Convenience: the tint index for one player within a roster. */
export function tintFor(players: Rosterish[], playerId: string): number {
  return assignTints(players)[playerId] ?? 0;
}

// ---- Defaults + storage adapter -----------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic starter profile from a player id (stable + spread out). */
export function makeDefaultCharacter(id: string): Character {
  const h = hash(id);
  return { profile: PROFILES[h % PROFILES.length], accessory: "none" };
}

/** A character for any player, falling back to a deterministic default. */
export function characterFor(player: {
  id: string;
  character?: Character;
}): Character {
  const c = player.character;
  if (c && PROFILES.includes(c.profile as (typeof PROFILES)[number])) return c;
  return makeDefaultCharacter(player.id);
}

/** Stored (Firebase) character shape — kept for the existing security rules. */
export type StoredCharacter = {
  animal: string;
  color: string;
  accessory: string;
  accent: number;
};

export function serializeCharacter(c: Character): StoredCharacter {
  return {
    animal: c.profile, // profile name (≤ 16 chars, rule-valid)
    color: "profile", // vestigial, kept valid for the rules
    accessory: c.accessory || "none",
    accent: 0,
  };
}

export function deserializeCharacter(
  raw: StoredCharacter | undefined | null,
): Character | undefined {
  if (!raw) return undefined;
  return { profile: raw.animal ?? "", accessory: raw.accessory ?? "none" };
}
