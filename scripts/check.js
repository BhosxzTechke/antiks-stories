// Antiks Stories — final QA before publishing.
// Usage (project root): node .claude/skills/antiks-stories/scripts/check.js videos/<slug>
// Checks: length 61-75s (hard fail under 61), loudness near -14 LUFS, safe-zone report,
// every audio file in cues.json and every file in archive/ has a license row.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL = path.resolve(__dirname, '..');
const vdir = path.resolve(process.argv[2] || '.');
const final = path.join(vdir, 'out', 'final.mp4');
const results = [];
const ok = (name, pass, info, warnOnly) => results.push({ name, status: pass ? 'PASS' : warnOnly ? 'WARN' : 'FAIL', info });

if (!fs.existsSync(final)) { console.log('FAIL: out/final.mp4 not found — render first'); process.exit(1); }

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final]).toString());
ok('Length >= 61s (TikTok Creator Rewards)', dur >= 61, dur.toFixed(1) + 's');
ok('Length <= 75s (target 62-75)', dur <= 75, dur.toFixed(1) + 's', true);

let lufs = null;
const ebu = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', final, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
const m = ebu.match(/Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS/);
if (m) lufs = parseFloat(m[1]);
ok('Loudness about -14 LUFS (+/-2)', lufs !== null && Math.abs(lufs + 14) <= 2, lufs === null ? 'no audio?' : lufs + ' LUFS');

const sz = path.join(vdir, 'out', 'qa-safezone.json');
if (fs.existsSync(sz)) {
  const v = JSON.parse(fs.readFileSync(sz, 'utf8')).violations;
  ok('Text/photos inside safe zone', v.length === 0, v.length ? `${v.length} issues, first at ${v[0].t}s (${v[0].what})` : 'clean', true);
}

// licenses
const readCsv = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(',')[0].trim()) : []);
const kitLic = new Set(readCsv(path.join(SKILL, 'assets', 'sfx', 'licenses.csv')));
const vidLic = new Set(readCsv(path.join(vdir, 'licenses.csv')));
const missing = [];
const cuesPath = path.join(vdir, 'cues.json');
if (fs.existsSync(cuesPath)) {
  const c = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
  [...(c.beds || []), ...(c.sfx || [])].forEach(x => {
    if (x.file.startsWith('sfx:')) { if (!kitLic.has(x.file.slice(4))) missing.push(x.file); }
    else if (!vidLic.has(x.file)) missing.push(x.file);
  });
}
const arch = path.join(vdir, 'archive');
if (fs.existsSync(arch)) fs.readdirSync(arch).forEach(f => { if (!vidLic.has('archive/' + f)) missing.push('archive/' + f); });
ok('Every sound/photo has a license row', missing.length === 0, missing.length ? 'missing: ' + [...new Set(missing)].join(', ') : 'all logged');

const scene = fs.existsSync(path.join(vdir, 'scene.html')) ? fs.readFileSync(path.join(vdir, 'scene.html'), 'utf8') : '';
const archiveCalls = [...scene.matchAll(/\barchive\(\s*[^,()]+,\s*\{([^}]*)\}/g)].map(m => m[1]);
const placeholders = archiveCalls.filter(body => !/\bhref\s*:/.test(body)).length;
ok('No archive placeholders left', placeholders === 0, placeholders ? `${placeholders} archive() call(s) without href (grey placeholder)` : 'all archive photos are real', true);

results.forEach(r => console.log(`${r.status.padEnd(5)} ${r.name} — ${r.info}`));
process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
