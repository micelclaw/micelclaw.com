#!/usr/bin/env python3
"""30-align.py — Subtítulos alineados palabra a palabra.

Transcribe CADA línea de voz (lines/<scene>.wav) con faster-whisper
(word_timestamps) y alinea contra el TEXTO CANÓNICO del guion (el de
vo-timeline.json): whisper solo aporta tiempos, nunca cambia el texto.
Emite words.json (con flag `key` para las palabras resaltadas) + .srt.

Uso: .venv/bin/python scripts/30-align.py --project <slug>
"""
import argparse
import json
import re
from pathlib import Path

VIDEO_ROOT = Path(__file__).resolve().parent.parent
STAGING = Path("/home/victor/Projects/_artifacts/video")


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower())


def align_line(canonical: list[str], whisper_words, line_start: float, line_dur: float):
    """Asigna tiempos a las palabras canónicas usando las de whisper (greedy).
    Palabras sin match → interpolación entre vecinos."""
    out = [{"word": w, "start": None, "end": None} for w in canonical]
    wi = 0
    for i, w in enumerate(canonical):
        target = norm(w)
        if not target:
            continue
        for j in range(wi, min(wi + 4, len(whisper_words))):
            if norm(whisper_words[j].word) == target:
                out[i]["start"] = whisper_words[j].start
                out[i]["end"] = whisper_words[j].end
                wi = j + 1
                break
    # interpolar los huecos
    n = len(out)
    for i, o in enumerate(out):
        if o["start"] is None:
            prev_end = next((out[j]["end"] for j in range(i - 1, -1, -1) if out[j]["end"] is not None), 0.0)
            nxt = next((out[j]["start"] for j in range(i + 1, n) if out[j]["start"] is not None), line_dur)
            gap_words = 1
            k = i + 1
            while k < n and out[k]["start"] is None:
                gap_words += 1
                k += 1
            step = max(0.05, (nxt - prev_end) / (gap_words + 1))
            o["start"] = prev_end + step * 0.15
            o["end"] = min(nxt, o["start"] + step)
    for o in out:
        o["start"] = round(line_start + max(0.0, o["start"]), 3)
        o["end"] = round(line_start + max(0.05, o["end"]), 3)
    return out


def fmt_srt(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    ms = int(round((s - int(s)) * 1000))
    return f"{int(h):02}:{int(m):02}:{int(s):02},{ms:03}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()

    sb = json.loads((VIDEO_ROOT / "projects" / args.project / "storyboard.json").read_text())
    # resaltados POR ESCENA (un highlight de una escena no debe teñir otras)
    highlights_by_scene: dict[str, set] = {}
    for sc in sb["scenes"]:
        hs = set()
        for h in sc.get("highlight", []):
            for w in h.split():
                hs.add(norm(w))
        highlights_by_scene[sc["id"]] = hs

    vo_dir = STAGING / args.project / "voiceover"
    vt = json.loads((vo_dir / "vo-timeline.json").read_text())

    from faster_whisper import WhisperModel
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    all_words = []
    srt_entries = []
    for line in vt["lines"]:
        if not line["file"]:
            continue
        wav = vo_dir / line["file"]
        canonical = line["text"].split()
        segments, _info = model.transcribe(str(wav), word_timestamps=True,
                                           initial_prompt=line["text"], language="en")
        whisper_words = [w for seg in segments for w in seg.words]
        aligned = align_line(canonical, whisper_words, line["startSec"], line["durSec"])
        scene_hl = highlights_by_scene.get(line["sceneId"], set())
        for a in aligned:
            a["key"] = norm(a["word"]) in scene_hl
            a["sceneId"] = line["sceneId"]
        all_words.extend(aligned)
        srt_entries.append((line["startSec"], line["startSec"] + line["durSec"], line["text"]))

    subs_dir = VIDEO_ROOT / "projects" / args.project / "subs"
    subs_dir.mkdir(parents=True, exist_ok=True)
    (subs_dir / "words.json").write_text(json.dumps(all_words, indent=1))

    srt = []
    for i, (a, b, text) in enumerate(srt_entries, 1):
        srt.append(f"{i}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{text}\n")
    (subs_dir / "captions.srt").write_text("\n".join(srt))

    matched = sum(1 for w in all_words if w["end"] - w["start"] < 1.5)
    print(f"OK {len(all_words)} palabras ({matched} con timing fino) → {subs_dir}/words.json + captions.srt")


if __name__ == "__main__":
    main()
