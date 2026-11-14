#!/usr/bin/env python3
"""Build a ready-to-render HyperFrames project for one episode.

    python3 tools/build_episode.py ep01 --channel "Lumo & Gaja"

What it does
  1. Reads episodes/<ep>/script.md (the line table; IDs like L01).
  2. Finds a voice file per line in episodes/<ep>/audio/ (ElevenLabs etc.),
     named  <ep>_<ID>.mp3|wav|m4a  or  <ID>.mp3|wav.
     A missing file gets a PLACEHOLDER voice (Piper, Indonesian) if available.
  3. Measures every file (ffprobe) and lays the lines on a timeline
     ([JEDA n detik] lines become silence).
  4. Writes episodes/<ep>/project/ : index.html + assets (engine, audio, sfx)
     and episodes/<ep>/<ep>.srt (subtitles with the same timing).

Optional: episodes/<ep>/music/music.(mp3|wav) is mixed under the voice.
Env for placeholder voices: PIPER_PY (python with piper), PIPER_MODEL (.onnx).
"""
import argparse, json, os, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
START, GAP, SECTION_GAP, JEDA_PAD, TAIL = 1.0, 0.35, 0.8, 0.2, 3.0
AUDIO_EXT = ("mp3", "wav", "m4a", "ogg")


def ffdur(p: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], text=True)
    return round(float(out.strip()), 3)


def parse_script(path: Path, channel: str):
    lines, section = [], 0
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.startswith("## "):
            section += 1
            continue
        m = re.match(r"\|\s*(L\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", raw)
        if not m:
            continue
        lid, spk, text = m.group(1), m.group(2).strip(), m.group(3).strip().replace("[NAMA CHANNEL]", channel)
        j = re.search(r"\[JEDA\s*(\d+(?:[.,]\d+)?)\s*detik\]", text)
        lines.append({"id": lid, "speaker": spk, "text": text, "section": section, "jeda": float(j.group(1).replace(",", ".")) if j else 0})
    return lines


def find_audio(ep_dir: Path, ep: str, lid: str):
    for ext in AUDIO_EXT:
        for name in (f"{ep}_{lid}.{ext}", f"{lid}.{ext}"):
            p = ep_dir / "audio" / name
            if p.exists():
                return p
    return None


def placeholder(ep_dir: Path, lid: str, text: str):
    py, model = os.environ.get("PIPER_PY"), os.environ.get("PIPER_MODEL")
    if not (py and model and Path(py).exists() and Path(model).exists()):
        return None
    out = ep_dir / "build" / "placeholder" / f"{lid}.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        subprocess.run([py, "-m", "piper", "-m", model, "-c", model + ".json", "--length-scale", "1.1", "-f", str(out)], input=text, text=True, check=True, capture_output=True)
    return out


def srt_time(t: float) -> str:
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--channel", default="Lumo & Gaja")
    ap.add_argument("--no-burn-subs", action="store_true")
    a = ap.parse_args()

    ep_dir = ROOT / "episodes" / a.ep
    SFXDUR = {p.stem: ffdur(p) for p in (ROOT / "sfx").glob("*.mp3")}
    lines = parse_script(ep_dir / "script.md", a.channel)
    cards = json.loads((ep_dir / "cards.json").read_text(encoding="utf-8"))
    sfx = json.loads((ep_dir / "sfx.json").read_text(encoding="utf-8"))
    proj = ep_dir / "project"
    if proj.exists():
        shutil.rmtree(proj)
    (proj / "assets" / "audio").mkdir(parents=True)
    (proj / "assets" / "sfx").mkdir(parents=True)
    (proj / "assets" / "vendor").mkdir(parents=True)

    t, prev_section, used_placeholder = START, 0, []
    for ln in lines:
        if ln["section"] != prev_section and prev_section != 0:
            t += SECTION_GAP
        prev_section = ln["section"]
        ln["start"] = round(t, 3)
        if ln["jeda"]:
            ln["dur"] = ln["jeda"]; ln["file"] = None
            t += ln["dur"] + JEDA_PAD
            continue
        src = find_audio(ep_dir, a.ep, ln["id"])
        if src is None:
            src = placeholder(ep_dir, ln["id"], ln["text"]); used_placeholder.append(ln["id"])
        if src is None:
            sys.exit(f"No audio for {ln['id']} and no placeholder voice available (set PIPER_PY / PIPER_MODEL, or add the file).")
        ln["dur"] = ffdur(src)
        name = f"{ln['id']}{src.suffix}"
        shutil.copy2(src, proj / "assets" / "audio" / name); ln["file"] = name
        t += ln["dur"] + GAP
    total = round(t + TAIL, 3)

    START_T = {l["id"]: l["start"] for l in lines}; DUR = {l["id"]: l["dur"] for l in lines}
    END_T = {k: round(START_T[k] + DUR[k], 3) for k in START_T}
    ref = lambda r, e=False: 0.0 if r == "start" else total if r == "end" else (END_T[r] if e else START_T[r])

    EPJS = {"channel": a.channel, "start": START_T, "dur": DUR, "total": total, "lines": [{k: l[k] for k in ("id", "speaker", "text", "start", "dur", "jeda")} for l in lines]}
    (proj / "assets" / "ep.js").write_text("window.EP = " + json.dumps(EPJS, ensure_ascii=False) + ";\n", encoding="utf-8")

    # engine + vendor + choreo + sfx
    for f in ("characters.js", "world.js", "stage.js"):
        shutil.copy2(ROOT / "engine" / f, proj / "assets" / f)
    for f in ("three.min.js", "gsap.min.js"):
        shutil.copy2(ROOT / "vendor" / f, proj / "assets" / "vendor" / f)
    shutil.copy2(ep_dir / "choreo.js", proj / "assets" / "choreo.js")
    for f in {c["file"] for c in sfx}:
        shutil.copy2(ROOT / "sfx" / f"{f}.mp3", proj / "assets" / "sfx" / f"{f}.mp3")
    for f in ("hyperframes.json", "meta.json", "package.json"):
        shutil.copy2(ROOT / "sheet" / f, proj / f)
    for f in ("meta.json", "package.json"):
        p = proj / f; p.write_text(p.read_text().replace("character-sheet", f"kids-{a.ep}"))

    # ---- html pieces
    audio = []
    for l in lines:
        if l["file"]:
            audio.append(f'      <audio id="v-{l["id"]}" class="clip" src="assets/audio/{l["file"]}" data-start="{l["start"]}" data-duration="{l["dur"]}" data-track-index="2" data-volume="1.7"></audio>')
    for i, c in enumerate(sfx, 1):
        s = round(START_T[c["at"]] + c.get("offset", 0), 3)
        audio.append(f'      <audio id="sfx-{i}" class="clip" src="assets/sfx/{c["file"]}.mp3" data-start="{max(s, 0)}" data-duration="{SFXDUR[c["file"]]}" data-track-index="{3 + i}" data-volume="{c.get("vol", 0.5)}"></audio>')
    music = next((p for p in (ep_dir / "music").glob("music.*")) , None) if (ep_dir / "music").exists() else None
    if music:
        shutil.copy2(music, proj / "assets" / ("music" + music.suffix))
        audio.append(f'      <audio id="music" class="clip" src="assets/music{music.suffix}" data-start="0" data-duration="{min(ffdur(music), total)}" data-track-index="30" data-volume="0.22"></audio>')

    capcls = {"N": "capN", "L": "capL"}
    caps = []
    for l in lines:
        if l["jeda"] or a.no_burn_subs:
            continue
        caps.append(f'      <div id="cap-{l["id"]}" class="clip cap {capcls.get(l["speaker"], "capN")}" data-start="{l["start"]}" data-duration="{l["dur"]}">{l["text"]}</div>')
    cardhtml, cardjs = [], []
    for i, c in enumerate(cards["cards"]):
        s, e = ref(c["from"]), ref(c["to"], True)
        cls = "card sub" if c.get("sub") else "card"
        cardhtml.append(f'      <div id="card-{i}" class="clip {cls}" style="color:{c["color"]};font-size:{c["size"]}px" data-start="{s}" data-duration="{round(e - s, 3)}">{c["text"]}</div>')
        cardjs.append(f'["#card-{i}", {s}, {1 if c.get("sub") else 0}]')
    ts, te = ref(cards["title"]["from"]), ref(cards["title"]["to"], True)
    ns, ne = ref(cards["end"]["from"]), ref(cards["end"]["to"], True)
    cardhtml.append(f'      <div id="title" class="clip bigtitle" data-start="{ts}" data-duration="{round(te - ts, 3)}"><span>{a.channel}</span><small>Lagu &amp; Belajar Anak</small></div>')
    cardhtml.append(f'      <div id="endcard" class="clip bigtitle" data-start="{ns}" data-duration="{round(ne - ns, 3)}"><span>{a.channel}</span><small>Sampai jumpa lagi!</small></div>')

    html = TEMPLATE
    for k, v in {"TOTAL": str(total), "AUDIO": "\n".join(audio), "CAPS": "\n".join(caps), "CARDS": "\n".join(cardhtml),
                 "CAPJS": json.dumps([[f'#cap-{l["id"]}', l["start"]] for l in lines if not l["jeda"] and not a.no_burn_subs]),
                 "CARDJS": "[" + ",".join(cardjs) + "]", "TITLEJS": json.dumps([["#title", ts], ["#endcard", ns]])}.items():
        html = html.replace(f"%%{k}%%", v)
    (proj / "index.html").write_text(html, encoding="utf-8")

    # ---- subtitles
    srt, n = [], 1
    for l in lines:
        if l["jeda"]:
            continue
        srt.append(f"{n}\n{srt_time(l['start'])} --> {srt_time(l['start'] + l['dur'])}\n{l['text']}\n"); n += 1
    (ep_dir / f"{a.ep}.srt").write_text("\n".join(srt), encoding="utf-8")

    mins = int(total // 60); secs = total - mins * 60
    print(f"built {proj}")
    print(f"lines: {len(lines)} ({sum(1 for l in lines if l['jeda'])} pauses) | total {mins}:{secs:04.1f} ({total}s)")
    if used_placeholder:
        print(f"placeholder voice used for {len(used_placeholder)} lines: {' '.join(used_placeholder)}")
    print(f"subtitles: {ep_dir / (a.ep + '.srt')}")


TEMPLATE = r'''<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/vendor/three.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #bfeaff; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Nunito", sans-serif; }
      #sky { position: absolute; inset: 0; background: linear-gradient(180deg, #6fd0ff 0%, #bfeaff 45%, #eafaff 72%, #d9f5c8 100%); }
      .cloud { position: absolute; width: 300px; height: 100px; border-radius: 60px; background: #ffffff; opacity: 0.95; }
      .cloud::before, .cloud::after { content: ""; position: absolute; background: #ffffff; border-radius: 50%; }
      .cloud::before { width: 140px; height: 140px; left: 50px; top: -62px; }
      .cloud::after { width: 100px; height: 100px; left: 150px; top: -40px; }
      #cloud-a { left: -340px; top: 250px; } #cloud-b { left: 1500px; top: 170px; transform: scale(0.8); } #cloud-c { left: 400px; top: 330px; transform: scale(0.6); }
      #gl { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      .cap { position: absolute; left: 160px; width: 1600px; bottom: 56px; text-align: center; font-weight: 900; font-size: 64px; line-height: 1.12;
             paint-order: stroke fill; -webkit-text-stroke: 14px #ffffff; }
      .capN { color: #12315f; } .capL { color: #a8340a; }
      .card { position: absolute; left: 0; width: 1920px; top: 46px; text-align: center; font-weight: 900; line-height: 1; letter-spacing: 0.02em;
              paint-order: stroke fill; -webkit-text-stroke: 18px #ffffff; }
      .card.sub { top: 250px; }
      .bigtitle { position: absolute; left: 0; width: 1920px; top: 70px; text-align: center; font-weight: 900; color: #12315f; line-height: 1.05; }
      .bigtitle span { display: block; font-size: 150px; paint-order: stroke fill; -webkit-text-stroke: 18px #ffffff; }
      .bigtitle small { display: block; margin-top: 8px; font-size: 56px; color: #b81d1d; paint-order: stroke fill; -webkit-text-stroke: 12px #ffffff; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <div id="sky" data-layout-ignore><div id="cloud-a" class="cloud"></div><div id="cloud-b" class="cloud"></div><div id="cloud-c" class="cloud"></div></div>
      <canvas id="gl" width="1920" height="1080" data-layout-ignore></canvas>
%%CARDS%%
%%CAPS%%
%%AUDIO%%
    </div>
    <script src="assets/ep.js"></script>
    <script src="assets/characters.js"></script>
    <script src="assets/world.js"></script>
    <script src="assets/stage.js"></script>
    <script src="assets/choreo.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const total = EP.total;
      tl.fromTo("#cloud-a", { x: 0 }, { x: 2400, duration: total, ease: "none" }, 0);
      tl.fromTo("#cloud-b", { x: 0 }, { x: -2300, duration: total, ease: "none" }, 0);
      tl.fromTo("#cloud-c", { x: 0 }, { x: 1700, duration: total, ease: "none" }, 0);
      const first = (s, t) => (t < 0.01 ? { opacity: 1, scale: 0.96 } : { opacity: 0, scale: 0.8, y: 18 });
      %%CAPJS%%.forEach(([s, t]) => tl.fromTo(s, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }, t));
      %%CARDJS%%.forEach(([s, t]) => tl.fromTo(s, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" }, t));
      %%TITLEJS%%.forEach(([s, t]) => tl.fromTo(s, t < 0.01 ? { opacity: 1, scale: 0.97 } : { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }, t));
      window.__timelines["main"] = tl;
      tl.seek(0);

      const S = KC.createStage(document.getElementById("gl"), 1920, 1080);
      EPCHOREO.init(S);
      const draw = (t) => { EPCHOREO.update(t); S.render(); };
      window.addEventListener("hf-seek", (e) => draw(e.detail.time));
      draw(0);
    </script>
  </body>
</html>
'''

if __name__ == "__main__":
    main()
