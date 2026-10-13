# Publicación del Ep. 1 — runbook

Estado: **PUBLICADO el 2026-07-25.**

| Red | Formato | Resultado |
|---|---|---|
| YouTube (largo) | 1:40 horizontal | https://youtu.be/GZ4IQlGDdS4 |
| YouTube (Short) | 0:33 vertical | https://youtube.com/shorts/DrS5FuwjEFk |
| Telegram | vídeo nativo | mensaje 10 |
| Mastodon | vídeo nativo + alt | https://mastodon.social/@micelclaw/116980707154668642 |
| Bluesky | enlace + tarjeta | https://bsky.app/profile/micelclaw.bsky.social/post/3mrhvuzh73u2n |
| Facebook | vídeo nativo | https://facebook.com/913796474424685 |
| Instagram | Reel nativo | media 18089604134411619 |
| TikTok | ❌ BLOQUEADO por copyright de la música → **re-subido SIN música** | publish_id v_inbox_file~v2.7666520753319872534 |
| X | **pendiente: publicar a mano** | hilo en `x.md` |

## Paso 0 — lo que hace el usuario en YouTube

1. Subir `_artifacts/video/2026-07-ep1-notes/exports/ep1-notes.mp4` con el título, la descripción
   y los tags de `youtube.md`. Subtítulos: `subs/captions.srt` como pista EN.
2. Subir las 3 miniaturas de `thumbs/` en **Probar y comparar**.
3. Subir el Short: `_artifacts/video/2026-07-ep1-notes-vertical/exports/ep1-notes-vertical.mp4`
   → editarlo → **Vídeo relacionado = el Ep. 1**.
4. Crear la playlist "Micelclaw OS — Module Tours" (tráiler = Ep. 0, este = Ep. 1).
5. Pasarme la URL del vídeo (y la de la playlist si la hay).

## Paso 1 — sustituir placeholders

`<link>` en mastodon/bluesky/telegram/facebook/x y `<link-playlist>` en youtube.md.

## Paso 2 — el push que habilita Instagram y TikTok

Ambas exigen URL pública. Ya están copiados a `web/micelclaw.com/public/social/2026-07-26/`:
`ep1-notes-vertical.mp4` (11,2 MB) y `ep1-yt-card.jpg`. **Requieren push del repo web** (autorización
del usuario) y que Cloudflare Pages termine el deploy. Verificar antes de publicar:

```bash
curl -sI https://micelclaw.com/social/2026-07-26/ep1-notes-vertical.mp4 | head -1   # 200 OK
```

## Paso 3 — publicar red por red

Desde `content-ops/`, con `C=video/projects/2026-07-ep1-notes/copys`:

```bash
LIVE=1 DRY_RUN=0 node scripts/post-telegram.mjs  --file $C/telegram.md  --item ep1-notes --date <hoy>
LIVE=1 DRY_RUN=0 node scripts/post-mastodon.mjs  --file $C/mastodon.md  --item ep1-notes --date <hoy>
LIVE=1 DRY_RUN=0 node scripts/post-bluesky.mjs   --file $C/bluesky.md   --item ep1-notes --date <hoy>
LIVE=1 DRY_RUN=0 node scripts/post-facebook.mjs  --file $C/facebook.md  --item ep1-notes --date <hoy>
LIVE=1 DRY_RUN=0 node scripts/post-instagram.mjs --file $C/instagram.md --item ep1-notes --date <hoy>
LIVE=1 DRY_RUN=0 node scripts/post-tiktok.mjs    --file $C/tiktok.md    --item ep1-notes --date <hoy>
```

El ledger deduplica por `platform::item::date`, así que es idempotente y no interfiere con el cron
diario (que publica el `item` de `queue/<fecha>/`, distinto de éste).

**X**: `x.md` es borrador — lo publica el usuario a mano.
**TikTok**: cae en borradores; el endpoint de inbox no acepta descripción, así que la caption se
pega en la app al publicar (el texto está en `tiktok.md`).

## Paso 4 — cierre

```bash
node scripts/status.mjs        # regenera STATUS.md
```
Anotar aquí la URL del episodio y la de la playlist para las referencias cruzadas del Ep. 2.

## Reparto de formatos (decidido 2026-07-25)

| Red | Formato | Nota |
|---|---|---|
| YouTube | largo 1:40 + Short 0:33 | único sitio con el largo nativo |
| Instagram | vertical (Reel) | `video_url` público |
| TikTok | vertical (borrador) | `video_url` público |
| Facebook | vertical (`/videos`) | única superficie de FB con alcance a no-seguidores |
| Telegram | vertical nativo | 11,2 MB < 50 MB del Bot API (el largo, 55,3 MB, NO cabría) |
| Mastodon | vertical nativo | mastodon.social admite hasta 99 MiB |
| Bluesky | enlace + tarjeta | su API de vídeo exige service-auth aparte |
| X | enlace (borrador) | — |
