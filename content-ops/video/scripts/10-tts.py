#!/usr/bin/env python3
"""10-tts.py — Narración TTS por línea con Kokoro (CPU).

Lee projects/<slug>/storyboard.json, sintetiza cada `voiceover` como wav
independiente, concatena narration.wav (con silencios padSec) y emite
vo-timeline.json (startSec/durSec por escena) — el contrato audio-first
que fija la duración de cada escena antes de capturar.

Uso:
  .venv/bin/python scripts/10-tts.py --project 2026-07-trailer-user
  .venv/bin/python scripts/10-tts.py --project <slug> --dry-durations
  .venv/bin/python scripts/10-tts.py --text "Micelclaw. Hello." [--voice am_michael]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
VIDEO_ROOT = HERE.parent
MODELS = VIDEO_ROOT / "assets" / "models"
STAGING_ROOT = Path("/home/victor/Projects/_artifacts/video")

SAMPLE_RATE = 24000


def load_kokoro():
    from kokoro_onnx import Kokoro
    return Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))


def apply_pronounce(text: str, pronounce: dict) -> str:
    for word, spoken in (pronounce or {}).items():
        text = text.replace(word, spoken)
    return text


def synth_line(kokoro, text: str, voice: str, speed: float):
    samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
    assert sr == SAMPLE_RATE, f"sample rate inesperado: {sr}"
    return samples.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project")
    ap.add_argument("--text")
    ap.add_argument("--voice", default=None)
    ap.add_argument("--speed", type=float, default=None)
    ap.add_argument("--dry-durations", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    if args.text:
        kokoro = load_kokoro()
        samples = synth_line(kokoro, args.text, args.voice or "am_michael", args.speed or 1.0)
        out = Path(args.out or "/tmp/tts-smoke.wav")
        sf.write(out, samples, SAMPLE_RATE)
        print(f"OK {out} dur={len(samples)/SAMPLE_RATE:.2f}s")
        return

    if not args.project:
        ap.error("--project o --text requerido")

    sb_path = VIDEO_ROOT / "projects" / args.project / "storyboard.json"
    sb = json.loads(sb_path.read_text())
    voice = args.voice or sb.get("voice", "am_michael")
    speed = args.speed or sb.get("speed", 1.0)
    pronounce = sb.get("pronounce", {})
    default_pad = float(sb.get("padSec", 0.6))

    out_dir = STAGING_ROOT / args.project / "voiceover"
    lines_dir = out_dir / "lines"
    lines_dir.mkdir(parents=True, exist_ok=True)

    kokoro = load_kokoro()

    # Contrato de ventanas (audio-first): la ventana VISUAL de cada escena es
    # max(lead + durVoz + pad, minSec). El pad efectivo se ESTIRA para llenar
    # minSec → narration.wav dura EXACTAMENTE lo mismo que el vídeo y las
    # escenas nunca desincronizan.
    timeline = []
    pieces = []
    cursor = 0.0
    for scene in sb["scenes"]:
        sid = scene["id"]
        vo = (scene.get("voiceover") or "").strip()
        pad = float(scene.get("padSec", default_pad))
        lead = float(scene.get("leadSec", 0.0))  # silencio ANTES de la voz de esta escena
        min_sec = float(scene.get("minSec", 0.0))
        window_start = cursor
        if lead > 0:
            pieces.append(np.zeros(int(lead * SAMPLE_RATE), dtype=np.float32))
            cursor += lead
        dur = 0.0
        if vo:
            spoken = apply_pronounce(vo, pronounce)
            samples = synth_line(kokoro, spoken, scene.get("voice", voice), scene.get("speed", speed))
            dur = len(samples) / SAMPLE_RATE
            if not args.dry_durations:
                sf.write(lines_dir / f"{sid}.wav", samples, SAMPLE_RATE)
            pieces.append(samples)
            cursor += dur
        eff_pad = max(pad, min_sec - lead - dur)
        window = lead + dur + eff_pad
        timeline.append({"sceneId": sid, "text": vo, "file": f"lines/{sid}.wav" if vo else None,
                         "startSec": round(window_start + lead, 3), "durSec": round(dur, 3),
                         "padSec": round(eff_pad, 3),
                         "windowStartSec": round(window_start, 3), "windowSec": round(window, 3)})
        if eff_pad > 0:
            pieces.append(np.zeros(int(eff_pad * SAMPLE_RATE), dtype=np.float32))
            cursor += eff_pad

    total = cursor
    print(f"— {len(timeline)} escenas · duración total (ventanas): {total:.1f}s")
    for t in timeline:
        print(f"  {t['sceneId']:>6} win={t['windowStartSec']:7.2f}+{t['windowSec']:5.2f} voz={t['durSec']:5.2f}  {t['text'][:56]}")

    if args.dry_durations:
        return

    narration = np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)
    sf.write(out_dir / "narration.wav", narration, SAMPLE_RATE)
    (out_dir / "vo-timeline.json").write_text(json.dumps(
        {"lines": timeline, "totalSec": round(total, 3), "sampleRate": SAMPLE_RATE, "voice": voice}, indent=2))
    print(f"OK narration.wav ({total:.1f}s) + vo-timeline.json → {out_dir}")


if __name__ == "__main__":
    sys.exit(main())
