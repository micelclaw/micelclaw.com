# Publicación del Ep. 4 — runbook

Estado: **lanzamiento social iniciado el 2026-09-25** (`content-ops/queue/2026-09-25/meta.json` aprobado).
Mastodon, Bluesky, Telegram, Facebook e Instagram publicados; hilo de X entregado a María.
TikTok: publicación confirmada por status API el 2026-09-28 (`PUBLISH_COMPLETE`,
publicly available post ID `7689825953886784790`). No repetir la subida.
Instagram: API confirma Reel. Facebook: API confirma corto de 39 s publicado y listo.
El 2026-09-28 se compartió el enlace al episodio largo en Facebook, Telegram, Mastodon
y Bluesky (`queue/2026-09-28/`, item `ep4-contacts-youtube-launch`). El nuevo hilo con
enlace al largo se entregó a María: 3 tuits e imagen; publicación en X sin confirmar.
YouTube largo: **público**, verificado por API y oEmbed sin credenciales el 2026-09-28: https://youtu.be/T-YhWeZwYuI.
La respuesta de subida confirma canal Micelclaw OS (`UCAuPn0hzQp8s6JBuO5W9aIA`) y privacidad.
El usuario comprobó y aprobó la reproducción del episodio el 2026-09-28.
Miniatura del episodio y portada del Short aplicadas por API el 2026-09-28;
título, descripción, capítulos del largo y tags verificados.
Short **público**, verificado por API y oEmbed sin credenciales: https://youtube.com/shorts/qG5_fepWRZ4.
Ambos: procesamiento `succeeded`, pista English `serving`, audio EN, descripción y tags
comprobados. Google reordena tags; se comparan como conjuntos. Scope force-ssl concedido.
No hay playlists en el canal (consulta API). No se crea una nueva sin encargo.

## Entregables

| Pieza | Ruta | Verificado |
|---|---|---|
| Horizontal 2:42 | `_artifacts/video/2026-08-ep4-contacts/exports/2026-08-ep4-contacts.mp4` | 1920x1080, −14.93 LUFS |
| Vertical 0:39 | `_artifacts/video/2026-08-ep4-contacts-vertical/exports/2026-08-ep4-contacts-vertical.mp4` | 1080x1920, −14.94 LUFS |
| Vertical SIN música (TikTok) | `...-vertical/exports/2026-08-ep4-contacts-vertical-nomusic.mp4` | gate TikTok OK (−14.6 LUFS) |
| Miniatura | `copys/../thumbs/duo-ep4.png` (1280x720) | qa120 legible |
| Portada 9:16 | `thumbs/duo-ep4-cover.png` | auto |
| Subtítulos | `subs/captions.srt` | 333 palabras alineadas |

## Paso pendiente — YouTube

1. NO volver a subir los vídeos: ya existen y son públicos. Ambas miniaturas y pistas EN completas.
2. Vídeo relacionado del Short = Ep. 4: obligatorio, con autorización permanente del
   usuario y sin nueva consulta. Queda pendiente en Studio, no completado por API.
   El enlace al episodio en la descripción no sustituye esta asociación nativa.

## Seguimiento social

1. No repetir el corto: Instagram, Facebook, TikTok y YouTube ya publicados.
2. Anuncios del largo registrados en el ledger con sus enlaces. Telegram: mensaje 27.
3. X: esperar enlace o confirmación de María; entrega no equivale a publicación.
4. Regenerar `STATUS.md` al cambiar un estado.

## Notas

- La palabra "CRM" NO aparece en ningún copy (regla del episodio).
- TikTok SIEMPRE con el máster sin música; María elige sonido del catálogo.
- Gotcha nuevo de esta caja: al muxear a mano audio sobre `render/video-only.mp4`, ese
  fichero LLEVA una pista aac muda — usar `-map 0:v:0 -map 1:a:0` o el export sale mudo
  (lo cazó la puerta de calidad: −70 LUFS).
