# Visual style — doodle-plus + archive

## World
- **Characters = doodle-plus** (`Antiks.doodle`): white round doodle heads with simple faces, stick limbs, coloured clothes/hats/props per era. Same base body for everyone — identity comes from costume: hats `fieldcap, salakot, campaign, kepi, helmet, crown, bandana`; outfits `shirt, barong, uniform, robe, dress`; props `rifle, bolo, spear, book, letter, flag`; hair, stubble, mustache. Add new costume pieces to antiks.js when a story needs them (keep the same line weight and flat colours).
- **Backgrounds are rich** (gradients, layered foliage, light rays, texture). Simple characters on rich backgrounds = premium, not cheap. Build story-specific backgrounds in the scene; reuse `Antiks.bg.*` as a base.
- **Archive photos** (`Antiks.archive`) are the realism layer — use 1–3 per video, on key facts and the payoff.
- Never draw real people's faces realistically. Real people appear as doodles + their real archive photo.

## Tone-switch toolkit (assign every storyboard beat a tone)
| Tone | Camera | Transitions / visuals | Sound (see sound-design.md) |
|---|---|---|---|
| **Serious** | Slow push-in (zoom 1.0→1.1 over 4–6 s), gentle drift | Soft fade/dissolve, vignette | Ambience, drone |
| **Tense** | Slow creep zoom, slight tilt | Faster cuts as it builds, darker vignette | Heartbeat, tick, riser ending on the reveal |
| **Funny** | Snap zoom (0.12 s) on the host, freeze | Host pop-in (`Antiks.popIn`), hard cut | Pop, boing, record scratch, silence beat for "blank" |
| **Reveal** | 0.3 s hold → hard cut → shake (`camera.set(..., shakes)`) | Archive slam + flash, cap gag | Silence → impact (+ boom) |

## Retention rules
- Something changes every **2–4 s** (cut, camera move, new element, caption group, host reaction).
- No completely static shot longer than **4 s** (at minimum a slow push-in + tassel/breathing motion).
- At most **one big effect per ~8 s** (shake, flash, snap zoom, glitch). Restraint = professional.
- One focal point per shot; the eye should know where to look in 0.5 s.
- Every beat must move the story; cut any shot that only decorates.
- Pattern interrupt at each mini-hook: change angle/background/colour or bring in the host.

## Captions & safe zone
- Captions via `Antiks.captions(svg, timings.words, {y})` — default y=430 (upper third). Move to y≈1180 when the top is busy; never below ~1400.
- Safe zone (checked by render.js): x 60–960, y 210–1480. Right edge and bottom are covered by app buttons/descriptions.
- Hook text on frame 1 via `Antiks.title`.

## Scene craft tips
- Depth: background layer, character layer, foreground layer (e.g. `bg.jungleFront`) — move layers at slightly different speeds for parallax.
- Camera frames: `cam.set(t, [{t:0,x:540,y:960,zoom:1},{t:4,x:560,y:900,zoom:1.12,ease:'ease'}])`.
- Keep characters' feet on a consistent ground line; shadows under everyone.
