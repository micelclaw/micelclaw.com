# Publicación del Ep. 2 — runbook

Estado: **PUBLICADO el 2026-08-04.**

| Red | Formato | Resultado |
|---|---|---|
| YouTube (largo) | 3:08 | https://youtu.be/qMLD86kfqxg |
| YouTube (Short) | 0:37 | https://youtube.com/shorts/hAYZwj8EaDk |
| Telegram | vídeo nativo | mensaje 17 |
| Mastodon | vídeo nativo + alt | https://mastodon.social/@micelclaw/117037833438470634 |
| Bluesky | enlace + tarjeta | https://bsky.app/profile/micelclaw.bsky.social/post/3msbborqk5m26 |
| Facebook | vídeo nativo | https://facebook.com/28537045175983000 |
| Instagram | Reel nativo | https://www.instagram.com/reel/Dbn1iH6jBuA/ |
| TikTok | buzón (sin música) | pendiente: tocar la notificación en la app + pegar caption |
| X | **pendiente: publicar a mano** | hilo en `x.md` |

## Entregables

| Pieza | Ruta | Specs |
|---|---|---|
| Largo | `_artifacts/video/2026-08-ep2-calendar/exports/ep2-calendar.mp4` | 3:08, 1920x1080, −15.0 LUFS |
| Vertical | `_artifacts/video/2026-08-ep2-calendar-vertical/exports/ep2-calendar-vertical.mp4` | 0:37, 1080x1920, −14.8 LUFS |
| Vertical TikTok | `.../exports/ep2-calendar-vertical-nomusic.mp4` | 0:37, SIN música (regla TikTok) |
| Miniatura | `projects/2026-08-ep2-calendar/thumbs/duo-ep2.png` | duo estándar, 1280x720 |
| Portada 9:16 | `thumbs/duo-ep2-cover.png` | 1080x1920 |
| Subs | `projects/2026-08-ep2-calendar/subs/captions.srt` | pista EN para YouTube |

## Flujo (idéntico al Ep. 1)

1. Usuario valida → sube largo (youtube.md: título/desc/tags/capítulos/miniatura/SRT) + Short
   (con Related video → Ep. 2) → pasa las URLs.
2. Yo: sustituyo `<link>` en mastodon/bluesky/telegram/facebook/x, verifico
   `curl -I https://micelclaw.com/social/2026-08-08/ep2-calendar-vertical.mp4` → 200 (requiere
   push del repo web: mp4 + ep2-yt-card.jpg ya copiados a public/social/2026-08-08/), y publico:
   `LIVE=1 DRY_RUN=0 node scripts/post-<red>.mjs --file video/projects/2026-08-ep2-calendar/copys/<red>.md --item ep2-calendar --date <hoy>`
   (TikTok usa FILE_UPLOAD local del máster nomusic — no necesita el push).
3. X = borrador manual; caption de TikTok se pega en la app (buzón).

## Reparto de formatos (estándar de la serie)

YouTube largo+Short · IG Reel · TikTok (nomusic) · FB vídeo · Telegram vídeo · Mastodon vídeo ·
Bluesky enlace+tarjeta · X borrador.

## Estado del staging (para restaurar si hace falta)

- Eventos del seed movidos a la semana ago 3-9 (inspección acabó en JUE 10-15 tras tour3, estado final).
- Creados: show dom 9 22:30 (`0ce10a7b`), Load-in dom 16:00 (en cámara), Final Rehearsal vie
  19:00-20:00 (por Francis en cámara) + 3 relaciones del show (nota lluvia/inspección/invoice).
- María intacta; su calendario solo se ocultó en cámara vía eval de sesión.
- USER.md/SOUL.md/IDENTITY.md de Francis: regla de idioma añadida (responder en el idioma del usuario).
