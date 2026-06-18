# CLAUDE.md — Read the Room

This file is auto-read by Claude Code. It is the source of truth for this project.
Read `read-the-room-build-brief.md` for full detail and use `read-the-room-question-bank.json` for content.

## What we're building
A live, Kahoot-style Predictive Index (PI) trivia game for Predictive Success workshops.
Players join on phones with a 4-digit PIN; questions + leaderboard show on a shared "big screen."
Must work on **phone and laptop**.

## Stack (don't change without asking)
- Next.js (App Router) + Tailwind CSS
- Firebase Realtime Database for live room state
- Deploy to Vercel
- No user accounts — players join with PIN + name only

## Working rules
- **Use Context7** for Next.js, Firebase, and Tailwind APIs so code matches current versions.
- **Use Playwright** to open the running app, screenshot it, and self-critique the UI before saying a screen is done. Always check both the phone (≤430px wide) and laptop layouts.
- Build in the order in section "Build order" below. Get a deployable, playable core loop live FIRST. Do not let the character builder block the quiz.
- Never put secrets in the repo. Firebase keys go in `.env.local` (and Vercel env vars). Add `.env.local` to `.gitignore`.
- Questions have a `type` (see "Question types & rounds"). Render per type. Load them from the JSON bank.

## Brand — Predictive Success
Colors approximated from the logo; confirm exact values against the brand guide.

```css
--psc-red:   #ED1C24; /* logo mark — primary accent */
--psc-gold:  #F5A800; /* underline — secondary accent */
--psc-black: #111111; /* wordmark / text */
--psc-paper: #FFFFFF; /* background */
/* neutral ramp from the four logo squares */
--psc-gray-1: #B3B3B3;
--psc-gray-2: #6E6E6E;
--psc-gray-3: #3A3A3A;
--psc-gray-4: #000000;
```

**Chrome stays on-brand:** white/black backgrounds, gray neutrals, red + gold accents.
Clean, confident, a little playful — not a generic dashboard.

**Answer tiles need 4 distinct, accessible colors.** Use brand red and gold for two, and add a
green and a blue for the other two so the grid is readable and color-blind-safe (always pair
color with a shape):
```css
--tile-a: #ED1C24; /* red    · triangle */
--tile-b: #F5A800; /* gold   · diamond  */
--tile-c: #1FA463; /* green  · circle   */
--tile-d: #2D5BA8; /* blue   · square   */
```

## Kahoot behavior (match closely)
- Four answer options in a 2×2 grid, each a big solid block with a distinct **color AND shape**.
- **Big screen:** large question text on top, the 2×2 tiles, a countdown, and an "X/N answered"
  counter. On reveal: dim wrong tiles, outline the correct one, then show the scoreboard (top 5
  with movement) before the next question.
- **Phone (in-person mode):** show ONLY the four colored shape buttons — no question text; players
  look up at the big screen. **Online mode:** also show the question text on the phone (toggle).
- After answering, the phone flashes green "Correct +<points>" or red, then shows rank + streak.
- **Scoring:** correct = `500 + 500 * (timeLeft / totalTime)`, rounded; wrong = 0; streak bonus
  +100 per consecutive correct beyond the first. The leaderboard reshuffles visibly between rounds.
- ~20s per question (configurable). End the game on a 1st/2nd/3rd podium.

## Question types & rounds
Every question has a `type`. Build the question engine to read `type` and render the right UI,
so new types can be added later without a rewrite. Support these now:
- `mc` — multiple choice, 4 options, one correct. The default 2×2 colored tile grid.
- `tf` — true/false. Render as two big tiles (True / False).
- `slider` — interactive "build the graph": the player drags one or more factor sliders on a
  low↔high continuum (e.g., "place this profile's A, B, C, D"). Score by closeness to a target
  value — the closer, the more points. Works well on phones and teaches the real PI pattern.
- (Leave room for `order`/rank and `match` later.)

**Round config — the host sets this before each round:**
- Number of questions (e.g., 10 / 20 / custom).
- Tier filter: rookie / pro / practitioner / mix.
- Optional type mix: all MC, or mixed types.
- **Auto-shuffle** the question order AND the answer-option order every round.

Scoring stays consistent: speed + correctness for `mc`/`tf`; closeness-to-target for `slider`;
streak bonus applies across all types.

## Characters
Pixel-art animals the player customizes (pick critter → recolor → one goofy accessory; 3 taps).
Cosmetic only for v1. Start from a CC0 pixel pack (e.g., Kenney.nl) so it's playable today; swap
in custom sprites later. Do not block the quiz on this.

## Build order
1. Scaffold + Firebase + Vercel deploy of a "hello room": host creates PIN, player joins, both see
   the live player list. (Proves realtime works.)
2. Question loop: host advances questions; phones show shape buttons; answers write to the DB.
3. Scoring + live leaderboard between questions.
4. Podium screen.
5. Ship/test this — it's a complete game.
6. Then: brand polish (use the colors above + Playwright review), the extra question types
   (`tf`, `slider`) and host round-config (count + tier + shuffle), the character builder,
   animations, and the online-mode toggle.
