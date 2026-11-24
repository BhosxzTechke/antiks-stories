// Antiks Stories — frame renderer (Edge headless -> ffmpeg).
// Usage (project root):  node .claude/skills/antiks-stories/scripts/render.js videos/<slug> [--preview]
//   --preview : 540x960 @15fps, fast, for checkpoint 3  -> out/preview.mp4
//   (default) : 1080x1920 @30fps final                  -> out/final.mp4
// Needs videos/<slug>/scene.html (window.setup + window.renderFrame + window.DURATION).
// Uses timings.json (if present) and mix.wav (if present, muxed in).
// Also writes out/qa-safezone.json: [data-safe] elements (captions/titles/archive) outside the safe zone.
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
// Approximate safe zone for TikTok/Reels/Shorts UI overlap on a 1080x1920 frame.
const SAFE = { left: 60, right: 960, top: 210, bottom: 1480 };

(async () => {
  const vdir = path.resolve(process.argv[2] || '.');
  const preview = process.argv.includes('--preview');
  const FPS = preview ? 15 : 30;
  const outDir = path.join(vdir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, preview ? 'preview.mp4' : 'final.mp4');
  const timingsPath = path.join(vdir, 'timings.json');
  const timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, 'utf8')) : { words: [], lines: [], duration: 0 };
  const mix = path.join(vdir, 'mix.wav');

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--hide-scrollbars', '--mute-audio', '--disable-gpu', '--js-flags=--max-old-space-size=512'] });
  let enc;
  try {
    const page = await browser.newPage();
    // channel branding (name, colours, host cap/tassel/badge) from data/brand.json -> window.BRAND
    const brandPath = path.join(__dirname, '..', 'data', 'brand.json');
    const brand = fs.existsSync(brandPath) ? JSON.parse(fs.readFileSync(brandPath, 'utf8')) : {};
    await page.evaluateOnNewDocument(b => { window.BRAND = b; }, brand);
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: preview ? 0.5 : 1 });
    await page.goto('file:///' + path.join(vdir, 'scene.html').replace(/\\/g, '/'), { waitUntil: 'load' });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const duration = await page.evaluate(cfg => { window.setup(cfg); return window.DURATION; }, { timings, preview });
    if (!duration) throw new Error('scene.html setup() must set window.DURATION');
    const N = Math.ceil(duration * FPS);
    console.log(`${preview ? 'PREVIEW' : 'FINAL'} ${duration.toFixed(2)}s, ${N} frames`);

    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
    if (fs.existsSync(mix)) args.push('-i', mix);
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', preview ? '26' : '18', '-preset', preview ? 'veryfast' : 'medium');
    if (fs.existsSync(mix)) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    args.push('-movflags', '+faststart', outFile);
    enc = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });

    const violations = [];
    for (let i = 0; i < N; i++) {
      const t = i / FPS;
      const check = i % FPS === 0;
      const v = await page.evaluate((t, check, S) => {
        window.renderFrame(t);
        if (!check) return null;
        const bad = [];
        document.querySelectorAll('[data-safe]').forEach(e => {
          if (getComputedStyle(e).opacity === '0' || e.getAttribute('opacity') === '0') return;
          const r = e.getBoundingClientRect();
          if (r.width < 2) return;
          if (r.left < S.left || r.right > S.right || r.top < S.top || r.bottom > S.bottom)
            bad.push({ t: +t.toFixed(2), what: e.getAttribute('data-safe'), box: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        });
        return bad;
      }, t, check, SAFE);
      if (v && v.length) violations.push(...v);
      let buf;
      for (let k = 0; !buf; k++) {
        try { buf = await page.screenshot({ type: 'jpeg', quality: preview ? 80 : 93 }); }
        catch (e) { if (k >= 4) throw e; await new Promise(r => setTimeout(r, 300)); }
      }
      if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
      if (i % (FPS * 5) === 0) console.log(`  ${t.toFixed(0)}s / ${duration.toFixed(0)}s`);
    }
    enc.stdin.end();
    await new Promise(r => enc.on('close', r));
    fs.writeFileSync(path.join(outDir, 'qa-safezone.json'), JSON.stringify({ safe: SAFE, violations }, null, 1));
    if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
    console.log(`done: ${outFile}  (safe-zone issues: ${violations.length})`);
  } finally {
    await browser.close().catch(() => {});
  }
})().catch(e => { console.error(e); process.exit(1); });
