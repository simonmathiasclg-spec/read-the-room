# Claude Code Playbook — Read the Room

Keep this open beside your terminal. Work top to bottom. Paste the prompts one at a time and
let Claude Code finish (and deploy) each phase before moving on.

---

## STEP 1 — Accounts to create (do these in a browser first, ~15 min)

1. **Anthropic plan** — you already have one (Pro/Max/Team). Claude Code needs a paid plan.
2. **GitHub** — github.com. Free. Where the code lives.
3. **Firebase** — console.firebase.google.com. Free "Spark" plan is fine for a workshop.
   - Create a project ("read-the-room").
   - Build → **Realtime Database** → Create → start in **test mode** (we'll lock rules later).
   - Project settings → "Your apps" → Web app → copy the config keys (apiKey, databaseURL, etc.).
     You'll paste these when Claude Code asks, or into `.env.local`.
4. **Vercel** — vercel.com. Free. Sign in **with GitHub** so deploys are one click.

*(Optional, for art) Kenney.nl — free CC0 pixel character packs. Download an animal/character pack
to drop in later.*

---

## STEP 2 — Install Claude Code

**Mac / Linux (recommended — native installer, no Node needed):**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
Open a new terminal, then:
```bash
claude --version
```

**Windows:** install **WSL** first (open PowerShell as admin, run `wsl --install`, restart), then
open the Ubuntu terminal and run the curl command above inside WSL.

**If you prefer npm** (needs Node 18+): `npm install -g @anthropic-ai/claude-code`
Do NOT use `sudo`. If you hit permission errors, install Node via `nvm` instead.

First launch will open a browser to sign in to your Anthropic account.

---

## STEP 3 — Make the project folder and add the files

```bash
mkdir read-the-room && cd read-the-room
```
Copy these three files I gave you into that folder:
- `CLAUDE.md`
- `read-the-room-build-brief.md`
- `read-the-room-question-bank.json`

Then start Claude Code from inside the folder:
```bash
claude
```

---

## STEP 4 — Add the two MCP integrations (run inside the project, or before `claude`)

```bash
# Live, version-correct docs for Next.js / Firebase / Tailwind
claude mcp add --transport http context7 https://mcp.context7.com/mcp

# The "eyes" — lets Claude open the app, screenshot it, and fix the UI
claude mcp add playwright npx @playwright/mcp@latest
```
Keep it to just these two for now. More MCPs = more clutter = worse output.

---

## STEP 5 — The build prompts (paste one at a time)

> Tip: end UI prompts with "use context7" and "then open it with Playwright, screenshot the phone
> and laptop views, and fix anything that looks off."

**Prompt 1 — orient + scaffold the core loop**
```
Read CLAUDE.md and read-the-room-build-brief.md fully before doing anything. Then scaffold the
project per the stack there: Next.js (App Router) + Tailwind + Firebase Realtime Database. Build
Phase 1 from the build order ONLY: a host page that creates a room with a 4-digit PIN, and a player
page where someone joins by PIN and enters a name. Both pages should show the live list of joined
players, synced through Firebase in real time. Put Firebase config in .env.local and add it to
.gitignore. Use context7 for current Next.js and Firebase APIs. When it runs, open it with
Playwright and confirm a player joining shows up on the host screen.
```
*(Claude Code will ask for your Firebase keys here — paste them from Step 1.)*

**Prompt 2 — deploy early so phones can reach it**
```
Initialize a git repo, push to a new GitHub repo, and deploy to Vercel. Add the Firebase env vars
to Vercel. Give me the live URL so I can open it on my phone. Walk me through any clicks I need to
do in the GitHub or Vercel websites.
```

**Prompt 3 — the question loop**
```
Now Phase 2: load questions from read-the-room-question-bank.json. On the host/big-screen, show the
current question with the 2x2 colored answer tiles (color + shape per CLAUDE.md) and a countdown.
On the phone, show only the four colored shape buttons (in-person mode). Host can advance to the
next question; players' answers write to Firebase. Use context7. Then screenshot both views with
Playwright and match the Kahoot layout in CLAUDE.md.
```

**Prompt 4 — scoring + leaderboard**
```
Phase 3: implement the scoring formula and streak bonus from CLAUDE.md. After each question, show a
reveal (dim wrong tiles, outline the correct one) and a leaderboard of the top 5 that visibly
reshuffles. Show each player their rank and streak on their phone.
```

**Prompt 5 — podium**
```
Phase 4: add a final podium screen with 1st/2nd/3rd and a winner moment. Then let's test the whole
loop end to end on real phones.
```

**Prompt 6 — brand it (this is where the UI gets good)**
```
Now make it look like Predictive Success and feel like Kahoot. Apply the brand tokens in CLAUDE.md.
Take Playwright screenshots of every screen on both phone and laptop, critique them against the
Kahoot references in CLAUDE.md, and iterate until they look polished and intentional — not generic.
Show me before/after screenshots.
```

**Prompt 7 — characters (only after the game works)**
```
Phase 6: add a character builder — pick a pixel-art animal, recolor it, add one accessory, 3 taps.
Cosmetic only. Use the Kenney pixel pack in /public/sprites. Show the chosen character on the
leaderboard and podium.
```

---

## STEP 6 — Before the live demo
- Lock down Firebase Realtime Database rules (ask Claude Code: "tighten the Firebase rules so only
  valid room reads/writes are allowed, but the game still works"). Test mode expires.
- Decide **in-person vs online** mode and set it as the default (changes whether the phone shows the
  question text).
- Do one full dry run on 3–4 phones at once to catch reconnect / timing issues.

## Handy habits
- One phase per prompt. Let it finish and deploy before the next.
- When a screen looks wrong, say: "open it with Playwright, screenshot it, and fix X" — don't
  describe the fix in words alone; make it look.
- If Claude Code suggests deprecated code, add "use context7" and retry.
- Commit after each working phase so you can always roll back.
