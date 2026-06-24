# Build Brief — Defuse the Pattern (Team-Building Mode)

For Claude Code. Adds a second game mode to the existing "Read the Room" app, alongside
PI Training (the quiz). Reuses the existing platform: same PIN/QR join, same host big-screen
model, same Firebase Realtime Database, same design system and Predictive Success brand.

Read this with `defuse-the-pattern-design.md` (full design) and load content from
`defuse-the-pattern-scenarios.json`.

## What it is
A pure co-op team-building game. A pod (4–8 players) faces a workplace situation on the big
screen, but the **clues** about the coworker's PI drives and the **response options** are
split across different players' phones. Nobody sees everything, so the pod must talk it out
and lock in ONE response before the timer runs out. The whole pod wins or loses together —
no individual scores.

## The core principle (most important — don't get this wrong)
Make the **rules invisible** and the **problem hard**. Two different kinds of "figuring out":
- Confusion about *how to play* = bad. Kill it. Each phone must clearly tell its holder what
  their role is and what to do.
- Wrestling with *the problem together* = the whole point. Preserve it. The phones must NEVER
  reveal which option is correct — that's what the pod debates.

So: clue cards are phrased as an instruction to speak ("Tell your team: …") and state the
behavior + name the PI term once — but they do not hint at the answer. Option cards just show
one possible response. The difficulty and the teamwork live in matching drives to response
under time pressure, not in deciphering the UI.

## Round flow (build this)
1. **Host picks "Defuse the Pattern"** at mode select (it's the 2nd mode; PI Training is the
   1st). Host sets difficulty (Standard 90s / Pressure 60s) and how many scenarios in the session.
2. Players join the room as usual (PIN/QR, name, critter — reuse all of it). They're one pod for v1.
3. On **Start**, for each scenario the system **assigns roles within the pod**:
   - Distribute the scenario's `clues` across some players (clue-holders).
   - Distribute the scenario's `options` across the others (option-holders). Every option in
     the scenario must be held by exactly one player; if there are more players than
     clues+options, extras can co-hold/observe (or assign a "Lead" — see below).
   - Shuffle which player gets what each scenario so roles rotate.
4. **Big screen** shows: the situation text, the countdown timer, the pod's critters, and a
   "locked in?" state. It does NOT show the clues or options — those are only on phones.
5. **Phones** show their card (clue or option) with a clear role instruction. Option-holders
   have a "This is our answer" button. The pod talks out loud, decides, and the holder of the
   agreed option taps it (one submission per pod).
6. **Resolve** on the big screen: Defused! (show `whyCorrect`, celebrate) or Didn't land
   (show `whyWrongCommon` / the teaching note — no blame). Then next scenario.
7. End of session: a shared summary — "Your pod defused X of Y."

## Roles & the "Lead" (helps avoid silent rooms)
Auto-assign one player per scenario as **Lead**, whose phone adds: "Your job: get everyone to
share what they have, then call the vote." This gives the conversation a focal point. (In a
facilitated workshop the human host may do this verbally — fine — but the Lead role makes it
work even without a facilitator.)

## First scenario = a gimme
Always run scenario `s01` (difficulty `gimme`) first in a session. It's deliberately easy so
the pod experiences the loop working — share → debate → lock in → "Defused!" — before
difficulty ramps. Then draw the rest by the host's difficulty setting.

## Data / Firebase
Reuse the room model. Add under the room: the current scenario id, the per-player role
assignment (who holds which clue/option — so each phone fetches only its own card), the
pod's locked-in submission, and the resolve state. IMPORTANT: respect the existing security
rules you locked down — keep new fields validated and scoped under `rooms/{pin}`; if a new
field needs a rule, add it to `database.rules.json` and tell the user to publish it (don't
silently widen the rules).

## Content
`defuse-the-pattern-scenarios.json` — 10 scenarios (s01 is the gimme). Each = situation,
clues [{plain, term}], options [{text, correct}], whyCorrect, whyWrongCommon, optional
facilitatorPrompt. Exactly one option per scenario is correct. Extend by appending in the
same schema; Claude (in chat) can write more.

## Scope
- **v1: single pod** (one big screen + that pod's phones), full round loop, the 10 scenarios,
  difficulty + session summary, the Lead role, the gimme-first rule.
- **v2 (later):** splitting a big room into multiple simultaneous pods.

## Reuse, don't rebuild
Join/host/QR, the room/Firebase real-time layer, the design system, brand tokens, critters —
all already exist and work. The genuinely new engineering is: (a) sending *different* data to
different players in the same room (role/card assignment), and (b) the single-pod lock-in +
resolve. Everything else is composition of what's there.

## Verify before commit
Run a full scenario in the browser with several players: confirm different phones show
different cards, the big screen hides the clues/options, the lock-in resolves correctly
against the `correct` option, and the resolve text shows. Then commit, push, and give the
live URL. Don't touch the PI Training quiz mode or its scoring.
```
