// Antiks Stories — sound mix (voice + ambience beds + SFX, ducking, loudness).
// Usage (project root): node .claude/skills/antiks-stories/scripts/mix.js videos/<slug>
// Reads videos/<slug>/cues.json:
// {
//   "duration": 70.5,                       // seconds (use scene DURATION)
//   "voice": "voice.wav", "voice_db": 0,
//   "beds": [ {"file":"sfx:amb-jungle.wav","start":0,"end":30,"db":-26,"fade":1.0} ],
//   "sfx":  [ {"file":"sfx:impact.wav","at":0.0,"db":-4}, {"file":"sfx:whoosh.wav","at":4.9,"db":-10} ]
// }
// "sfx:NAME" = skill kit (assets/sfx/NAME); other paths are relative to the video folder.
// Beds are ducked under the voice automatically. Output: mix.wav at about -14 LUFS.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL = path.resolve(__dirname, '..');
const vdir = path.resolve(process.argv[2] || '.');
const cues = JSON.parse(fs.readFileSync(path.join(vdir, 'cues.json'), 'utf8'));
const D = cues.duration;
const resolve = f => (f.startsWith('sfx:') ? path.join(SKILL, 'assets', 'sfx', f.slice(4)) : path.join(vdir, f));

const inputs = [], filters = [];
const add = (file, loop) => {
  const p = resolve(file);
  if (!fs.existsSync(p)) throw new Error('missing audio: ' + p);
  if (loop) inputs.push('-stream_loop', '-1');
  inputs.push('-i', p);
  return inputs.filter(x => x === '-i').length - 1;
};
const norm = 'aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo';

const vi = add(cues.voice || 'voice.wav');
filters.push(`[${vi}]${norm},volume=${cues.voice_db || 0}dB,apad=whole_dur=${D},asplit=2[voice][key]`);
const mixIn = ['[voice]'];

const beds = cues.beds || [];
if (beds.length) {
  beds.forEach((b, i) => {
    const idx = add(b.file, true);
    const len = (b.end ?? D) - (b.start || 0), fd = b.fade ?? 0.8;
    filters.push(`[${idx}]${norm},atrim=0:${len},afade=t=in:d=${fd},afade=t=out:st=${Math.max(0, len - fd)}:d=${fd},volume=${b.db ?? -26}dB,adelay=${Math.round((b.start || 0) * 1000)}:all=1[b${i}]`);
  });
  filters.push(`${beds.map((_, i) => `[b${i}]`).join('')}amix=inputs=${beds.length}:normalize=0,apad=whole_dur=${D}[beds]`);
  filters.push(`[beds][key]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=350[ducked]`);
  mixIn.push('[ducked]');
} else filters.push('[key]anullsink');

(cues.sfx || []).forEach((s, i) => {
  const idx = add(s.file);
  filters.push(`[${idx}]${norm},volume=${s.db ?? -8}dB,adelay=${Math.round(s.at * 1000)}:all=1[s${i}]`);
  mixIn.push(`[s${i}]`);
});

filters.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${D},alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11[out]`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '44100', path.join(vdir, 'mix.wav')], { stdio: 'inherit' });
console.log(`mix.wav written (${D}s, ${beds.length} beds, ${(cues.sfx || []).length} sfx)`);
