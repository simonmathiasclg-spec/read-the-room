/**
 * A player's avatar = one of the 17 PI Reference Profile icons
 * (public/profiles/<Name>.png) used INTACT as the head, on a slim customizable
 * character body: body color, outfit, and a hat/accessory. Emotes (wave,
 * celebrate…) are transient actions, not part of the saved look.
 *
 * The official PI icons are never recolored — all customization lives on the
 * body/accessories. When two players pick the same profile, each duplicate
 * defaults to a different BODY COLOR so they stay distinct (assignVariants /
 * defaultColorKey); the name is always shown beneath.
 *
 * Storage note: packs onto the existing validated shape {animal,color,accessory,
 * accent} at the DB boundary — animal=profile · color=bodyColor ·
 * accessory=outfit · accent=hat index — so no Firebase-rules change is needed
 * for the saved look. (Emote broadcast uses a separate transient field.)
 */

export type Character = {
  profile: string; // one of PROFILES — the head icon (never altered)
  bodyColor: string; // a BODY_COLORS key, or "auto" for roster-distinct default
  outfit: string; // an OUTFITS key
  hat: string; // a HATS key (sits above the head)
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

// ---- Body colors --------------------------------------------------------
export type BodyColor = { key: string; name: string; base: string; deep: string };

export const BODY_COLORS: BodyColor[] = [
  { key: "red", name: "Red", base: "#ED1C24", deep: "#A50F15" },
  { key: "cobalt", name: "Cobalt", base: "#2D5BA8", deep: "#1E3E73" },
  { key: "gold", name: "Gold", base: "#F5A800", deep: "#BD8200" },
  { key: "violet", name: "Violet", base: "#7C3AED", deep: "#5B21B6" },
  { key: "green", name: "Green", base: "#1FA463", deep: "#147A48" },
  { key: "pink", name: "Pink", base: "#EC4899", deep: "#BE2A6E" },
  { key: "sky", name: "Sky", base: "#38BDF8", deep: "#1E90C9" },
  { key: "orange", name: "Orange", base: "#F97316", deep: "#C2540E" },
  { key: "teal", name: "Teal", base: "#14B8A6", deep: "#0E8074" },
  { key: "indigo", name: "Indigo", base: "#4F46E5", deep: "#3730A3" },
  { key: "lime", name: "Lime", base: "#84CC16", deep: "#5E930F" },
  { key: "slate", name: "Slate", base: "#64748B", deep: "#43505F" },
];

const BODY_COLOR_MAP: Record<string, BodyColor> = Object.fromEntries(
  BODY_COLORS.map((c) => [c.key, c]),
);

export function bodyColorOf(key: string): BodyColor {
  return BODY_COLOR_MAP[key] ?? BODY_COLORS[0];
}

// ---- Outfits + hats -----------------------------------------------------
// Option keys + labels live here (the model); their SVG art lives in Avatar.

export const OUTFITS = [
  "casual",
  "suit",
  "gym",
  "hoodie",
  "dress",
  "hivis",
  "varsity",
  "overalls",
] as const;
export const OUTFIT_LABELS: Record<string, string> = {
  casual: "Casual",
  suit: "Suit",
  gym: "Gym",
  hoodie: "Hoodie",
  dress: "Dress",
  hivis: "Hi-vis",
  varsity: "Varsity",
  overalls: "Overalls",
};

export const HATS = [
  "none",
  "cap",
  "tophat",
  "bow",
  "crown",
  "beanie",
  "party",
  "headband",
  "grad",
  "flower",
] as const;
export const HAT_LABELS: Record<string, string> = {
  none: "None",
  cap: "Cap",
  tophat: "Top hat",
  bow: "Bow",
  crown: "Crown",
  beanie: "Beanie",
  party: "Party",
  headband: "Headband",
  grad: "Grad",
  flower: "Flower",
};

// ---- Emotes (transient actions, not saved on the character) -------------
export type Emote = { key: string; label: string; emoji: string };
export const EMOTES: Emote[] = [
  { key: "wave", label: "Wave", emoji: "👋" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉" },
  { key: "laugh", label: "Laugh", emoji: "😂" },
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "cool", label: "Cool", emoji: "😎" },
  { key: "mindblown", label: "Whoa", emoji: "🤯" },
];
export const EMOTE_MAP: Record<string, Emote> = Object.fromEntries(
  EMOTES.map((e) => [e.key, e]),
);

// ---- Auto-distinctness (body color) ------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Default body-color key for a profile's Nth duplicate (variant index). */
export function defaultColorKey(profile: string, variant: number): string {
  const i = (hash(profile) + Math.max(0, variant)) % BODY_COLORS.length;
  return BODY_COLORS[i].key;
}

/** The body color a character actually renders with: an explicit pick wins;
 *  otherwise the auto-distinct default for its variant. */
export function resolveBodyColor(c: Character, variant = 0): BodyColor {
  if (c.bodyColor && c.bodyColor !== "auto" && BODY_COLOR_MAP[c.bodyColor]) {
    return BODY_COLOR_MAP[c.bodyColor];
  }
  return bodyColorOf(defaultColorKey(c.profile, variant));
}

type Rosterish = { id: string; joinedAt: number; character?: Character };

/** Assign each player a variant index (Nth same-profile "auto"-color player). */
export function assignVariants(players: Rosterish[]): Record<string, number> {
  const next: Record<string, number> = {};
  const map: Record<string, number> = {};
  const ordered = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  for (const p of ordered) {
    const c = characterFor(p);
    if (c.bodyColor && c.bodyColor !== "auto") {
      map[p.id] = 0;
      continue;
    }
    const idx = next[c.profile] ?? 0;
    map[p.id] = idx;
    next[c.profile] = idx + 1;
  }
  return map;
}

export function variantFor(players: Rosterish[], playerId: string): number {
  return assignVariants(players)[playerId] ?? 0;
}

// ---- Defaults -----------------------------------------------------------

export function makeDefaultCharacter(id: string): Character {
  const h = hash(id);
  return {
    profile: PROFILES[h % PROFILES.length],
    bodyColor: "auto",
    outfit: "casual",
    hat: "none",
  };
}

export function characterFor(player: {
  id: string;
  character?: Character;
}): Character {
  const def = makeDefaultCharacter(player.id);
  const c = player.character;
  if (!c || !PROFILES.includes(c.profile as (typeof PROFILES)[number])) return def;
  return {
    profile: c.profile,
    bodyColor: c.bodyColor || "auto",
    outfit: OUTFITS.includes(c.outfit as (typeof OUTFITS)[number])
      ? c.outfit
      : "casual",
    hat: HATS.includes(c.hat as (typeof HATS)[number]) ? c.hat : "none",
  };
}

// ---- Storage adapter (packed onto the existing validated shape) ---------

export type StoredCharacter = {
  animal: string; // = profile
  color: string; // = bodyColor key
  accessory: string; // = outfit key
  accent: number; // = hat index
};

export function serializeCharacter(c: Character): StoredCharacter {
  const hatIdx = Math.max(0, HATS.indexOf(c.hat as (typeof HATS)[number]));
  // Hat index rides in the single numeric `accent` slot (no rules change).
  return {
    animal: c.profile,
    color: (c.bodyColor || "auto").slice(0, 16),
    accessory: (c.outfit || "casual").slice(0, 16),
    accent: Math.min(360, hatIdx),
  };
}

export function deserializeCharacter(
  raw: StoredCharacter | undefined | null,
): Character | undefined {
  if (!raw) return undefined;
  const bodyColor =
    raw.color && (raw.color === "auto" || BODY_COLOR_MAP[raw.color])
      ? raw.color
      : "auto";
  const outfit = OUTFITS.includes(raw.accessory as (typeof OUTFITS)[number])
    ? raw.accessory
    : "casual";
  const accent = raw.accent ?? 0;
  return {
    profile: raw.animal ?? "",
    bodyColor,
    outfit,
    // Legacy rows packed body-type into the high bits; mask to the hat index.
    hat: HATS[accent % 16] ?? "none",
  };
}
