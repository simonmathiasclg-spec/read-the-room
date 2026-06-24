# Defuse the Pattern — Design Doc (v1)

A cooperative team-building game mode for the Predictive Success Games platform
("Read the Room"). Sits alongside PI Training (the Kahoot quiz) as the second mode.

This doc is the source of truth for the design, a thing to circulate to the CEO/Alyssa,
and — once approved — the build brief for Claude Code.

---

## The one-line pitch
A whole pod works against a timer to handle a tricky workplace situation — but the clues
about the coworker and the possible responses are split across everyone's phones, so the
only way to win is to talk it out and agree together.

## Why it works (the two goals, in one mechanic)
- **Team building:** no one can see all the information, so people *must* speak up and
  listen. You win or lose as a pod — no individual scores, no one to blame, one shared
  "we did it." That shared stakes is what bonds a group.
- **Teaches PI:** to defuse the situation you match a response to the coworker's drives.
  Doing that, round after round, trains people to read behavior through a PI lens — without
  it feeling like a test.

## Players & grouping
- **A pod is 4–8 players** sharing one challenge. That's the sweet spot for everyone having
  a voice.
- **Big rooms (e.g. 36 people):** split into pods of 4–6. Each pod gets its own scenario on
  its own shared sub-screen (or the host runs pods in sequence for one projector). Pods can
  optionally be compared ("3 of 4 pods defused it!") but within a pod it stays pure co-op.
- **v1 scope:** build for a single pod first (one shared big screen + that pod's phones).
  Multi-pod splitting is a v2 layer on top.

## Tone & language
- Fictional coworkers we invent (e.g. "Marcus," "Dana") — never players' real profiles, so
  it's safe and low-pressure.
- **Gentle mix** of plain language and PI terms: lead with behavior ("he needs things done
  correctly and finds big public confrontation draining"), then name the driver once
  ("— that's high Formality, low Extraversion"). Beginners follow along; the vocabulary
  sinks in by repetition.

---

## A round, beat by beat

**Setup (big screen, everyone sees):**
> "⏱ 90 seconds. Marcus snapped at the team in today's standup, then went silent. Defuse it
> before the timer runs out. Talk to each other — you each know something the others don't."

**The split (each phone shows only its piece):**
- **Clue-holders (1–3 players):** each holds one fact about Marcus's drives, in the
  plain-language-then-term style. e.g.
  - Phone A: "Marcus likes to get things exactly right and hates being rushed. *(High Formality)*"
  - Phone B: "Big public call-outs drain him; he opens up one-on-one. *(Low Extraversion)*"
- **Option-holders (remaining players):** each holds ONE possible response. e.g.
  - Phone C: "Call it out in the room so everyone clears the air."
  - Phone D: "Pull him aside privately, later, with a calm plan."
  - Phone E: "Fire off a detailed written recap of what went wrong."
  - Phone F: "Give him space and let it blow over on its own."
- No phone shows everything. Clue-holders must *describe* what they know; option-holders
  must *read out* their option. The pod debates which option fits the drives.

**The lock-in:**
- The pod agrees on ONE option. The player holding that option taps "This is our answer"
  (or the host confirms the pod's call). One submission per pod.
- **Correct** = the option that fits the drives (here: pull him aside privately — respects
  low Extraversion + gives the clear plan a high-Formality person needs).
- A wrong lock-in can either end the round (hard mode) or cost time/give one retry (default)
  — see Difficulty.

**Resolution (big screen):**
- **Defused!** — a short payoff line explaining *why* it worked, in PI terms: "Marcus needed
  a private, structured conversation — you read his drives right." Pod celebration moment.
- **Didn't land** — gentle explanation of what the drives actually called for, so it still
  teaches. No blame, no individual called out.

**Then:** next scenario, or a final "X of Y patterns defused" summary for the session.

---

## What's on each screen

| Screen | Shows |
|---|---|
| **Host / big screen** | The scenario, the countdown timer, who's in the pod (their critters), a "locked in?" indicator, and the resolution + the teaching payoff. NOT the clues or options (those live on phones). |
| **Clue-holder phone** | One drive-fact about the coworker, styled as a "you know…" card. A note: "Tell your team what you know." |
| **Option-holder phone** | One response option as a big card, plus a "This is our answer" button (only the pod's agreed holder taps it). |

The information split is the whole game — the host screen deliberately withholds the pieces
so people have to voice them.

## Scoring
- **Pure co-op, no leaderboard.** The pod's record is shared: "You defused 4 of 5." That's
  the whole score. Optionally track a team streak for a little momentum.
- The reward is the celebration + the "we got it" feeling, not points.

## Difficulty (host setting, like the quiz's tiers)
- **Standard:** 90s, one wrong guess allowed (costs time).
- **Pressure:** 60s, one shot.
- **Harder scenarios** can add a third clue, more options, or a coworker whose drives
  conflict (e.g. high Dominance *and* high Patience) so the "right" answer is subtler.

## Content needed
A bank of **scenarios**, each = { situation, the coworker's drive-clues (2–3),
response options (3–5, exactly one correct), the "why it worked/didn't" explanation }.
Aim for ~15–20 to start so a session doesn't repeat. I (Claude) can write these from the
toolkit the same way I wrote the quiz bank — they're original scenarios, PI-accurate.

## Reuse / tech
Built on the existing platform: same PIN/QR join, same host-drives-big-screen model, same
Firebase real-time room. The new part is per-player *different* data (each phone gets its own
clue or option) and the single-pod-submission logic. No new multiplayer plumbing.

## Open questions for CEO / Alyssa
1. Big rooms: simultaneous pods on multiple screens, or sequential pods on one projector?
2. Should the host (facilitator) be able to nudge/reveal a hint if a pod is stuck?
3. How important is a post-round debrief prompt for the facilitator ("ask the group why…")?

## Build order (once approved)
1. Single-pod round: scenario on host + split clues/options to phones + timer + lock-in + resolve.
2. The scenario content bank.
3. Difficulty settings + the session summary.
4. (v2) Multi-pod splitting for big rooms.
