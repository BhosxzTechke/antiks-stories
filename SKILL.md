---
name: antiks-stories
description: Produce a 62–75s vertical cartoon story video for the "Antiks Stories" channel (little-known Philippine stories, stickman graduation-cap host, doodle-plus characters, real archive photos, Kokoro bm_george narration, no music). Use when the user wants a new Antiks video, a story idea, a hook, a script, a re-render or a fix of an Antiks video, or says "next video", "story finder" or "/antiks-stories".
---

# Antiks Stories — video production

Channel identity (name, tagline, handle, narrator voice, accent colour, host cap/tassel/badge) comes from **`data/brand.json`** — read it first and use that name/tagline everywhere (default: **Antiks Stories** — *"Old stories. New antics."*). Content: little-known stories from the Philippines (any era), English narration, for Filipinos and anyone curious. One 1080x1920 master for YouTube Shorts, TikTok, Facebook Reels and Instagram Reels.

If `brand.json` still says "Antiks Stories" and the user is not the Antiks Stories channel owner, remind them once to set their own brand (README → "Make it yours"); the Antiks Stories name and host design are reserved by the author.

Read the reference file for a step **before** doing that step:

| File | Use it for |
|---|---|
| `reference/brand.md` | host, signature moments, colours, tone of voice |
| `reference/storytelling.md` | cold open + payoff structure, hook selection, mini-hooks, endings |
| `reference/visual-style.md` | doodle-plus rules, tone-switch camera/transition toolkit, retention rules, safe zone |
| `reference/sound-design.md` | which SFX for which moment, sync + mix rules, approved sources |
| `reference/narration.md` | bm_george directed method, pacing, pronunciation workflow |
| `reference/research-and-facts.md` | 2-source rule, myths, archive photo sources and licence checks |
| `reference/trends.md` | trend check procedure and the fit test |
| `reference/platforms.md` | length, specs, monetisation notes, publish pack |
| `assets/lib/antiks.js` | scene runtime API (host, doodle, camera, captions, archive, fx, bg) — read its header comments |

## Paths (project root = the folder that contains `.claude/`)

First time on a machine/project: run `scripts/setup.ps1 -Project <project root>` (see README.md). If `tools/kokoro-venv` or `node_modules/puppeteer-core` is missing, tell the user to run setup instead of improvising installs.

- Skill: `.claude/skills/antiks-stories/` — Python venv: `tools/kokoro-venv/` — renderer deps: `node_modules/` at project root
- Each video lives in `videos/<NN-slug>/` (copy `template/` to start). Files there:
  `brief.md` (story, sources, hooks) · `script.json` · `storyboard.md` · `scene.html` · `cues.json` · `licenses.csv` · `archive/` (real photos) · generated: `voice.wav`, `timings.json`, `mix.wav`, `out/`

## Memory — always (many users have 6–8 GB RAM)

- Check free memory first: `(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory/1MB` (GB). Kokoro needs ~2 GB free, rendering ~1 GB. If low, ask the user to close apps (browser tabs, other editors, extra Claude windows, `wsl --shutdown`).
- Never run narration and rendering at the same time. One step, then the next.

## Workflow — 3 checkpoints

**Starting:** channel decisions are fixed in this skill — never re-interview the user about style, host, voice, sound or length. If the user gave a topic (e.g. `/antiks-stories Battle of Mactan`), go straight to step 1. If not, ask ONE question: "Do you have a story topic, or should I run the story finder?" If a video folder is already in progress in `videos/`, offer to continue it instead.

### 0. Pick the story
User topic, or run the **story finder**: research 5–8 candidates (see research-and-facts.md), score each 1–5 on *surprise, emotion, visual potential, verifiability, Filipino pride/shareability*, add the best to `data/story-backlog.md`, present the top 3. Avoid topics used in `data/video-log.md`.

### 1. Research → brief → ✅ CHECKPOINT 1
1. Research and verify: every key fact needs **2 independent reliable sources**; label myths/legends; note what is disputed.
2. Find 2–4 real archive images (public domain / CC0 / PD-US-gov). Record each in `licenses.csv` (file,source URL,licence,notes). Download into `archive/`.
3. Trend check (trends.md) — suggest one format only if it passes the fit test.
4. Write **3 hook concepts** using different opening styles (storytelling.md), score them (stop-power, curiosity gap, clarity on mute, payoff protection), recommend one. Do not reuse the opening style of the last 2–3 videos in `video-log.md`.
5. Save as `brief.md` and **stop for approval**: story summary, sources, archive images, 3 hooks + recommendation.

### 2. Script + storyboard + names → ✅ CHECKPOINT 2
1. Write `script.json` (narration.md): 62–75 s when read, cold open → rewind → story with mini-hooks every 10–15 s → payoff (WHY/HOW) → loop-back ending. Mark caption keywords with `*word*`.
2. Write `storyboard.md`: one row per beat — time, narration, tone (serious/tense/funny/reveal), visual + camera move, host pose, SFX, caption notes. Something changes every 2–4 s; one big effect per ~8 s max.
3. Names preview: `tools\kokoro-venv\Scripts\python.exe .claude\skills\antiks-stories\scripts\narrate.py videos\<slug> --names "Name1,Name2"` → user listens to `names-preview.wav`. Fix bad names in `data/pronunciations.json`.
4. **Stop for approval** of script, storyboard and names.

### 3. Build → preview → ✅ CHECKPOINT 3
1. Narration: `tools\kokoro-venv\Scripts\python.exe .claude\skills\antiks-stories\scripts\narrate.py videos\<slug>` → `voice.wav`, `timings.json`. Check total length.
2. Build `scene.html` from the storyboard using `antiks.js` (start from `template/scene.html`). Time beats to `timings.json` words, not guesses. Set `window.DURATION` = narration + ~1.5 s tail.
3. Write `cues.json` from the storyboard (sound-design.md), timing hits to word timestamps. Then `node .claude/skills/antiks-stories/scripts/mix.js videos/<slug>`.
4. Preview: `node .claude/skills/antiks-stories/scripts/render.js videos/<slug> --preview`. Look at 4–6 extracted frames yourself (`ffmpeg -ss <t> -i out/preview.mp4 -frames:v 1 ...`) and fix obvious problems first.
5. **Stop for approval**: give the user `out/preview.mp4`. Apply requested changes one at a time.

### 4. Final render + QA
1. `node .claude/skills/antiks-stories/scripts/render.js videos/<slug>` → `out/final.mp4`
2. `node .claude/skills/antiks-stories/scripts/check.js videos/<slug>` — every FAIL must be fixed; explain any WARN to the user.

### 5. Publish pack + log
Write `out/publish.md` (platforms.md): title/caption per platform, 3–5 hashtags, sources line, pinned-comment question, archive credits. Append the video to `data/video-log.md` (date, slug, opening style, hook used, length). After posting, ask the user for viewed-vs-swiped / 3-second drop / average % viewed and log them; use them to pick future hook styles.

## Hard rules
- Facts: 2 sources per key fact; never present a myth as fact; no invented quotes or dates.
- Licences: only sounds from `assets/sfx` (logged) or approved sources (sound-design.md) with a `licenses.csv` row; archive images only PD/CC0/clearly licensed. **No music, never trending songs** in the master.
- No placeholders in a final render (`check.js` warns on archive placeholders).
- Never under 61 s. Keep text inside the safe zone.
- Respectful tone for deaths, war, disasters and cultures: comedy beats only from the host's reactions, never mocking victims or peoples.
- Original work every video: vary openings, scenes and camera; don't clone the previous video's layout (YouTube penalises repetitive mass-produced content).
