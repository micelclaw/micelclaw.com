# YouTube — Ep. 1 · Notes

> **PUBLICADO 2026-07-25** — largo: https://youtu.be/GZ4IQlGDdS4 ·
> Short: https://youtube.com/shorts/DrS5FuwjEFk

Master: `_artifacts/video/2026-07-ep1-notes/exports/ep1-notes.mp4` (1:40, 1920x1080, −14.75 LUFS)
Subtítulos: `subs/captions.srt` (subirlos como pista EN; los del vídeo van quemados)

**Título:** Micelclaw OS Ep. 1 — Notes: written by asking

**Descripción:**
Notes is where everything gets captured in Micelclaw OS, our self-hosted AI productivity OS.
Pinned notes, tags, instant search over your own database, and a real editor — headings, task
lists, tables, markdown or rich text. No cloud account, no sync service, no spinner.

Then the part that changes the habit: you don't open the module at all. You tell your agent to
take the note, and it comes back as a chip in the chat. Click the chip and you're in the note it
just wrote — tagged, filed and linked.

Everything here is the live product running on a mini-PC at home. No demo reels.

▶ Full series: <link-playlist>
→ https://micelclaw.com
→ https://docs.micelclaw.com

Chapters:
0:00 Every show starts as a note
0:12 Captured, pinned, tagged
0:25 A new note in seconds
0:36 A real editor, and instant search
0:57 Now, from the chat
1:09 The chip: click and you're there
1:19 @ links everything
1:29 Next: Calendar

Music: "Chill Wave" by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/

**Tags:** self-hosted notes, self hosted note taking app, notion alternative self hosted, obsidian alternative, ai agent notes, homelab productivity, self-hosted, homelab, local ai, mcp, privacy, home server

---

## Miniaturas (Test & Compare — subir las 3)

Estilo del canal "Sticker Punch" + sistema de serie (THUMBNAILS.md): **placa ámbar = el módulo a
secas**, el gancho va en la placa blanca. Generadas con `scripts/60-thumbs.mjs`:

Layout **`duo`** (oficial de la serie), encuadre **630 / 270** elegido por el usuario:
`thumbs/duo-4-maximo.png`. Las dos pantallas muestran la MISMA nota ("Rain contingency") y la
mosca va abajo-derecha translúcida.

```bash
node scripts/60-thumbs.mjs --layout duo --duo-phone 630 --duo-overlap 270 \
  --shot <frame r78>.png --crop 0,0,1920,900 --shot2 <frame m17>.png --crop2 0,0,1080,1580 \
  --plate "NOTES" --sub "SAME NOTES, DESK AND POCKET" --qa --out thumbs/duo-4-maximo.png
```

Emite las DOS: `duo-4-maximo.png` (1280x720, YouTube) y `duo-4-maximo-cover.png` (1080x1920,
portada de TikTok/Reels).

Pendiente: si se quiere Test & Compare, generar 2 variantes más con el mismo encuadre cambiando
solo el gancho blanco (p.ej. "IT WRITES THEM FOR YOU" / "YOUR DATABASE, NOT THEIR CLOUD").

En Studio: Contenido → el vídeo → Miniatura → "Probar y comparar". Métrica de decisión: **cuota de
tiempo de visualización**, no clics.

## Short (vertical)

Master: `_artifacts/video/2026-07-ep1-notes-vertical/exports/ep1-notes-vertical.mp4` (0:33, 1080x1920)

**Título:** Tell your agent to take the note #selfhosted
**Descripción:** The agent writes it, the chat hands you a chip, one click and you're in the note.
Full module tour on the channel. #selfhosted #homelab #ai #privacy

Al subirlo: **Editar → Vídeo relacionado → el Ep. 1** (es el puente Short → largo; sin él, el Short
no aporta suscriptores).

## Notas de subida

- **Capítulos**: YouTube exige ≥3 capítulos, el primero en `0:00` y **cada uno ≥10 s**. Los de
  arriba están verificados contra `voiceover/vo-timeline.json` (el tramo más corto son 10 s justos).
  Si se editan, revisar esa condición o YouTube los descarta TODOS en silencio.
- **Playlist**: crear "Micelclaw OS — Module Tours" con el tráiler como Ep. 0 y este como Ep. 1,
  y sustituir `<link-playlist>` aquí y en los copys de redes.
- **Idioma**: vídeo en inglés → activar el doblaje automático (Studio → Subtítulos) para alcance extra.
- **Etiqueta de contenido alterado/sintético**: no aplica. La voz es TTS sobre captura real de
  producto; la política cubre voces/rostros de personas reales y escenas realistas falsas, no la
  narración sintética de un screencast. La música es CC-BY con atribución en la descripción.
