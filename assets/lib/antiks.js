/* Antiks Stories — scene runtime library.
   Load in a video's scene.html BEFORE the scene script:
     <script src="../../.claude/skills/antiks-stories/assets/lib/antiks.js"></script>
   Everything is pure SVG and deterministic: a scene implements
     window.setup(cfg)      // cfg = { timings, preview }  -> must set window.DURATION (seconds)
     window.renderFrame(t)  // draws the frame at time t (seconds)
   Canvas is 1080x1920. Use Antiks.* helpers below. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const A = (window.Antiks = {});
  A.W = 1080; A.H = 1920;
  // Brand comes from data/brand.json (render.js injects it as window.BRAND before this file loads)
  const B = window.BRAND || {};
  const BC = B.colors || {}, BH = B.host || {};
  A.BRAND = B;
  A.INK = BC.ink || '#111'; A.GOLD = BC.accent || '#f5c542'; A.PAPER = BC.paper || '#efe6d2';
  A.HOST = { cap: BH.cap_color || '#1b1b1b', tassel: BH.tassel_color || A.GOLD, badge: BH.badge || 'sun', badgeColor: BH.badge_color || A.GOLD };
  A.FONT = "'Arial Black', Impact, sans-serif";

  /* ---------- basics ---------- */
  A.el = function (tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  A.svg = function () {
    let s = document.getElementById('stage');
    if (!s) {
      s = A.el('svg', { id: 'stage', width: 1080, height: 1920, viewBox: '0 0 1080 1920' });
      document.body.appendChild(s);
    }
    return s;
  };
  A.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  A.lerp = (a, b, k) => a + (b - a) * k;
  A.k = (t, t0, dur) => A.clamp((t - t0) / dur);
  A.ease = k => { k = A.clamp(k); return k * k * (3 - 2 * k); };
  A.easeOut = k => { k = A.clamp(k); return 1 - Math.pow(1 - k, 3); };
  A.easeIn = k => { k = A.clamp(k); return k * k * k; };
  A.backOut = k => { k = A.clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  A.rng = function (seed) {
    return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  A.noise = (t, seed = 1) => Math.sin(t * 12.9898 + seed * 78.233) * 0.5 + Math.sin(t * 7.13 + seed * 3.7) * 0.5;

  /* keyframes: frames = [{t, ...numbers, ease:'ease'|'out'|'in'|'back'|'linear'|'hold'}]
     returns the interpolated numeric props at time t */
  A.keys = function (t, frames) {
    if (t <= frames[0].t) return Object.assign({}, frames[0]);
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i], b = frames[i + 1];
      if (t <= b.t) {
        const fn = { ease: A.ease, out: A.easeOut, in: A.easeIn, back: A.backOut, linear: A.clamp, hold: () => 0 }[b.ease || 'ease'];
        const k = fn((t - a.t) / (b.t - a.t || 1));
        const o = {};
        for (const p in b) if (typeof b[p] === 'number' && p !== 't') o[p] = A.lerp(a[p] ?? b[p], b[p], k);
        return o;
      }
    }
    return Object.assign({}, frames[frames.length - 1]);
  };

  /* ---------- camera ----------
     cam = Antiks.camera(parentGroup)
     cam.set(t, frames, shakes)  frames: [{t, x, y, zoom, rot}] (x,y = world point at screen centre)
     shakes: [{t, amp, dur}] decaying shake (impacts) */
  A.camera = function (parent) {
    const g = A.el('g', {}, parent);
    return {
      g,
      set(t, frames, shakes = []) {
        const c = A.keys(t, frames);
        let sx = 0, sy = 0, sr = 0;
        shakes.forEach(s => {
          if (t >= s.t && t < s.t + s.dur) {
            const d = 1 - (t - s.t) / s.dur;
            sx += A.noise(t * 40, 1) * s.amp * d; sy += A.noise(t * 40, 2) * s.amp * d; sr += A.noise(t * 40, 3) * s.amp * 0.05 * d;
          }
        });
        g.setAttribute('transform', `translate(${540 + sx} ${960 + sy}) rotate(${(c.rot || 0) + sr}) scale(${c.zoom || 1}) translate(${-(c.x ?? 540)} ${-(c.y ?? 960)})`);
      }
    };
  };

  /* ---------- kinetic captions ----------
     cap = Antiks.captions(svg, timings.words, {y, size})
     words: [{w, start, end, hl, line}] from narrate.py. *word* in the script => hl:true (gold).
     Numbers are drawn larger. Groups: <=4 words / <=22 chars, break on punctuation and line change. */
  A.captions = function (parent, words, opts = {}) {
    const y = opts.y ?? 430, size = opts.size ?? 74;
    const g = A.el('g', { 'data-safe': 'caption' }, parent);
    const text = A.el('text', { x: 0, y: 0, 'font-family': A.FONT, 'font-size': size, fill: '#fff', stroke: '#111', 'stroke-width': size * 0.18, 'paint-order': 'stroke', 'stroke-linejoin': 'round', 'text-anchor': 'middle' }, g);
    const groups = [];
    const WEAK = /^(the|a|an|in|of|to|and|on|at|for|but|or|by|with|from|his|her|their|its|was|is)$/i;
    let cur = null;
    words.forEach((w, i) => {
      const chars = cur ? cur.words.map(x => x.w).join(' ').length + w.w.length + 1 : 0;
      const lastWeak = cur && WEAK.test(cur.words[cur.words.length - 1].w);
      const full = cur && (cur.words.length >= 4 || chars > 22);
      if (!cur || cur.line !== w.line || (full && !(lastWeak && cur.words.length < 5 && chars <= 28))) { cur = { line: w.line, words: [] }; groups.push(cur); }
      cur.words.push(w);
      if (/[.,!?;:—]$/.test(w.w) && i < words.length - 1) cur = null;
    });
    groups.forEach((gr, i) => {
      gr.start = gr.words[0].start - 0.05;
      const last = gr.words[gr.words.length - 1].end;
      gr.end = i < groups.length - 1 ? Math.min(groups[i + 1].words[0].start - 0.05, last + 1.2) : last + 1.0;
    });
    let shown = null;
    return {
      groups,
      set(t, hidden = false) {
        const gr = hidden ? null : groups.find(x => t >= x.start && t < x.end);
        if (gr !== shown) {
          shown = gr;
          while (text.firstChild) text.removeChild(text.firstChild);
          if (gr) {
            gr.words.forEach((w, i) => {
              const ts = A.el('tspan', {}, text);
              const isNum = /\d/.test(w.w);
              ts.textContent = (i ? ' ' : '') + w.w.toUpperCase();
              if (w.hl || isNum) ts.setAttribute('fill', A.GOLD);
              if (isNum) ts.setAttribute('font-size', size * 1.35);
            });
            // auto-fit inside the safe zone (max 820px wide, centred)
            const bw = text.getBBox().width + size * 0.18;
            gr.fit = Math.min(1, 820 / (bw || 1));
          }
        }
        if (!gr) { g.setAttribute('opacity', 0); return; }
        const p = A.backOut(A.k(t, gr.start, 0.18));
        g.setAttribute('opacity', A.clamp((t - gr.start) / 0.06));
        g.setAttribute('transform', `translate(540 ${y}) scale(${A.lerp(0.8, 1, p) * gr.fit})`);
      }
    };
  };

  /* simple fixed title text (cold-open hook text, labels). Returns {set(t, t0, t1)} */
  A.title = function (parent, lines, opts = {}) {
    const size = opts.size ?? 80, y = opts.y ?? 400, color = opts.color ?? '#fff';
    const g = A.el('g', { 'data-safe': 'title' }, parent);
    const text = A.el('text', { x: 0, y: 0, 'font-family': A.FONT, 'font-size': size, fill: color, stroke: '#111', 'stroke-width': size * 0.18, 'paint-order': 'stroke', 'stroke-linejoin': 'round', 'text-anchor': 'middle' }, g);
    lines.forEach((l, i) => {
      const ts = A.el('tspan', { x: 0, dy: i ? size * 1.15 : 0 }, text);
      if (typeof l === 'object') { ts.textContent = l.text; if (l.color) ts.setAttribute('fill', l.color); } else ts.textContent = l;
    });
    let fit = null;
    return {
      set(t, t0, t1 = 1e9) {
        if (fit === null) fit = Math.min(1, 820 / ((text.getBBox().width + size * 0.18) || 1));
        const a = A.clamp((t - t0) / 0.08) * (1 - A.clamp((t - t1) / 0.15));
        g.setAttribute('opacity', a);
        g.setAttribute('transform', `translate(540 ${y}) scale(${A.lerp(0.85, 1, A.backOut(A.k(t, t0, 0.22))) * fit})`);
      }
    };
  };

  /* ---------- shared face + body drawing (string based) ---------- */
  const line = (d, w = 9, c = A.INK) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${A.INK}"/>`;
  const bigEye = (x, y, r = 27, p = 7, px = 0, py = 0) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${A.INK}" stroke-width="7"/>` + dot(x + px, y + py, p);
  const sweat = (x, y) => `<path d="M${x} ${y} q14 26 0 36 q-14 -10 0 -36z" fill="#6cc3ff" stroke="${A.INK}" stroke-width="4"/>`;
  const tear = (x, y) => `<path d="M${x} ${y} q-6 26 0 36 q6 -10 0 -36z" fill="#6cc3ff" stroke="${A.INK}" stroke-width="3"/>`;

  // faces drawn around head centre (x,y)
  A.FACES = {
    neutral: (x, y) => dot(x - 34, y, 9) + dot(x + 34, y, 9) + line(`M${x - 20} ${y + 56} Q${x} ${y + 64} ${x + 20} ${y + 56}`),
    blank: (x, y) => dot(x - 34, y, 9) + dot(x + 34, y, 9) + line(`M${x - 22} ${y + 56} L${x + 22} ${y + 56}`),
    smug: (x, y) => line(`M${x - 58} ${y - 4} L${x - 18} ${y - 4} M${x + 18} ${y - 4} L${x + 58} ${y - 4}`) + dot(x - 30, y + 6) + dot(x + 46, y + 6) + line(`M${x - 30} ${y + 56} Q${x + 15} ${y + 74} ${x + 52} ${y + 40}`),
    happy: (x, y) => line(`M${x - 50} ${y + 4} Q${x - 34} ${y - 14} ${x - 18} ${y + 4} M${x + 18} ${y + 4} Q${x + 34} ${y - 14} ${x + 50} ${y + 4}`) + `<path d="M${x - 34} ${y + 40} Q${x} ${y + 96} ${x + 34} ${y + 40}Z" fill="${A.INK}"/>`,
    talk: (x, y) => dot(x - 30, y, 9) + dot(x + 38, y, 9) + line(`M${x - 56} ${y - 34} L${x - 14} ${y - 40} M${x + 16} ${y - 42} L${x + 58} ${y - 36}`) + `<path d="M${x - 26} ${y + 44} Q${x + 8} ${y + 92} ${x + 42} ${y + 44}Z" fill="${A.INK}"/>`,
    thinking: (x, y) => bigEye(x - 34, y - 4, 22, 7, -8, -9) + bigEye(x + 34, y - 4, 22, 7, -8, -9) + line(`M${x - 6} ${y + 58} L${x + 26} ${y + 54}`),
    suspicious: (x, y) => line(`M${x - 58} ${y - 30} Q${x - 36} ${y - 58} ${x - 14} ${y - 34} M${x + 14} ${y - 12} L${x + 58} ${y - 14}`) +
      `<path d="M${x - 54} ${y + 2} Q${x - 34} ${y - 12} ${x - 14} ${y + 2} Q${x - 34} ${y + 18} ${x - 54} ${y + 2}Z" fill="#fff" stroke="${A.INK}" stroke-width="6"/>` +
      `<path d="M${x + 14} ${y + 4} L${x + 56} ${y + 4} Q${x + 35} ${y + 20} ${x + 14} ${y + 4}Z" fill="#fff" stroke="${A.INK}" stroke-width="6"/>` + dot(x - 24, y + 2, 7) + dot(x + 46, y + 8, 6) + line(`M${x - 10} ${y + 60} Q${x + 14} ${y + 62} ${x + 32} ${y + 48}`),
    shocked: (x, y) => bigEye(x - 36, y - 6) + bigEye(x + 36, y - 6) + `<ellipse cx="${x}" cy="${y + 62}" rx="18" ry="26" fill="${A.INK}"/>` + sweat(x + 112, y - 50),
    mindblown: (x, y) => bigEye(x - 36, y - 6, 30, 5) + bigEye(x + 36, y - 6, 30, 5) + `<path d="M${x - 36} ${y + 42} Q${x} ${y + 110} ${x + 36} ${y + 42}Z" fill="${A.INK}"/>`,
    sad: (x, y) => line(`M${x - 56} ${y - 24} L${x - 16} ${y - 34} M${x + 16} ${y - 34} L${x + 56} ${y - 24}`) + dot(x - 34, y, 9) + dot(x + 34, y, 9) + tear(x - 34, y + 14) + line(`M${x - 26} ${y + 66} Q${x} ${y + 46} ${x + 26} ${y + 66}`),
    determined: (x, y) => line(`M${x - 62} ${y - 18} L${x - 16} ${y - 4} M${x + 16} ${y - 4} L${x + 62} ${y - 18}`) + dot(x - 34, y + 12, 9) + dot(x + 34, y + 12, 9) + line(`M${x - 24} ${y + 58} L${x + 24} ${y + 54}`),
    angry: (x, y) => line(`M${x - 60} ${y - 26} L${x - 14} ${y - 4} M${x + 14} ${y - 4} L${x + 60} ${y - 26}`) + dot(x - 32, y + 10, 9) + dot(x + 32, y + 10, 9) + line(`M${x - 26} ${y + 64} Q${x} ${y + 46} ${x + 26} ${y + 64}`),
    scared: (x, y) => bigEye(x - 34, y - 4, 24, 6, 0, 6) + bigEye(x + 34, y - 4, 24, 6, 0, 6) + line(`M${x - 30} ${y + 60} l10 -8 l10 8 l10 -8 l10 8 l10 -8`, 6) + sweat(x + 108, y - 40)
  };

  // arm poses relative to shoulder point (x,y)
  A.ARMS = {
    rest: (x, y) => `M${x} ${y} L${x - 45} ${y + 90} M${x} ${y} L${x + 45} ${y + 90}`,
    hips: (x, y) => `M${x} ${y} L${x - 40} ${y + 50} L${x - 8} ${y + 90} M${x} ${y} L${x + 40} ${y + 50} L${x + 8} ${y + 90}`,
    point: (x, y) => `M${x} ${y} L${x - 55} ${y + 75} M${x} ${y} L${x + 70} ${y - 20} L${x + 120} ${y - 60}`,
    raise: (x, y) => `M${x} ${y} L${x - 80} ${y - 60} M${x} ${y} L${x + 80} ${y - 60}`,
    chin: (x, y) => `M${x} ${y} L${x - 55} ${y + 75} M${x} ${y} L${x + 55} ${y + 30} L${x + 34} ${y - 40}`,
    smug: (x, y) => `M${x} ${y} L${x - 60} ${y + 70} M${x} ${y} L${x + 52} ${y - 30} L${x + 64} ${y - 95}`,
    wave: (x, y) => `M${x} ${y} L${x - 45} ${y + 90} M${x} ${y} L${x + 60} ${y - 40} L${x + 70} ${y - 110}`,
    hold: (x, y) => `M${x} ${y} L${x - 30} ${y + 60} L${x + 30} ${y + 50} M${x} ${y} L${x + 40} ${y + 60} L${x + 30} ${y + 50}`,
    droop: (x, y) => `M${x} ${y} L${x - 30} ${y + 95} M${x} ${y} L${x + 30} ${y + 95}`,
    headgrab: (x, y) => `M${x} ${y} L${x - 70} ${y - 40} L${x - 60} ${y - 110} M${x} ${y} L${x + 70} ${y - 40} L${x + 60} ${y - 110}`
  };

  // cap button badge (brand.json host.badge): sun | star | heart | dot | none
  function badge(x, y, r) {
    const c = A.HOST.badgeColor;
    switch (A.HOST.badge) {
      case 'sun': {
        let g = '';
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g += `<line x1="${x + Math.cos(a) * r * 0.9}" y1="${y + Math.sin(a) * r * 0.9}" x2="${x + Math.cos(a) * r * 1.9}" y2="${y + Math.sin(a) * r * 1.9}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }
        return g + `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${A.INK}" stroke-width="2.5"/>`;
      }
      case 'star': {
        let d = '';
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.8 : r * 1.9; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); }
        return `<path d="${d}Z" fill="${c}" stroke="${A.INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
      }
      case 'heart': return `<path d="M${x} ${y + r * 1.4} C${x - r * 2.4} ${y - r * 0.2} ${x - r} ${y - r * 2} ${x} ${y - r * 0.6} C${x + r} ${y - r * 2} ${x + r * 2.4} ${y - r * 0.2} ${x} ${y + r * 1.4}Z" fill="${c}" stroke="${A.INK}" stroke-width="2.5"/>`;
      case 'none': return `<circle cx="${x}" cy="${y}" r="${r * 0.8}" fill="${A.HOST.tassel}" stroke="${A.INK}" stroke-width="2.5"/>`;
      default: return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${A.INK}" stroke-width="2.5"/>`;
    }
  }
  function gradCap(x, y, tilt, lift, tassel) {
    const sw = tassel || 0, cap = A.HOST.cap, ts = A.HOST.tassel;
    return `<g transform="translate(0 ${-lift}) rotate(${tilt} ${x} ${y})">
      <path d="M${x - 62} ${y + 10} Q${x} ${y + 34} ${x + 62} ${y + 10} L${x + 62} ${y - 14} L${x - 62} ${y - 14}Z" fill="${cap}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M${x - 125} ${y - 24} L${x} ${y - 66} L${x + 125} ${y - 24} L${x} ${y + 14}Z" fill="${cap}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M${x - 100} ${y - 28} L${x} ${y - 58}" stroke="#fff" stroke-opacity=".18" stroke-width="5" stroke-linecap="round"/>
      <path d="M${x} ${y - 26} Q${x + 80} ${y - 36 + sw * 0.3} ${x + 96 + sw} ${y + 26}" stroke="${ts}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M${x + 96 + sw} ${y + 18} l-12 44 l24 0z" fill="${ts}" stroke="${A.INK}" stroke-width="3" stroke-linejoin="round"/>
      ${badge(x, y - 26, 8)}</g>`;
  }

  /* ---------- HOST (stickman with graduation cap) ----------
     host = Antiks.host(parent)
     host.set({x, y, s, pose, t, lift, tilt, flip})
     poses: smug, explain, thinking, suspicious, shocked, mindblown, blank, sad, happy, wave
     Use Antiks.hostReact(t, events) to get {pose, lift, tilt} with the signature cap gag. */
  const HOST_POSES = {
    smug: { face: 'smug', arms: 'smug', tilt: -7 },
    explain: { face: 'talk', arms: 'point', tilt: -5, pointer: true },
    thinking: { face: 'thinking', arms: 'chin', tilt: 4, extra: 'question' },
    suspicious: { face: 'suspicious', arms: 'chin', tilt: -10 },
    shocked: { face: 'shocked', arms: 'raise', tilt: -18 },
    mindblown: { face: 'mindblown', arms: 'headgrab', tilt: 28, extra: 'stars' },
    blank: { face: 'blank', arms: 'rest', tilt: -7, extra: 'dots' },
    sad: { face: 'sad', arms: 'droop', tilt: 8 },
    happy: { face: 'happy', arms: 'raise', tilt: -4 },
    wave: { face: 'happy', arms: 'wave', tilt: -6 }
  };
  A.HOST_POSES = Object.keys(HOST_POSES);
  A.host = function (parent) {
    const g = A.el('g', {}, parent);
    return {
      g,
      set(o) {
        const P = HOST_POSES[o.pose || 'smug'];
        const x = 0, y = 0, t = o.t || 0;
        const breathe = Math.sin(t * 2.2) * 3;
        let s = '';
        s += `<ellipse cx="0" cy="340" rx="70" ry="10" fill="#000" opacity=".14"/>`;
        s += line(`M0 112 L0 250 M0 250 L-42 335 M0 250 L42 335`, 11);
        if (P.pointer) s += `<line x1="120" y1="90" x2="230" y2="-30" stroke="#8a5a2b" stroke-width="10" stroke-linecap="round"/><circle cx="230" cy="-30" r="8" fill="#d6453d"/>`;
        s += line(A.ARMS[P.arms](0, 150), 11);
        s += `<g transform="translate(0 ${breathe})"><ellipse cx="0" cy="0" rx="108" ry="115" fill="#fff" stroke="${A.INK}" stroke-width="9"/>`;
        s += A.FACES[P.face](0, 10);
        if (P.extra === 'question') s += `<text x="125" y="-60" font-size="80" font-family="${A.FONT}" fill="${A.INK}">?</text>`;
        if (P.extra === 'dots') s += `<text x="118" y="-60" font-size="56" font-family="${A.FONT}" fill="${A.INK}">...</text>`;
        if (P.extra === 'stars') [[-70, -150], [0, -175], [70, -150]].forEach(([dx, dy]) => { s += `<path d="M${dx} ${dy} l8 -18 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8z" fill="${A.GOLD}" stroke="${A.INK}" stroke-width="3"/>`; });
        const tassel = Math.sin(t * 9) * 4 * (o.lift ? 2 : 1);
        s += gradCap(0, -100, o.tilt ?? P.tilt, o.lift || 0, tassel) + '</g>';
        g.innerHTML = s;
        g.setAttribute('transform', `translate(${o.x} ${o.y}) scale(${(o.s || 1) * (o.flip ? -1 : 1)} ${o.s || 1})`);
      }
    };
  };
  /* events: [{t, pose}] sorted. Shocked => cap pops up & lands; mindblown => cap flies up spinning & lands. */
  A.hostReact = function (t, events) {
    let ev = events[0];
    for (const e of events) if (t >= e.t) ev = e;
    const d = t - ev.t;
    let lift = 0, tilt = undefined;
    if (ev.pose === 'shocked') { lift = d < 0.5 ? 70 * Math.sin(Math.PI * A.clamp(d / 0.5)) : 0; }
    if (ev.pose === 'mindblown') { const k = A.clamp(d / 1.0); lift = 260 * Math.sin(Math.PI * k); tilt = 28 + 360 * A.easeOut(k); }
    return { pose: ev.pose, lift, tilt, since: d };
  };
  /* pop-in scale for host entrances: returns 0..1 */
  A.popIn = (t, t0, t1 = 1e9) => A.backOut(A.k(t, t0, 0.25)) * (1 - A.easeIn(A.k(t, t1, 0.2)));

  /* ---------- DOODLE-PLUS story characters ----------
     ch = Antiks.doodle(parent, costume)
     costume: {shirt, pants, shoes, outfit:'shirt'|'barong'|'robe'|'dress'|'uniform', hat:'none'|'fieldcap'|'salakot'|'campaign'|'kepi'|'helmet'|'crown'|'bandana',
               hatColor, hair:'none'|'short'|'long'|'bun', hairColor, prop:'none'|'rifle'|'bolo'|'spear'|'book'|'flag'|'letter', stubble, mustache}
     ch.set({x, y, s, face, arms, walk, t, flip}) */
  function hat(type, c, x, y) {
    c = c || '#9c8a58';
    switch (type) {
      case 'fieldcap': return `<path d="M${x - 98} ${y - 40} Q${x - 100} ${y - 120} ${x} ${y - 122} Q${x + 100} ${y - 120} ${x + 98} ${y - 40}Z" fill="${c}" stroke="${A.INK}" stroke-width="6"/>
        <path d="M${x - 98} ${y - 44} L${x - 112} ${y + 30} L${x - 60} ${y - 30}Z M${x + 98} ${y - 44} L${x + 112} ${y + 30} L${x + 60} ${y - 30}Z" fill="${c}" stroke="${A.INK}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M${x - 80} ${y - 42} Q${x} ${y - 20} ${x + 80} ${y - 42} L${x + 70} ${y - 30} Q${x} ${y - 6} ${x - 70} ${y - 30}Z" fill="#6f6040" stroke="${A.INK}" stroke-width="5"/>`;
      case 'salakot': return `<path d="M${x - 150} ${y - 50} L${x} ${y - 150} L${x + 150} ${y - 50} Q${x} ${y - 30} ${x - 150} ${y - 50}Z" fill="${c === '#9c8a58' ? '#d9b26a' : c}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>
        <path d="M${x - 100} ${y - 70} L${x} ${y - 150} L${x + 100} ${y - 70} M${x - 50} ${y - 60} L${x} ${y - 150} L${x + 50} ${y - 60}" stroke="#a5813f" stroke-width="4" fill="none"/><circle cx="${x}" cy="${y - 152}" r="9" fill="#8a6a2a" stroke="${A.INK}" stroke-width="3"/>`;
      case 'campaign': return `<ellipse cx="${x}" cy="${y - 70}" rx="150" ry="24" fill="${c}" stroke="${A.INK}" stroke-width="6"/>
        <path d="M${x - 70} ${y - 74} Q${x - 70} ${y - 150} ${x - 30} ${y - 160} L${x} ${y - 140} L${x + 30} ${y - 160} Q${x + 70} ${y - 150} ${x + 70} ${y - 74}Z" fill="${c}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/><rect x="${x - 70}" y="${y - 96}" width="140" height="14" fill="#4d3d27"/>`;
      case 'kepi': return `<path d="M${x - 80} ${y - 60} L${x - 70} ${y - 150} L${x + 70} ${y - 150} L${x + 80} ${y - 60}Z" fill="${c}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>
        <path d="M${x - 85} ${y - 58} Q${x - 30} ${y - 30} ${x + 30} ${y - 40} L${x + 85} ${y - 58}Z" fill="#1b1b1b" stroke="${A.INK}" stroke-width="5"/><rect x="${x - 78}" y="${y - 80}" width="156" height="12" fill="${A.GOLD}"/>`;
      case 'helmet': return `<path d="M${x - 115} ${y - 40} Q${x - 110} ${y - 150} ${x} ${y - 150} Q${x + 110} ${y - 150} ${x + 115} ${y - 40}Z" fill="${c}" stroke="${A.INK}" stroke-width="6"/><path d="M${x - 130} ${y - 38} L${x + 130} ${y - 38}" stroke="${A.INK}" stroke-width="10" stroke-linecap="round"/>`;
      case 'crown': return `<path d="M${x - 70} ${y - 90} L${x - 70} ${y - 150} L${x - 35} ${y - 115} L${x} ${y - 160} L${x + 35} ${y - 115} L${x + 70} ${y - 150} L${x + 70} ${y - 90}Z" fill="${A.GOLD}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>`;
      case 'bandana': return `<path d="M${x - 104} ${y - 50} Q${x} ${y - 140} ${x + 104} ${y - 50} Q${x} ${y - 80} ${x - 104} ${y - 50}Z" fill="${c}" stroke="${A.INK}" stroke-width="5"/><path d="M${x + 100} ${y - 56} l40 10 l-20 30z" fill="${c}" stroke="${A.INK}" stroke-width="4"/>`;
      default: return '';
    }
  }
  function hair(type, c, x, y) {
    c = c || '#1d1d1d';
    if (type === 'short') return `<path d="M${x - 104} ${y - 20} Q${x - 100} ${y - 118} ${x} ${y - 120} Q${x + 100} ${y - 118} ${x + 104} ${y - 20} Q${x + 70} ${y - 80} ${x} ${y - 78} Q${x - 70} ${y - 80} ${x - 104} ${y - 20}Z" fill="${c}"/>`;
    if (type === 'long') return `<path d="M${x - 108} ${y + 120} Q${x - 130} ${y - 120} ${x} ${y - 122} Q${x + 130} ${y - 120} ${x + 108} ${y + 120} L${x + 80} ${y + 120} Q${x + 90} ${y - 70} ${x} ${y - 76} Q${x - 90} ${y - 70} ${x - 80} ${y + 120}Z" fill="${c}"/>`;
    if (type === 'bun') return hair('short', c, x, y) + `<circle cx="${x}" cy="${y - 130}" r="34" fill="${c}"/>`;
    return '';
  }
  function prop(type, x, y) {
    switch (type) {
      case 'rifle': return `<g transform="rotate(-38 ${x} ${y})"><rect x="${x - 150}" y="${y - 6}" width="260" height="10" fill="#333"/><path d="M${x + 100} ${y - 10} L${x + 190} ${y - 18} L${x + 200} ${y + 14} L${x + 100} ${y + 8}Z" fill="#6b4524" stroke="${A.INK}" stroke-width="3"/></g>`;
      case 'bolo': return `<path d="M${x + 30} ${y - 40} Q${x + 120} ${y - 150} ${x + 90} ${y - 200} Q${x + 70} ${y - 120} ${x + 20} ${y - 50}Z" fill="#c9c9c9" stroke="${A.INK}" stroke-width="4"/><rect x="${x + 10}" y="${y - 50}" width="22" height="50" rx="6" fill="#6b4524" stroke="${A.INK}" stroke-width="3" transform="rotate(30 ${x + 20} ${y - 25})"/>`;
      case 'spear': return `<line x1="${x + 40}" y1="${y + 120}" x2="${x + 40}" y2="${y - 260}" stroke="#7a5230" stroke-width="10" stroke-linecap="round"/><path d="M${x + 40} ${y - 320} l-18 60 l36 0z" fill="#bbb" stroke="${A.INK}" stroke-width="4"/>`;
      case 'book': return `<rect x="${x - 10}" y="${y - 30}" width="70" height="90" rx="4" fill="#8b2e2e" stroke="${A.INK}" stroke-width="4"/>`;
      case 'letter': return `<rect x="${x - 5}" y="${y - 30}" width="80" height="56" fill="#f4efe6" stroke="${A.INK}" stroke-width="4"/><path d="M${x - 5} ${y - 30} L${x + 35} ${y} L${x + 75} ${y - 30}" stroke="${A.INK}" stroke-width="3" fill="none"/>`;
      case 'flag': return `<line x1="${x + 40}" y1="${y + 120}" x2="${x + 40}" y2="${y - 250}" stroke="#6b4524" stroke-width="8"/><rect x="${x + 44}" y="${y - 250}" width="130" height="80" fill="#fff" stroke="${A.INK}" stroke-width="4"/>`;
      default: return '';
    }
  }
  A.doodle = function (parent, c = {}) {
    const g = A.el('g', {}, parent);
    return {
      g,
      set(o) {
        const t = o.t || 0, walk = o.walk || 0;
        const sw = Math.sin(t * 9) * 26 * walk, bob = -Math.abs(Math.sin(t * 9)) * 6 * walk;
        const shirt = c.shirt || '#5b7fb8', pants = c.pants || '#3d3a36', shoes = c.shoes || '#2a2118';
        let s = `<ellipse cx="0" cy="340" rx="85" ry="12" fill="#000" opacity=".22"/>`;
        // legs
        s += line(`M-16 250 L${-34 + sw} 330 M16 250 L${34 - sw} 330`, 12, pants);
        s += line(`M${-34 + sw} 332 L${-56 + sw} 334 M${34 - sw} 332 L${56 - sw} 334`, 15, shoes);
        s += `<g transform="translate(0 ${bob})">`;
        if (c.prop === 'rifle' || c.prop === 'spear' || c.prop === 'flag') s += prop(c.prop, 0, 170);
        // torso by outfit
        const of = c.outfit || 'shirt';
        if (of === 'robe') s += `<path d="M-50 112 Q0 98 50 112 L90 330 L-90 330Z" fill="${shirt}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/><path d="M-30 180 L30 180" stroke="#f4efe6" stroke-width="6"/>`;
        else if (of === 'dress') s += `<path d="M-48 112 Q0 98 48 112 L50 190 L100 320 L-100 320 L-50 190Z" fill="${shirt}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>`;
        else {
          s += `<path d="M-52 118 Q0 98 52 118 L46 262 L-46 262Z" fill="${shirt}" stroke="${A.INK}" stroke-width="6" stroke-linejoin="round"/>`;
          if (of === 'barong') s += `<path d="M0 118 L0 240 M-20 140 l20 16 l20 -16 M-20 170 l20 16 l20 -16 M-20 200 l20 16 l20 -16" stroke="#cdbf9b" stroke-width="3" fill="none"/>`;
          if (of === 'uniform') s += `<rect x="-48" y="234" width="96" height="12" fill="#4b3a22"/><rect x="-40" y="140" width="28" height="24" rx="3" fill="none" stroke="${A.INK}" stroke-width="3"/><rect x="12" y="140" width="28" height="24" rx="3" fill="none" stroke="${A.INK}" stroke-width="3"/>`;
        }
        // arms
        // clothed characters: left arm from the left shoulder, right arm from the right shoulder
        const armPath = A.ARMS[o.arms || 'rest'](0, 140).split('M').filter(Boolean).map((sub, i) =>
          'M' + sub.replace(/(-?[\d.]+)\s+(-?[\d.]+)/g, (m, x, y) => `${+x + (i === 0 ? -44 : 44)} ${y}`)).join(' ');
        s += line(armPath, 21, A.INK) + line(armPath, 13, shirt);   // ink outline so sleeves read against the torso
        if (c.prop && !['rifle', 'spear', 'flag'].includes(c.prop)) s += prop(c.prop, 40, 200);
        // head
        if (c.hair === 'long') s += hair('long', c.hairColor, 0, 0);
        s += `<ellipse cx="0" cy="0" rx="104" ry="110" fill="#fff" stroke="${A.INK}" stroke-width="9"/>`;
        if (c.hair && c.hair !== 'long') s += hair(c.hair, c.hairColor, 0, 0);
        s += A.FACES[o.face || 'neutral'](0, 14);
        if (c.stubble) for (let i = 0; i < 14; i++) s += `<circle cx="${-50 + (i * 37) % 100}" cy="${66 + (i * 13) % 26}" r="2.2" fill="#555"/>`;
        if (c.mustache) s += `<path d="M-34 60 Q-17 46 0 54 Q17 46 34 60 Q17 66 0 62 Q-17 66 -34 60Z" fill="${c.hairColor || '#3a2a1a'}"/>`;
        s += hat(c.hat, c.hatColor, 0, 0);
        s += '</g>';
        g.innerHTML = s;
        g.setAttribute('transform', `translate(${o.x} ${o.y}) scale(${(o.s || 1) * (o.flip ? -1 : 1)} ${o.s || 1})`);
      }
    };
  };

  /* ---------- ARCHIVE PHOTO (signature reveal) ----------
     ar = Antiks.archive(parent, {href, label, caption, credit, x, y, w, h, tilt})
     href: path to a REAL public-domain image (relative to scene.html). Without href a grey placeholder is drawn (preview only!).
     ar.set(t, tIn, tOut): slams in with flash at tIn, slides out at tOut. */
  let defsDone = false;
  function ensureDefs(svg) {
    if (defsDone) return; defsDone = true;
    const d = A.el('defs', {}, svg);
    d.innerHTML = `<filter id="sepia"><feColorMatrix type="matrix" values="0.39 0.77 0.19 0 0 0.35 0.69 0.17 0 0 0.27 0.53 0.13 0 0 0 0 0 1 0"/></filter>
      <radialGradient id="vig" cx="50%" cy="50%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.75"/></radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer></filter>`;
  }
  A.archive = function (parent, o) {
    ensureDefs(A.svg());
    const w = o.w ?? 640, h = o.h ?? 520, x = o.x ?? 540, y = o.y ?? 900;
    const g = A.el('g', { 'data-safe': 'archive' }, parent);
    const inner = o.href
      ? `<image href="${o.href}" x="${-w / 2 + 24}" y="${-h / 2 + 24}" width="${w - 48}" height="${h - 130}" preserveAspectRatio="xMidYMid slice" ${o.sepia === false ? '' : 'filter="url(#sepia)"'}/>`
      : `<rect x="${-w / 2 + 24}" y="${-h / 2 + 24}" width="${w - 48}" height="${h - 130}" fill="#8d8a84"/><text x="0" y="${-40}" font-size="30" font-family="${A.FONT}" fill="#fff" text-anchor="middle">${o.label || 'ARCHIVE PHOTO (placeholder)'}</text>`;
    g.innerHTML = `<rect x="${-w / 2 + 10}" y="${-h / 2 + 14}" width="${w}" height="${h}" fill="#000" opacity=".35"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${A.PAPER}" stroke="#222" stroke-width="3"/>${inner}
      <text x="0" y="${h / 2 - 62}" font-size="34" font-family="'Courier New', monospace" font-weight="bold" fill="#222" text-anchor="middle">${o.caption || ''}</text>
      <text x="0" y="${h / 2 - 24}" font-size="20" font-family="Arial" fill="#555" text-anchor="middle">${o.credit || ''}</text>
      <rect x="-60" y="${-h / 2 - 16}" width="120" height="34" fill="#e9d9a0" opacity=".85" transform="rotate(-5)"/>`;
    const flash = A.el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#fff', opacity: 0 }, A.svg());
    return {
      set(t, tIn, tOut = 1e9) {
        const kin = A.backOut(A.k(t, tIn, 0.28)), kout = A.easeIn(A.k(t, tOut, 0.3));
        const vis = t >= tIn && t < tOut + 0.3;
        g.setAttribute('opacity', vis ? 1 : 0);
        g.setAttribute('transform', `translate(${x + kout * 900} ${y}) rotate(${(o.tilt ?? 5) + (1 - kin) * 14}) scale(${A.lerp(1.5, 1, kin)})`);
        flash.setAttribute('opacity', t >= tIn ? 0.75 * (1 - A.clamp((t - tIn) / 0.18)) : 0);
      }
    };
  };

  /* ---------- FX overlays (add last so they sit on top) ---------- */
  A.fx = {
    vignette(svg, opacity = 0.8) { ensureDefs(svg); return A.el('rect', { width: 1080, height: 1920, fill: 'url(#vig)', opacity, 'pointer-events': 'none' }, svg); },
    grain(svg) { ensureDefs(svg); return A.el('rect', { width: 1080, height: 1920, filter: 'url(#grain)', 'pointer-events': 'none' }, svg); },
    /* fade-to-colour overlay: f.set(opacity) */
    cover(svg, color = '#000') { const r = A.el('rect', { width: 1080, height: 1920, fill: color, opacity: 0 }, svg); return { set: a => r.setAttribute('opacity', a) }; },
    /* VHS-style rewind between tStart..tEnd, label e.g. '1944' */
    rewind(svg, label) {
      const g = A.el('g', { opacity: 0 }, svg);
      let lines = '';
      for (let i = 0; i < 40; i++) lines += `<rect x="0" y="${i * 48}" width="1080" height="6" fill="#fff" opacity=".12"/>`;
      g.innerHTML = `<rect width="1080" height="1920" fill="#1a2a3a" opacity=".35"/>${lines}
        <text x="80" y="230" font-size="90" font-family="${A.FONT}" fill="#fff" stroke="#111" stroke-width="12" paint-order="stroke">&#9664;&#9664;</text>
        <text x="540" y="1060" font-size="170" font-family="${A.FONT}" fill="#fff" stroke="#111" stroke-width="20" paint-order="stroke" text-anchor="middle">${label || ''}</text>`;
      return {
        set(t, t0, t1) {
          const on = t >= t0 && t < t1;
          g.setAttribute('opacity', on ? 1 : 0);
          g.setAttribute('transform', on ? `translate(${A.noise(t * 30, 5) * 14} 0)` : '');
        }
      };
    }
  };

  /* ---------- BACKGROUNDS (extend per story; keep them rich, characters stay simple) ---------- */
  const leaf = (x, y, l, w, a, c) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 Q${l * 0.5} ${-w} ${l} 0 Q${l * 0.5} ${w} 0 0Z" fill="${c}"/><path d="M4 0 L${l - 8} 0" stroke="#000" stroke-opacity=".15" stroke-width="3"/></g>`;
  A.bg = {
    gradient(parent, top, bottom, id) {
      ensureDefs(A.svg());
      const gid = id || 'g' + Math.floor(Math.random() * 1e9);
      const lg = A.el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, A.svg().querySelector('defs'));
      A.el('stop', { offset: 0, 'stop-color': top }, lg); A.el('stop', { offset: 1, 'stop-color': bottom }, lg);
      return A.el('rect', { x: -1000, y: -1000, width: 3080, height: 3920, fill: `url(#${gid})` }, parent);
    },
    jungle(parent, seed = 5) {
      const R = A.rng(seed);
      A.bg.gradient(parent, '#173322', '#2c5434');
      const g = A.el('g', {}, parent);
      let s = '';
      for (let i = 0; i < 5; i++) { const x = 150 + i * 200; s += `<path d="M${x} -200 L${x + 90} -200 L${x + 260} 1500 L${x + 120} 1500Z" fill="#fff3b0" opacity=".08"/>`; }
      for (let i = 0; i < 70; i++) s += leaf(-100 + R() * 1280, 100 + R() * 1300, 140 + R() * 120, 40 + R() * 30, R() * 360, '#21452d');
      for (let i = 0; i < 40; i++) s += leaf(-100 + R() * 1280, 450 + R() * 1100, 170 + R() * 120, 50 + R() * 30, R() * 360, '#2d6339');
      s += `<rect x="60" y="-200" width="70" height="1760" fill="#3a2d20"/><rect x="900" y="-200" width="90" height="1760" fill="#33271c"/>`;
      s += `<path d="M-300 1480 Q540 1430 1380 1490 L1380 2200 L-300 2200Z" fill="#3b2f22"/>`;
      g.innerHTML = s;
      return g;
    },
    jungleFront(parent, seed = 9) {
      const R = A.rng(seed), g = A.el('g', {}, parent);
      let s = '';
      for (let i = 0; i < 14; i++) s += leaf(R() * 1080, 1560 + R() * 360, 220 + R() * 120, 60 + R() * 30, -30 + R() * 60 + (R() < 0.5 ? 180 : 0), '#3f8a48');
      g.innerHTML = s; return g;
    },
    seaSky(parent, seed = 3) {
      const R = A.rng(seed);
      A.bg.gradient(parent, '#7db4df', '#e6f0f0');
      const g = A.el('g', {}, parent);
      let s = `<rect x="-300" y="1050" width="1680" height="1200" fill="#2f7fb0"/>`;
      for (let i = 0; i < 18; i++) s += `<path d="M${R() * 1080 - 60} ${1080 + R() * 500} q30 -14 60 0" stroke="#bfe3f5" stroke-width="5" fill="none" opacity=".7"/>`;
      s += `<path d="M-300 1500 Q540 1420 1380 1520 L1380 2200 L-300 2200Z" fill="#e8d39a"/>`;
      for (let i = 0; i < 3; i++) { const x = 140 + R() * 800, y = 140 + R() * 300; s += `<g opacity=".92"><circle cx="${x}" cy="${y}" r="40" fill="#fff"/><circle cx="${x + 45}" cy="${y - 15}" r="50" fill="#fff"/><circle cx="${x + 95}" cy="${y}" r="38" fill="#fff"/></g>`; }
      g.innerHTML = s; return g;
    },
    paper(parent) {
      ensureDefs(A.svg());
      const r = A.el('rect', { x: -1000, y: -1000, width: 3080, height: 3920, fill: A.PAPER }, parent);
      A.el('rect', { x: -1000, y: -1000, width: 3080, height: 3920, filter: 'url(#grain)' }, parent);
      return r;
    }
  };
})();
