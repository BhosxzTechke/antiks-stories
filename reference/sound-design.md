# Sound design — no music, cinematic SFX + ambience

## Kit (assets/sfx — self-generated, owned, logged in licenses.csv)
impact, boom, whoosh, whoosh-low, rewind, pop, click, riser (3 s), heartbeat (3.6 s), tick (4 s), shutter, glitch, boing, ding, sting-dark, beds: amb-wind, amb-drone, amb-rain, amb-night (20 s, looped by mix.js).
Reference them in cues.json as `"sfx:impact.wav"`.

## What to use when
| Moment | Sound | dB guide |
|---|---|---|
| Cold open frame 1 | impact (+ boom for huge claims) or sting-dark for mysteries | -4 / -8 |
| Rewind (2–5 s) | rewind, then whoosh-low into the past | -8 |
| Scene change / camera move | whoosh, starting ~0.1 s before the cut | -10 |
| Key word/number appears | click or pop (max ~1 per 5 s) | -14 |
| Building tension | riser ending exactly on the reveal word; heartbeat under slow zooms; tick for waiting/countdowns | -10 |
| Reveal | 0.3 s of near-silence, then impact (+ boom) | -3 |
| Archive photo slam | shutter (+ whoosh) | -6 |
| Contradiction / "you've been told wrong" | glitch (+ record scratch from downloads) | -8 |
| Host pop-in | pop | -10 |
| Host comedy beat | boing / record scratch / silence + crickets (amb-night briefly) | -8 |
| Idea / answer | ding | -10 |
| Sad / respectful moment | strip SFX back; wind bed only | — |

## Sync rules
- Time every hit to `timings.json` word starts (e.g. impact at the start of the stressed key word), not to guesses.
- Whooshes lead the cut by ~0.1 s; impacts land on the frame of the cut/slam.
- Ambience beds: one per location, -24 to -30 dB, change bed when the location changes; mix.js ducks them under the voice.
- Silence is a sound: leave a 0.3–0.6 s gap before big reveals.
- Don't layer more than 2 SFX at the same moment.
- Final mix ≈ -14 LUFS (mix.js loudnorm), voice always clearly on top.

## Approved outside sources (download manually, log every file in the video's licenses.csv)
| Source | Use | Licence notes |
|---|---|---|
| Mixkit (mixkit.co/free-sound-effects) | record scratch, crowds, jungle/birds, sea, city | Free, commercial OK, no attribution (check page at download) |
| Sonniss GDC bundles (gdc.sonniss.com) | pro cinematic hits, ambiences | Free, commercial OK, no attribution; no AI training use |
| Pixabay sound effects | anything | Pixabay Content License, commercial OK, no attribution |
| Freesound.org | specific sounds | **CC0 files only** |
| ❌ ZapSplat free tier (needs credit), BBC Sound Effects (not commercial), any trending song | — | Do not use |

Suggested first downloads (save in `assets/sfx/`, add rows to `assets/sfx/licenses.csv`): record scratch, crowd murmur, jungle birds, sea waves, church bells, gunfire distant (war stories), old-radio static, typewriter, footsteps on dirt, door creak.

## Music
None in the master file (decided: ambience + SFX only). Never add trending or copyrighted songs. If music is wanted later, only a licence that covers all 4 platforms (e.g. Epidemic Sound).
