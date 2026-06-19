/**
 * Lightweight, generated pixel-critter sprites (no external assets).
 * A character = a chosen animal + body color + one accessory, plus an
 * auto-assigned accent hue derived from the player id that guarantees visual
 * distinctness (even two identical animals get a different halo + inner color).
 */

export type Character = {
  animal: string;
  color: string;
  accessory: string;
  accent: number; // hue 0–359, auto-assigned
};

export const COLORS: { id: string; base: string; dark: string; light: string }[] =
  [
    { id: "red", base: "#ED1C24", dark: "#B3141A", light: "#FF7A80" },
    { id: "gold", base: "#F5A800", dark: "#C0820A", light: "#FFD45E" },
    { id: "green", base: "#1FA463", dark: "#15794A", light: "#66D6A0" },
    { id: "blue", base: "#2D5BA8", dark: "#1E3F75", light: "#7AA0DC" },
    { id: "purple", base: "#8B3FE0", dark: "#6322B0", light: "#BE93F2" },
    { id: "pink", base: "#EC4899", dark: "#BE2D74", light: "#F7A6CC" },
  ];

export const ANIMALS = ["fox", "cat", "bear", "bunny", "frog", "owl"] as const;
export const ANIMAL_LABELS: Record<string, string> = {
  fox: "Fox",
  cat: "Cat",
  bear: "Bear",
  bunny: "Bunny",
  frog: "Frog",
  owl: "Owl",
};

export const ACCESSORIES = ["none", "hat", "shades", "bow"] as const;
export const ACCESSORY_LABELS: Record<string, string> = {
  none: "None",
  hat: "Hat",
  shades: "Shades",
  bow: "Bow",
};

// ---- Pixel grid (16×16) -------------------------------------------------
// Roles: 0 transparent · 1 body · 2 bodyDark · 3 bodyLight · 4 white ·
//        5 black · 6 accent · 7 nose
export const GRID = 16;

function setpx(g: number[], x: number, y: number, r: number) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi >= 0 && xi < GRID && yi >= 0 && yi < GRID) g[yi * GRID + xi] = r;
}

function disc(g: number[], cx: number, cy: number, rad: number, r: number) {
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rad * rad) g[y * GRID + x] = r;
    }
}

function ellipse(
  g: number[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  r: number,
) {
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y * GRID + x] = r;
    }
}

function rectFill(
  g: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setpx(g, x, y, r);
}

type Pt = [number, number];
function edge(px: number, py: number, a: Pt, b: Pt) {
  return (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]);
}
function tri(g: number[], a: Pt, b: Pt, c: Pt, r: number) {
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d1 = edge(px, py, a, b);
      const d2 = edge(px, py, b, c);
      const d3 = edge(px, py, c, a);
      const neg = d1 < 0 || d2 < 0 || d3 < 0;
      const pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) g[y * GRID + x] = r;
    }
}

function eye(g: number[], cx: number, cy: number, rad = 1.35) {
  disc(g, cx, cy, rad, 4);
  disc(g, cx + 0.25, cy + 0.15, rad * 0.52, 5);
}

/** Shared muzzle + side eyes + nose. */
function face(g: number[]) {
  disc(g, 8, 9, 5.2, 1);
  disc(g, 8, 11.3, 3.1, 3);
  eye(g, 5.9, 8.2);
  eye(g, 10.1, 8.2);
  disc(g, 8, 10.7, 0.8, 7);
}

const BUILDERS: Record<string, (g: number[]) => void> = {
  fox(g) {
    // big, wide-set pointy ears with a thin dark edge so they read on the head
    tri(g, [1.4, -0.2], [6.2, 1.2], [5.2, 5.6], 2);
    tri(g, [9.8, 1.2], [14.6, -0.2], [10.8, 5.6], 2);
    tri(g, [2.1, 0.4], [5.8, 1.6], [5.2, 5.2], 1);
    tri(g, [10.2, 1.6], [13.9, 0.4], [10.8, 5.2], 1);
    tri(g, [3.7, 2.6], [5.3, 3.1], [4.9, 4.7], 6);
    tri(g, [10.7, 3.1], [12.3, 2.6], [11.1, 4.7], 6);
    face(g);
  },
  cat(g) {
    // narrow, upright pointy ears, closer together
    tri(g, [3.4, 0.4], [6.1, 1.6], [5.4, 5], 2);
    tri(g, [9.9, 1.6], [12.6, 0.4], [10.6, 5], 2);
    tri(g, [3.9, 0.9], [5.8, 1.9], [5.4, 4.7], 1);
    tri(g, [10.2, 1.9], [12.1, 0.9], [10.6, 4.7], 1);
    tri(g, [4.6, 2.7], [5.5, 3.2], [5.2, 4.4], 6);
    tri(g, [10.5, 3.2], [11.4, 2.7], [10.8, 4.4], 6);
    face(g);
  },
  bear(g) {
    // big round ears
    disc(g, 4, 3, 2.3, 2);
    disc(g, 12, 3, 2.3, 2);
    disc(g, 4, 3, 1.9, 1);
    disc(g, 12, 3, 1.9, 1);
    disc(g, 4, 3.2, 0.95, 6);
    disc(g, 12, 3.2, 0.95, 6);
    face(g);
  },
  bunny(g) {
    ellipse(g, 5.6, 3, 1.4, 3.4, 1);
    ellipse(g, 10.4, 3, 1.4, 3.4, 1);
    ellipse(g, 5.6, 3, 0.65, 2.5, 6);
    ellipse(g, 10.4, 3, 0.65, 2.5, 6);
    face(g);
  },
  frog(g) {
    disc(g, 8, 10, 5.2, 1);
    disc(g, 8, 12, 3.1, 3);
    rectFill(g, 5, 12, 10, 12, 2);
    disc(g, 5, 5, 2, 1);
    disc(g, 11, 5, 2, 1);
    disc(g, 5, 5, 1.3, 4);
    disc(g, 11, 5, 1.3, 4);
    disc(g, 5, 4.9, 0.7, 5);
    disc(g, 11, 4.9, 0.7, 5);
  },
  owl(g) {
    tri(g, [3, 0.5], [5.6, 1.6], [4, 3.6], 1);
    tri(g, [10.4, 1.6], [13, 0.5], [12, 3.6], 1);
    disc(g, 8, 9, 5.4, 1);
    disc(g, 5.6, 8.5, 2, 4);
    disc(g, 10.4, 8.5, 2, 4);
    disc(g, 5.6, 8.5, 0.95, 5);
    disc(g, 10.4, 8.5, 0.95, 5);
    tri(g, [7, 10], [9, 10], [8, 12], 6);
  },
};

function applyAccessory(g: number[], accessory: string) {
  if (accessory === "hat") {
    tri(g, [8, 0], [4.5, 4], [11.5, 4], 6);
    rectFill(g, 4, 4, 11, 4, 2);
    setpx(g, 8, 0, 4);
  } else if (accessory === "shades") {
    rectFill(g, 3, 7, 12, 8, 5);
    setpx(g, 4, 7, 4);
    setpx(g, 11, 7, 4);
  } else if (accessory === "bow") {
    tri(g, [4.5, 1], [8, 3], [4.5, 5], 6);
    tri(g, [11.5, 1], [8, 3], [11.5, 5], 6);
    rectFill(g, 7, 3, 8, 4, 2);
  }
}

/** Build the 16×16 role grid for an animal + accessory. */
export function buildGrid(animal: string, accessory: string): number[] {
  const g = new Array(GRID * GRID).fill(0);
  (BUILDERS[animal] ?? BUILDERS.fox)(g);
  if (accessory && accessory !== "none") applyAccessory(g, accessory);
  return g;
}

// ---- Defaults / distinctness -------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic starter character from a player id (stable + distinct). */
export function makeDefaultCharacter(id: string): Character {
  const h = hash(id);
  return {
    animal: ANIMALS[h % ANIMALS.length],
    color: COLORS[(h >>> 5) % COLORS.length].id,
    accessory: "none",
    accent: (h >>> 11) % 360,
  };
}

/** A character for any player, falling back to a deterministic default. */
export function characterFor(player: {
  id: string;
  character?: Character;
}): Character {
  return player.character ?? makeDefaultCharacter(player.id);
}
