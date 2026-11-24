# Scout — find 5 options, then write story.md

Used in step 0 when the user has no topic ("find me stories", "story finder", "scout", "next video"), or wants fresh options.
Never re-interview the user about style, host, voice or length. Ask at most ONE question, and only if there is truly no steer ("Any era or theme to lean into, or surprise me?"). "Surprise me" = just go.

## A. Scout 5 options

### 1. Check what is already done
Read `data/video-log.md` and `data/story-backlog.md`. Never repeat a used story. Note the opening styles of the last 2-3 videos and avoid repeating them.

### 2. Trend and timing check (web search, real current date)
- Trending short-form **formats and hook patterns** (TikTok, Reels, Shorts): history, storytime, animation, "things you were never taught". Formats and visuals only, never audio.
- **Philippine news and conversation**: trending topics, viral history moments, anniversaries and holidays in the next ~4 weeks (a date peg helps shareability).
- What Filipino history/story creators posted recently, so the options avoid what is oversaturated.
- Apply the fit test in `trends.md`; a trend that fails it is dropped.

### 3. Find candidates
Gather 8-12 across different eras and moods: war/survival, mystery, invention/"first", crime/justice, folklore vs fact, food/culture origins, odd laws, disasters with heroes, unsung people, colonial-era oddities. Prefer stories with:
- one shocking or impossible-sounding **fact** that can open the video,
- a human at the centre (fear, pride, loss, cleverness),
- a clear **WHY/HOW payoff** that can be saved for the end,
- real public-domain archive photos available (see research-and-facts.md).

### 4. Verify and score
For each finalist confirm key facts with **2 independent reliable sources** and check that an archive photo with a valid licence exists. Score 1-5: Surprise, Emotion, Visual potential, Verifiability, Shareability, Hook strength (total /30). Drop anything under 3 on Verifiability. Legends are fine when framed as legends.

### 5. Present exactly 5 options, best first
For each:
1. Working title
2. **Scroll-stopper**: on-screen hook text (max ~12 words, clear on mute) AND the first spoken line. Concrete, specific, a hint of dread or disbelief, one idea; real names, numbers, years, objects.
3. Opening style (storytelling.md table)
4. The story in 2 lines, WITHOUT the WHY/HOW payoff
5. Why now (trend, date peg, or gap in what others cover)
6. Scores, number of sources found, archive photo yes/no, any sensitivity (deaths, war, culture)

Vary the five on era, mood and opening style; include one lighter and one emotional story. End with one-sentence recommendation and: "Pick a number (or mix, e.g. 2 with the hook from 4) and I'll write the full story file."

A hook fails if it needs context to make sense, spends the payoff, or claims more than the sources support. Rewrite it. Target shape: "The war ended in 1945. He kept fighting for 29 years."

Add the 5 options (title, scores, status "candidate") to `data/story-backlog.md`.

## B. Write videos/<NN-slug>/story.md (after the user picks)
Use the next number after the highest folder in `videos/`; create the folder. Same section order as `template/brief.md`, plus extra detail:
1. Handoff line at top: `READY FOR /antiks-stories: research and hooks done. Start at Checkpoint 1 review, then script.`
2. Title, one-line premise, chosen opening style.
3. Story (8-12 sentences, chronological, easy to narrate), with the payoff marked `PAYOFF:`.
4. Beat outline for 62-75 s: cold open / rewind / story beats with a mini-hook every 10-15 s / payoff / loop-back ending + one specific question. Suggested tone per beat (serious / tense / funny / reveal).
5. Key facts + sources table: Fact | Source 1 (URL) | Source 2 (URL). Paraphrase; never copy source text.
6. Myths / disputed points and exactly how to phrase them.
7. Archive images table: what it shows, source page URL, licence, on-screen credit line.
8. Names to check (Filipino/Spanish/Japanese etc.) with a phonetic guess, for the names-preview checkpoint.
9. Trend check: what was found, fit test pass/fail, the one allowed adaptation if any.
10. 3 hook options (on-screen text + first spoken line), scored (stop power, curiosity gap, mute clarity, payoff protection, accuracy), with a recommendation.
11. Sensitivity notes: respectful handling of deaths/war/disasters; comedy only from the host's reactions.

Mark the chosen story with its slug in `data/story-backlog.md`. Tell the user the path and continue at step 1 (fast path).
