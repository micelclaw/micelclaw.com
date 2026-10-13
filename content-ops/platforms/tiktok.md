# Platform: TikTok — DRAFT mode (agent uploads to drafts, you tap publish)

**Audience:** broad / non-technical, visual-first. **Angle:** the everyday benefit, big legible text on the
cards, zero jargon (same as Instagram).

## Why draft mode

TikTok's Content Posting API **forces every post to private (`SELF_ONLY`) until the app passes a Content
Posting API audit** — there is no Meta-style "own account / dev mode" bypass, and sandbox is private too.
Passing the audit requires a compliant interactive posting UX, which a headless tool doesn't have. So we use
the **draft path**: the agent uploads a **photo carousel** to your TikTok inbox as a draft; you open the app
and tap publish (reaches public, no audit). This mirrors how **X** is draft-only.

If you ever want fully-autonomous posting, it would only be **private** until audited — not worth it here.

## Mechanism (Content Posting API, photo carousel, PULL_FROM_URL)

`post-tiktok.mjs` does: refresh token → `creator_info/query` → `content/init` (media_type PHOTO,
post_mode MEDIA_UPLOAD, source PULL_FROM_URL) → poll `status/fetch` until `SEND_TO_USER_INBOX`.

**Two hard constraints:**
1. **Images must be PUBLIC HTTPS URLs on a domain verified in the TikTok portal** — TikTok fetches them
   itself; there is no file upload for photos. Host the cards in a dedicated **`public/social/`** folder
   (e.g. `public/social/<date>/tt-1.jpg`) → served at `https://micelclaw.com/social/<date>/tt-1.jpg` but
   **not linked from any page → invisible on the site** (they're just public files for TikTok to pull, not
   blog content). Push = Cloudflare Pages deploys it. The domain (`micelclaw.com`) must be **verified** in
   the portal (the TXT record is already live → click "Verify").
2. **JPEG or WebP, NOT PNG** (≤20 MB; the 1080×1350 social card is within limits — verified). Same **vertical
   card as every other network** — generate it once with a `.jpg` output:
   `node scripts/compose-visual.mjs --shot <png> --preset social --out card.jpg` (Playwright emits JPEG from
   the `.jpg` extension).

## One-time setup (developers.tiktok.com)

1. Sign up / log in → **Manage apps → Connect an app**. Name it (e.g. "Micelclaw Social"), Category, icon,
   **Platform: Web**, website `https://micelclaw.com`.
2. **Add products:** **Login Kit** (OAuth) + **Content Posting API**.
3. **Scopes:** `video.upload` (covers photo draft upload) + `user.info.basic`.
4. **Redirect URI** (Login Kit): an **HTTPS** callback, e.g. `https://micelclaw.com/oauth/tiktok/callback`
   (no `localhost`, no query string). A tiny page that just shows the `?code=` is enough.
5. **URL properties:** verify the domain that will host the card images (required for PULL_FROM_URL).
6. **Credentials:** copy **Client key** + **Client secret** → `.env.local` (`TIKTOK_CLIENT_KEY`,
   `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`).
7. **Sandbox:** create a sandbox, add your TikTok username as a **Target User** (so you can authorize without
   review). Sandbox posts are private, but the draft-upload flow validates end-to-end.

## Authorize (once)

```bash
node scripts/tiktok-auth.mjs                 # prints the authorize URL → open it, approve with the Micelclaw account
node scripts/tiktok-auth.mjs --code <CODE>   # paste the ?code=... from the redirect → saves .tiktok-tokens.json
```
Access token lasts 24h, refresh token 365 days; the script refreshes and rotates automatically.

## Publish command

```bash
node scripts/post-tiktok.mjs --file queue/<date>/tiktok.md --item <slug> --date <date>
```
Queue file: optional `title:`, one or more `image_url:` lines (public JPEG URLs), optional `cover:` index, and
the caption as the body. On success it lands in your **TikTok drafts** — open the app to publish.

## Prerequisite / status

Blocked on **public image hosting** (needs the site deployed or a bucket) + the dev-app OAuth above. Until
both exist, `post-tiktok.mjs` skips with a notice.

## Native video (added 2026-07-25)

A `video_url:` line switches the post from PHOTO carousel to **VIDEO**. In the default draft mode
(`TIKTOK_POST_MODE=MEDIA_UPLOAD`) it uses the inbox endpoint `/v2/post/publish/inbox/video/init/`,
which matches the `video.upload` scope we hold. **That endpoint accepts no `post_info`**, so the
title/description in the file are NOT sent — write the caption in the app when you tap publish.
The URL must be public HTTPS on the verified domain.

```
video_url: https://micelclaw.com/social/2026-07-26/clip.mp4
```

## ⚠️ Dónde aparece lo enviado (NO está en Borradores)

Con `TIKTOK_POST_MODE=MEDIA_UPLOAD` el estado final es `SEND_TO_USER_INBOX`. La doc oficial es
explícita: *"You should inform users that they must click on inbox notifications to continue the
editing flow in TikTok and complete the post"*
(https://developers.tiktok.com/doc/content-posting-api-reference-upload-video/).

Es decir: **app › Bandeja de entrada / notificaciones › tocar la notificación** → se abre el editor
con el vídeo → publicar. **No aparece en la sección "Borradores" del perfil**, que es donde uno lo
busca por instinto (nos pasó el 2026-07-25: 4 envíos "perdidos" que en realidad estaban en el buzón).

Otros límites de este modo:
- **5 envíos pendientes por cada 24h** (anti-spam); si se acumulan sin tocarlos, los siguientes fallan.
- El `upload_url` vive 1 hora (irrelevante con `PULL_FROM_URL`, que es lo que usamos).
- El endpoint de inbox **no acepta `post_info`** → título y descripción se escriben en la app.
  Comprobado en vivo el 2026-07-27: el token concedido lleva `user.info.basic,video.upload` y
  `creator_info/query` responde **`scope_not_authorized`** → hoy Direct Post no está disponible,
  así que la descripción NO puede viajar con el vídeo por mucho que esté en el `.md` de la cola.
  **Mitigación (2026-07-27):** `post-tiktok.mjs` mete la descripción **dentro de la última línea**
  de su salida, que es justo la que `publish-day.mjs` manda al aviso de Telegram → llega al mismo
  móvil desde el que se toca la notificación, para pegarla en vez de reescribirla. Esa última línea
  debe seguir siendo **UNA sola** (publish-day hace `.pop()`); antes el mensaje era multilínea y al
  aviso llegaba la coletilla, que no servía para nada.

Publicar directamente sin pasar por el buzón exige `DIRECT_POST` + scope `video.publish` + pasar la
auditoría de TikTok; hasta aprobarla todo saldría como `SELF_ONLY` (privado), o sea PEOR que el buzón.
El código ya soporta `DIRECT_POST` (elige `PUBLIC_TO_EVERYONE` solo si `creator_info` lo ofrece); lo
que falta es el permiso en el portal de desarrollador, re-autorizar con `tiktok-auth.mjs` y la auditoría.

**Solo desde el MÓVIL**: la web de TikTok no muestra ni permite publicar borradores/notificaciones
del buzón (limitación de la plataforma, verificado 2026-07-25). No se puede cerrar el ciclo desde
el escritorio: hay que abrir la app en el teléfono.

## Quién cierra el ciclo: aviso a la persona que publica (2026-07-27)

El paso manual no lo hace el operador, así que el aviso va al Telegram de **quien publica**:
`TIKTOK_PUBLISHER_TELEGRAM_CHAT_ID` + `TIKTOK_PUBLISHER_NAME` en `.env.local`.

Lo manda **`publish-day.mjs`** al terminar el lote del día (NO `post-tiktok.mjs`): es el único sitio
que ve el día completo, así que recibe **un** mensaje con la acción de TikTok Y los enlaces de las
demás redes, en vez de uno por red. Composición en `lib/publisher-notice.mjs` (función PURA,
probada en `tests/content-ops/_publisher-notice-verify.mjs`).

Tres reglas de forma, pedidas por el usuario:

1. **Seco**: sin saludos, sin despedidas, sin cortesías. El test lo verifica con una lista negra.
2. **La descripción va en un mensaje SUELTO**, detrás del de instrucciones: en Telegram copiar un
   mensaje lo copia entero, así que sola se copia de un toque; mezclada con los pasos, no.
3. **Enlaces para revisar** de bluesky/mastodon/facebook/instagram (telegram y dev.to no entran).
   La verdad de qué se publicó sale del **ledger**, no del stdout de los scripts. Si una red se
   publicó sin enlace, se dice (`(publicado, sin enlace)`) en vez de fingir uno.
   Nota: Instagram no guardaba enlace (solo el id de media) → `post-instagram.mjs` pide ahora el
   `permalink` tras publicar (best-effort: si falla, se registra el id igual).

- **Portada**: `cover: N` del `.md` es un ÍNDICE y solo vale para carruseles de FOTOS (TikTok la
  aplica sola). Para VÍDEO no hay portada en la API del buzón → si la cola declara `cover_url:` (o
  `cover_file:`), se le envía como imagen para que la suba; si no, se le dice que elija el fotograma
  en la app. **No se inventa una portada** a partir de las tarjetas sociales del día.
- **REGLA DURA DE TELEGRAM**: un bot **no puede iniciar** una conversación. Si esa persona no le ha
  escrito nunca al bot, la API responde `400 chat not found` y no hay forma de saltárselo — tiene que
  escribirle **una vez** (`/start` basta).
- **Red de seguridad**: si no se la puede alcanzar, `sendToPersonOrFallback`
  (`scripts/lib/telegram.mjs`) **reencamina el aviso al operador** con el motivo, en vez de perderlo.
  Un paso manual que nadie recibe parece hecho y no lo está. Verificado en vivo el 2026-07-27
  (María aún sin `/start` → el aviso llegó al operador).
- Verificación: `tests/content-ops/_publisher-notice-verify.mjs` (15/15 — composición con y sin
  portada, concisión con lista negra, el reparto en dos mensajes, y la cola real del día).
  El `_tiktok-publisher-notify-verify.mjs` anterior se BORRÓ: replicaba la lógica a mano en vez
  de importar `composePublisherNotice`, así que podía pasar con la función rota.

## 📐 Especificación del VÍDEO (esto no existía y por eso fallamos)

El 2026-07-27 se publicó aquí un MP4 de **1080x1350 (4:5), 7,2 s y silencio absoluto**
(−70 LUFS, pico −∞ dBFS). No hubo fallo técnico: no había ninguna especificación escrita, y la
regla de enrutado (`.claude/skills/visual/SKILL.md`) mandaba a TikTok el "MP4 gemelo" del GIF,
que es mudo por diseño porque **Mastodon** lo necesita así para autorreproducirlo.

**Lo que TikTok acepta de nosotros:**

| | valor | por qué |
|---|---|---|
| formato | **1080x1920 (9:16)** | pantalla completa; el 4:5 es una restricción de Mastodon, no de aquí |
| duración | **5-90 s** (nuestros cortos: 5-20 s) | por debajo de 5 s no cabe una acción con su reposo |
| fps | 30 | lo que emite el pipeline |
| audio | **h264 + aac con sonido REAL** (≈ −14 LUFS, pico ≈ −1,5 dBFS) | superficie audio-first |
| voz | Kokoro `am_michael`, **sin música** | ver la sección de música: su Content ID bloquea nuestro catálogo CC-BY |
| gancho | 4-8 palabras **desde el frame 1** | el karaoke no llega: se ancla a la 1ª palabra hablada |

**Lo que NUNCA va a TikTok** (lista negra, aprendida a base de publicarlo):

- el **MP4 gemelo del GIF** (`compose-gif.mjs`) — es 4:5 y mudo; su sitio es Facebook y Mastodon;
- cualquier vídeo **sin pista de audio audible**, aunque tenga pista (el de hoy tenía `aac` a −91 dB);
- un **recorte 9:16 de un 16:9** — rechazado por el usuario, "se ve muy cortada"
  (`video/PLAYBOOK.md`): el vertical es captura móvil nativa o no es;
- una **portada inventada** a partir de las tarjetas sociales del día.

**Barrera técnica, no documental.** `scripts/lib/video-gate.mjs` mide el clip y **salta el envío**
(no revienta el lote) si no cumple, diciendo qué midió y qué esperaba. Corre en tres sitios:
el preflight de `publish-day.mjs` (para que salga en el aviso del día), `post-tiktok.mjs` y
`post-instagram.mjs`. Golden con los dos ficheros reales de aquel día:
`tests/content-ops/_video-gate-verify.mjs` (31/31; el 4:5 mudo se rechaza, el vertical pasa).
Escape a mano `VIDEO_GATE=off`, que se anuncia en el aviso en vez de esconderse.

**Cadencia (decisión del usuario 2026-07-27): 3 piezas/semana** — el episodio semanal de los 8
dominios + **2 cortos de 5-20 s** derivados de los posts del blog. Plantilla:
`video/projects/_template-short/storyboard.json`.

## 🚫 Música: TikTok bloquea las pistas CC-BY (Ep. 1 bloqueado 2026-07-25)

El vídeo del Ep. 1 fue **bloqueado por copyright solo en TikTok** llevando "Chill Wave" de Kevin
MacLeod (CC-BY, con atribución puesta en la descripción de YouTube). Causa: MacLeod **no** mete su
obra en Content ID, pero **distribuidores terceros sí la registran**, así que el detector la marca
aunque la licencia lo permita. Cambiar a otra pista de `assets/music/` NO resuelve nada: todas son
del mismo autor y licencia.

**Regla para TikTok**: el vídeo se sube **sin música** (`node scripts/40-audio-mix.mjs --project
<slug> --no-music --out master-nomusic.wav` + re-mux sobre `render/video-only.mp4`, sin volver a
renderizar) y **el sonido se añade en la app desde el catálogo de TikTok** al publicar — es la única
música que la plataforma garantiza libre de reclamaciones, y además favorece el alcance.

Efecto secundario a tener en cuenta: sin música quedan los huecos entre frases en silencio (en el
Ep. 1, ~18 s de 33 s). El sonido que se añade en la app los rellena; si no se añade ninguno, el
vídeo suena a tramos. Las demás redes (YouTube, Instagram, Facebook, Telegram, Mastodon) siguen
usando el máster CON música, que no da problemas.

### FILE_UPLOAD (desde 2026-07-25)

`video:` (ruta local) sube el fichero directamente con `FILE_UPLOAD` → init reserva el hueco y el
script hace el `PUT` al `upload_url`. Ya no hace falta que el mp4 esté desplegado en la web ni,
por tanto, un push previo. `video_url:` (PULL_FROM_URL) se mantiene y exige dominio verificado.
