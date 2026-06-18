# Read the Room — Build Brief (for Claude Code)

A live, Kahoot-style PI trivia game for Predictive Success workshops. Players join on
their phones with a PIN; questions and the leaderboard show on a shared "big screen."
Works on phone **and** laptop. This brief is the source of truth for the build.

---

## 0. Why Claude Code (and the realistic EOD target)

A live game where phones join needs a backend + a public URL. Claude Code can scaffold
the project, run it locally, and deploy it to a live link. Today's realistic goal is the
**core loop live on real phones**: join by PIN → answer colored questions → see the
leaderboard → podium. Characters and polish come right after — don't let the avatar
system block the first playable.

**Kickoff prompt to paste into Claude Code:**

> Build a Kahoot-style live quiz web app called "Read the Room." Stack: Next.js (App
> Router) + Tailwind, Firebase Realtime Database for room state, deployed to Vercel.
> Two views: a host "big screen" and a player "phone" view. A host creates a room and
> gets a 4-digit PIN; players join the PIN, pick a name + character, and answer timed
> multiple-choice questions. Score on speed + correctness, show a live leaderboard
> between questions, end on a podium. Load questions from `question-bank.json` (schema
> below). Build the join → answer → leaderboard → podium loop FIRST and get it deployed,
> then layer in the character builder and animations. Mobile-first, also clean on laptop.

---

## 1. Stack (lean, fast to ship)

- **Framework:** Next.js + Tailwind (one repo, host and player are just two routes).
- **Realtime/backend:** Firebase Realtime Database (simplest for room state). Supabase
  Realtime is a fine alternative if you prefer Postgres.
- **Hosting:** Vercel (free, gives an instant public URL phones can hit).
- **No login.** Players just need a PIN + a name. Keep friction at zero.

### Data model (Realtime DB)
```
rooms/{PIN}/
  status: "lobby" | "question" | "reveal" | "podium"
  questionIndex: 0
  questionStartedAt: <server timestamp>
  players/{playerId}/ { name, character, score, streak }
  answers/{questionIndex}/{playerId}/ { choice, answeredAt }
```
Host writes `status`, `questionIndex`, `questionStartedAt`. Players write their own
`players/*` and `answers/*`. Scoring can be computed client-side on the host and written
back, or derived live — host-authoritative is simplest.

---

## 2. The Kahoot look & behavior (copy this closely)

The whole point is the familiar Kahoot feel. Match these specifics.

### Answer tiles — the signature
- Always **four** options in a **2×2 grid**, each a solid block with a **distinct color
  AND a distinct shape** (color alone fails for color-blind players — the shape is why
  Kahoot pairs them):
  - **Red / triangle**, **Blue or Yellow / diamond**, **Yellow / circle**, **Green / square**.
  - For our PI tie-in, use the four factor colors so the palette quietly teaches the
    A/B/C/D color language: A = red, B = yellow, C = green, D = purple/blue. Keep the
    shapes on top.
- Tiles are big, chunky, full-bleed, high-contrast, with a slight pressed-down shadow.

### Big screen (host / projector / laptop)
- Question text **large** at the top. Optional image slot under it.
- 2×2 colored answer tiles below.
- A countdown (ring or bar) and a live "X / N answered" counter.
- On reveal: dim the wrong tiles, outline the correct one, show a quick bar chart of how
  many picked each, then cut to the **scoreboard** (top 5, with movement) before the next
  question.

### Phone (player)
- **In-person mode:** the phone shows ONLY the four colored shape buttons — no question
  text. Players look up at the big screen. This is the core Kahoot social mechanic.
- **Online/remote mode:** also show the question text on the phone (toggle), since there's
  no shared screen on a video call.
- After answering: full-screen color flash — green "Correct +842" or red "Too bad" — then
  their **rank and streak** ("You're 3rd · 🔥 2 in a row"). Then "Look up!" / waiting state.

### Scoring (match Kahoot)
- Correct answer base + speed bonus: faster = more. Suggested: `500 + 500 * (timeLeft / totalTime)`,
  rounded. Wrong = 0.
- **Streak bonus:** +100 per consecutive correct beyond the first.
- Leaderboard reshuffles visibly between questions — that movement is the fun.

### Timing
- ~20s per question (make it configurable per question/round).
- Brief "question only, no answers yet" beat on the big screen before tiles appear (1–2s),
  like Kahoot, so the room reads the question first.

### Quality floor
- Mobile-first; big tap targets; works landscape on a laptop.
- Visible keyboard focus, respects reduced-motion.
- Late joiners can still hop in at the lobby; dropped phones reconnect to their player id.

---

## 3. Characters — recommendation

Drop the emoji. Recommended direction (fun + fast + cohesive + scales to phone and laptop):

**Pixel-art animals you customize.** A curated set of ~16–24 chunky pixel critters (fox,
owl, octopus, axolotl, frog, capybara, etc.), each recolorable, plus a small layer of
goofy accessories (hat, shades, party horn). This reads as "make your own goofy guy,"
looks charming at any size as crisp pixels, and is far less art-work than a full
parts-based human builder.

**How to get the art fast:**
- Use a CC0 pixel asset pack to start (e.g., Kenney.nl animal/character packs are free for
  commercial use) so you're playable today, then commission/generate a custom set later.
- Render as small PNG/SVG sprites; recolor via CSS `filter`/palette swap so one sprite
  gives many variants.

**Onboarding flow:** pick critter → pick color → pick one accessory → done (3 taps).
Keep the avatar purely cosmetic for v1. Later, the end-of-game "play-style reveal" can
map the player to a PI Reference Profile mascot for a fun payoff — but that's a stretch
goal, not EOD.

(If pixel doesn't land, the fast fallbacks are: a Bitmoji-ish flat vector critter set, or
generated sticker-style mascots. Pixel is the recommendation because it stays sharp tiny,
looks intentionally goofy, and is the cheapest to make cohesive.)

---

## 4. Question bank

Use `read-the-room-question-bank.json` (shipped alongside this brief). 50 questions built
from the People Data Toolkit, tagged by tier and topic.

**Schema (per question):**
```json
{ "id": "r01", "tier": "rookie", "topic": "Factor A",
  "q": "…", "options": ["…","…","…","…"], "answer": 1, "teach": "…" }
```
- `tier`: `rookie` (the four factors, behaviors, needs), `pro` (factor combinations +
  common profiles), `practitioner` (interpretation: Factor E/M, Self/Self-Concept/Synthesis,
  readback, the Cognitive Assessment).
- `answer` is the index (0–3) of the correct option.
- `teach` is the one-line explainer shown on reveal — this is what turns trivia into a
  lesson; show it on both the big screen and the phone.
- Always keep exactly **4 options** so the 2×2 color grid always works.

**Round building:** a "round" is just a filter — e.g., 8 random `rookie` questions, or a
mixed 10 across tiers. Let the host pick tier + count, or use presets ("New-Hire Intro",
"Team Refresher", "Practitioner Challenge"). Easy to extend the bank by appending more
objects in the same schema.

---

## 5. Build order (so something is live today)

1. Repo + Firebase + Vercel deploy of a "hello room" (host creates PIN, player joins, both
   see the player list update live). This proves the realtime plumbing.
2. Question loop: host advances questions; phones show shape buttons; answers write to DB.
3. Scoring + leaderboard between questions.
4. Podium screen.
5. **Ship/test this** — it's a complete, fun game.
6. Then: character builder, teach-moment styling, animations, host presets, online-mode
   toggle, play-style reveal.
