# Copys — Micelclaw OS Ep. <N> — <Module> (plantilla)

Publicación: SÁBADO (slot standalone). Vertical el mismo día (Reels + Shorts; TikTok BORRADOR).
Derivados Mastodon/Bluesky/Telegram/Facebook domingo-lunes. Recap del martes enlaza el episodio.

## YouTube
**Título:** Micelclaw OS Ep. <N> — <Module>: <beneficio 4-6 palabras>
**Descripción:**
<3 líneas: qué hace el módulo, el momento "from the chat", CTA playlist>
▶ Full series: <link-playlist>
→ https://micelclaw.com

Chapters (episodio ~2:30 — regla de ritmo 2026-07-23):
0:00 <cold open>
0:09 Ep. <N> — <Module>
0:13 <beat 1>
...
1:10 Now, from the chat
2:00 How it connects
2:20 Next episode

Music: "<Track>" by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0

## Shorts/Reels (vertical, mismo día)
<1 línea gancho> Full tour → link in bio / pinned comment.

## Mastodon (técnico) · Bluesky (puente) · Telegram · Facebook/IG (no técnico)
<ángulo por audiencia según VOICE.md>

## X (SOLO BORRADOR) · TikTok (SOLO BORRADOR)

## Miniatura (ESTÁNDAR del canal — THUMBNAILS.md)

Layout `duo` fijo: escritorio + móvil con el MISMO registro, placa = nombre del módulo a secas.

```bash
node scripts/60-thumbs.mjs --layout duo --duo-phone 630 --duo-overlap 270 \
  --shot <frame-horizontal>.png --crop 0,0,1920,900 \
  --shot2 <frame-vertical>.png --crop2 0,0,1080,1580 \
  --plate "<MODULO>" --sub "<GANCHO>" --qa --out projects/<slug>/thumbs/duo-<slug>.png
```

Emite las DOS de golpe: `<out>.png` (1280x720, YouTube) y `<out>-cover.png` (1080x1920, portada
de TikTok/Reels). Mirar el `-qa120.png` antes de dar por buena la miniatura.
