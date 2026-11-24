# Narration — Kokoro bm_george, directed

- Voice: **bm_george** (British male, documentary feel). Setup: `tools/kokoro-venv` + eSpeak NG (installed; it makes Filipino names read correctly from normal spelling).
- Tool: `scripts/narrate.py` (see its header). Polishes audio and writes word timings.

## script.json
```json
{"voice": "bm_george", "lines": [
  {"text": "The war ended in 1945.", "speed": 1.0, "pause": 0.3},
  {"text": "He kept fighting... for *29 years*.", "speed": 0.88, "pause": 0.6}
]}
```
- One sentence or phrase per line — this is what makes it directed.
- `*word*` = gold caption keyword (not spoken differently).
- If Kokoro misreads a number/date, write it in words in the text (captions then show the words — acceptable) or add a pronunciation entry.

## Pacing table
| Beat | speed | pause after |
|---|---|---|
| Cold open line | 0.95–1.0 | 0.3–0.5 |
| Rewind line | 1.0 | 0.4 |
| Story, normal | 1.0–1.05 | 0.15–0.3 |
| Build-up / escalation | 1.05–1.1 | 0.1–0.2 |
| Line before a reveal | 0.9 | 0.6–0.9 (the dramatic pause) |
| Reveal / key number | 0.82–0.9 | 0.4–0.6 |
| Sad / respectful | 0.9 | 0.4 |
| Ending question | 0.95 | 0.8 |

Total spoken + pauses must land at 60–73 s (video adds ~1.5 s tail → 62–75 s).

## Delivery tricks (Kokoro has no emotion tags)
- Emotion comes from sentence shape: short punchy lines for tension, longer flowing lines for calm.
- Ellipsis "..." inside a line gives a small natural hesitation.
- Question marks lift the end of a line; use them for curiosity.
- Avoid ALL CAPS and exclamation spam — Kokoro doesn't shout well.

## Pronunciation workflow (checkpoint 2)
1. List every Filipino/Spanish/Japanese name and place in the script.
2. Generate the preview: `narrate.py videos\<slug> --names "A,B,C"` → user listens to `names-preview.wav`.
3. For a wrong name, try in order: respelling ("Mak-tahn"), plain-word respelling ("mock tahn"), phonemes (`[Mactan](/mɑktˈɑn/)`). Make a small lab like `--names` with variants and let the user pick.
4. Save the winner in `data/pronunciations.json` → reused automatically in every future video.
