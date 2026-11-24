"""Antiks Stories — directed Kokoro narration.

Usage (from the project root, with the Kokoro venv):
  tools\\kokoro-venv\\Scripts\\python.exe .claude\\skills\\antiks-stories\\scripts\\narrate.py videos\\<slug>
  tools\\kokoro-venv\\Scripts\\python.exe .claude\\skills\\antiks-stories\\scripts\\narrate.py videos\\<slug> --names "Mactan,Lapu-Lapu"

Reads   videos/<slug>/script.json
          {"voice": "bm_george", "lines": [{"text": "His orders were *simple*.", "speed": 0.95, "pause": 0.45}, ...]}
          *word* = highlighted caption word (gold). speed 0.8-1.1 (default 1.0). pause = silence after line (s).
Writes  voice.wav     polished narration (44.1 kHz)
        timings.json  {"duration", "lines":[{text,start,end}], "words":[{w,start,end,hl,line}]}
--names writes names-preview.wav (each name said twice) for the pronunciation checkpoint.
Pronunciation fixes live in data/pronunciations.json: {"Name": "replacement"} where replacement is either
a respelling ("Mak-tahn") or Kokoro phonemes ("[Mactan](/mɑktˈɑn/)"). Applied to speech only, never captions.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000


def load_pron():
    p = os.path.join(SKILL, "data", "pronunciations.json")
    if not os.path.exists(p):
        return {}
    with open(p, encoding="utf-8") as f:
        return {k: v for k, v in json.load(f).items() if not k.startswith("_")}


def apply_pron(text, pron):
    for name, rep in pron.items():
        text = re.sub(r"(?<![\w\[])" + re.escape(name) + r"(?![\w\]])", rep, text)
    return text


def trim(audio, thr=0.012, keep=0.03):
    idx = np.where(np.abs(audio) > thr)[0]
    if len(idx) == 0:
        return audio, 0.0
    a = max(0, idx[0] - int(keep * SR))
    b = min(len(audio), idx[-1] + int(keep * SR))
    return audio[a:b], a / SR


def polish(src, dst):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af",
                    "highpass=f=70,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.5:g=1.5,"
                    "acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
                    "-ar", "44100", dst], check=True)


def main():
    vdir = os.path.abspath(sys.argv[1])
    names = None
    if "--names" in sys.argv:
        names = [n.strip() for n in sys.argv[sys.argv.index("--names") + 1].split(",") if n.strip()]

    with open(os.path.join(vdir, "script.json"), encoding="utf-8") as f:
        script = json.load(f)
    brand_path = os.path.join(SKILL, "data", "brand.json")
    brand = json.load(open(brand_path, encoding="utf-8")) if os.path.exists(brand_path) else {}
    voice = script.get("voice") or brand.get("narrator_voice", "bm_george")

    from kokoro import KPipeline  # heavy import after arg parsing
    pipe = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
    pron = load_pron()

    def synth(text, speed):
        audio, toks, off = [], [], 0.0
        for r in pipe(text, voice=voice, speed=speed):
            a = np.asarray(r.audio if hasattr(r, "audio") else r[2], dtype=np.float32)
            for tk in (getattr(r, "tokens", None) or []):
                if tk.start_ts is not None and re.search(r"\w", tk.text or ""):
                    toks.append((tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts)))
            audio.append(a)
            off += len(a) / SR
        return np.concatenate(audio), toks

    if names:
        parts = []
        for n in names:
            a, _ = synth(apply_pron(f"{n}. The story of {n}.", pron), 0.95)
            parts += [a, np.zeros(int(SR * 0.8), dtype=np.float32)]
        out = os.path.join(vdir, "names-preview.wav")
        sf.write(out, np.concatenate(parts), SR)
        print("names preview:", out)
        return

    parts, lines, words, t = [], [], [], 0.0
    for li, ln in enumerate(script["lines"]):
        shown = ln["text"]
        spoken = apply_pron(shown.replace("*", ""), pron)
        audio, toks = synth(spoken, ln.get("speed", 1.0))
        audio, lead = trim(audio)
        dur = len(audio) / SR
        lines.append({"text": shown.replace("*", ""), "start": round(t, 3), "end": round(t + dur, 3)})
        # caption words come from the SHOWN text; align with Kokoro token times when counts match
        shown_words = shown.split()
        clean = [w.replace("*", "") for w in shown_words]
        hl, inside = [], False
        for w in shown_words:
            starts = w.startswith("*")
            ends = w.rstrip(".,!?;:'\"").endswith("*")
            hl.append(inside or starts)
            inside = (inside or starts) and not ends
        if toks and len(toks) == len(clean):
            times = [(max(0.0, s - lead), max(0.0, e - lead)) for _, s, e in toks]
        else:  # fallback: spread over the line by character length
            total = sum(len(w) for w in clean) or 1
            acc, times = 0.0, []
            for w in clean:
                s = acc / total * dur
                acc += len(w)
                times.append((s, acc / total * dur))
        for w, h, (s, e) in zip(clean, hl, times):
            words.append({"w": w, "start": round(t + s, 3), "end": round(t + min(e, dur), 3), "hl": h, "line": li})
        parts.append(audio)
        pause = ln.get("pause", 0.25)
        parts.append(np.zeros(int(SR * pause), dtype=np.float32))
        t += dur + pause

    raw = os.path.join(vdir, "_voice_raw.wav")
    sf.write(raw, np.concatenate(parts), SR)
    polish(raw, os.path.join(vdir, "voice.wav"))
    os.remove(raw)
    with open(os.path.join(vdir, "timings.json"), "w", encoding="utf-8") as f:
        json.dump({"duration": round(t, 3), "lines": lines, "words": words}, f, indent=1, ensure_ascii=False)
    print(f"voice.wav + timings.json written ({t:.1f}s, {len(words)} words)")


if __name__ == "__main__":
    main()
