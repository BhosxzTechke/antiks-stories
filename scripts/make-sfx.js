// Antiks Stories — generate the self-made starter SFX kit (owned outright, no licence risk).
// Usage (project root): node .claude/skills/antiks-stories/scripts/make-sfx.js
// Writes assets/sfx/*.wav and adds rows to assets/sfx/licenses.csv.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'assets', 'sfx');
fs.mkdirSync(dir, { recursive: true });
const ev = (expr, d) => `aevalsrc='${expr}':d=${d}:s=44100`;
const noise = (color, d, amp = 0.5) => `anoisesrc=color=${color}:amplitude=${amp}:d=${d}:r=44100`;

const KIT = [
  ['impact.wav', 'cinematic hit for reveals / cold open', ev('0.9*sin(2*PI*48*t)*exp(-t*3.5)+0.5*(2*random(0)-1)*exp(-t*14)', 2.2), 'lowpass=f=1800,aecho=0.8:0.6:60|120:0.3|0.2'],
  ['boom.wav', 'sub drop under a big statement', ev('sin(2*PI*(90*t-14*t*t))*exp(-t*1.6)', 2.5), 'lowpass=f=400,volume=2'],
  ['whoosh.wav', 'scene change / camera move (start 3 frames before cut)', noise('white', 0.7, 0.8), 'highpass=f=500,lowpass=f=3500,afade=t=in:d=0.35:curve=qsin,afade=t=out:st=0.35:d=0.35:curve=qsin,volume=2'],
  ['whoosh-low.wav', 'heavy whoosh for big transitions', noise('pink', 0.9, 0.9), 'lowpass=f=900,afade=t=in:d=0.45:curve=qsin,afade=t=out:st=0.45:d=0.45:curve=qsin,volume=2.5'],
  ['rewind.wav', 'tape-rewind feel for the 2-5s rewind', noise('white', 1.2, 0.6), 'highpass=f=1000,lowpass=f=5000,tremolo=f=18:d=0.8,afade=t=in:d=0.9:curve=exp,afade=t=out:st=0.95:d=0.25,volume=2'],
  ['pop.wav', 'host pop-in / caption emphasis', ev('sin(2*PI*(300*t+2500*t*t))*exp(-t*28)', 0.18), 'volume=1.5'],
  ['click.wav', 'subtle tick for key words (use sparingly)', ev('(2*random(0)-1)*exp(-t*250)', 0.05), 'highpass=f=1500'],
  ['riser.wav', '3s tension riser — END it on the reveal word', ev('0.5*sin(2*PI*(150*t+60*t*t*t))*pow(t/3,2)+0.35*(2*random(0)-1)*pow(t/3,3)', 3), 'highpass=f=200'],
  ['heartbeat.wav', 'tension under slow zooms (4 beats)', ev('sin(2*PI*55*mod(t,0.9))*exp(-mod(t,0.9)*16)+0.7*sin(2*PI*55*(mod(t,0.9)-0.22))*exp(-(mod(t,0.9)-0.22)*16)*gte(mod(t,0.9),0.22)', 3.6), 'lowpass=f=300,volume=2'],
  ['tick.wav', 'clock ticking (countdowns, waiting)', ev('(2*random(0)-1)*exp(-mod(t,0.5)*400)', 4), 'highpass=f=2500,volume=0.8'],
  ['shutter.wav', 'archive photo slam-in (camera shutter)', ev('(2*random(0)-1)*(exp(-t*300)+0.8*exp(-(t-0.07)*300)*gte(t,0.07))', 0.25), 'highpass=f=1200,lowpass=f=7000'],
  ['glitch.wav', 'contradiction / "you\'ve been lied to"', ev('sgn(sin(2*PI*(300+600*abs(sin(floor(t*25)*12.9898)))*t))*0.35*gt(sin(2*PI*11*t),-0.3)', 0.5), 'acrusher=bits=6:mix=0.6,volume=0.8'],
  ['boing.wav', 'comedy beat', ev('sin(2*PI*220*t+3*sin(2*PI*9*t)*exp(-t*2))*exp(-t*3)', 1.0), ''],
  ['ding.wav', 'idea / correct answer', ev('0.6*sin(2*PI*1320*t)*exp(-t*3)+0.25*sin(2*PI*2640*t)*exp(-t*4)', 1.6), ''],
  ['sting-dark.wav', 'dark mystery sting (cold open, sad reveal)', ev('0.4*(sin(2*PI*55*t)+sin(2*PI*58.3*t)+0.6*sin(2*PI*82.4*t))*exp(-t*0.8)*min(1,t*20)', 4), 'lowpass=f=900,aecho=0.8:0.7:200:0.4'],
  ['amb-wind.wav', 'bed: wind (open land, sea, sad moments)', noise('brown', 20, 0.5), 'lowpass=f=600,tremolo=f=0.15:d=0.6'],
  ['amb-drone.wav', 'bed: low tension drone (mystery)', ev('0.25*(sin(2*PI*65*t)+sin(2*PI*65.7*t)+0.5*sin(2*PI*98*t))', 20), 'lowpass=f=500,tremolo=f=0.1:d=0.4'],
  ['amb-rain.wav', 'bed: rain', noise('pink', 20, 0.45), 'highpass=f=800,lowpass=f=7000'],
  ['amb-night.wav', 'bed: night insects', ev('0.15*sin(2*PI*4200*t)*gt(sin(2*PI*28*t),0.6)*gt(sin(2*PI*0.9*t),0)+0.03*(2*random(0)-1)', 20), 'highpass=f=300']
];

const licPath = path.join(dir, 'licenses.csv');
const rows = fs.existsSync(licPath) ? fs.readFileSync(licPath, 'utf8').split(/\r?\n/).filter(Boolean) : ['file,source,license,notes'];
for (const [file, note, src, af] of KIT) {
  const filters = [af, 'alimiter=limit=0.9'].filter(Boolean).join(',');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', src, '-af', filters, '-ac', '1', '-ar', '44100', path.join(dir, file)]);
  if (!rows.some(r => r.startsWith(file + ','))) rows.push(`${file},self-generated (Antiks make-sfx.js),owned - no restrictions,${note.replace(/,/g, ';')}`);
  console.log('made', file);
}
fs.writeFileSync(licPath, rows.join('\n') + '\n');
