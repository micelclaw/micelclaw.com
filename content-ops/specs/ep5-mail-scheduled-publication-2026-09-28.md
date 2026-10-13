# Publicación única de Mail — 28 Sep 2026, 20:00 Europe/Madrid

Estado al configurar: timer `micelclaw-publish-mail-20260928.timer` enabled/active,
próxima ejecución verificada 2026-09-28 20:00 CEST (=18:00 UTC). Service inactivo:
no ha ejecutado ni publicado. `Persistent=false`, `Restart=no`, wrapper con guard
de fecha 20:00–22:00 y marca exclusiva para no repetir intentos inciertos.
Prueba real de Codex exec sin herramientas: EJECUTOR_OK; runner dry-run y units
validados; OAuth config existente válida; destino del reporte verificado privado.
Ejecutor basado en el [modo no interactivo oficial de Codex](https://developers.openai.com/codex/noninteractive).
Requiere equipo/WSL activos a esa hora; no es una tarea alojada en la nube.

## Autorización y alcance

Víctor autorizó en este chat programar la publicación para hoy a las 20:00 de Madrid:
episodio largo y Short en YouTube, corto en Instagram y TikTok, y después anuncios
en las demás redes usando los enlaces de YouTube. No se autoriza ningún otro lote.
Esta instrucción es una tarea programada única, no una cadencia diaria. Los permisos
existentes de subida/gestión de YouTube ya fueron consentidos. No pidas otra vez
publicar ni asociar el Short: el usuario autorizó siempre su vídeo relacionado.

## Reglas del ejecutor

Lee AGENTS del workspace/repo, codex-bootstrap, skills postear y video, VOICE,
STATUS y PLAYBOOK antes de actuar. ROADMAP está eliminado deliberadamente: no
recrearlo. Nunca reiniciar Core, Gateway, ni tocar roles/configuración de producto.
No tocar data/ ni cuentas de usuarios. No imprimir secretos ni token files.
No instalar plugins, solicitar consentimiento OAuth, realizar compras ni borrar
vídeos. Conserva cambios ajenos; git add con rutas exactas, nunca add -A.
No crear más timers/crons. No lanzar otros agentes. Todas las publicaciones en inglés.
Si hay bloqueo, avisa por Telegram al operador y entrega reporte de lo pendiente.
No repitas una subida ambigua; reconcilia recibo + API antes de cualquier reintento.

## Material y preflight

Repo: /home/victor/Projects/web/micelclaw.com. Proyectos:
content-ops/video/projects/2026-08-ep5-mail y 2026-08-ep5-mail-vertical.
Export largo: /home/victor/Projects/_artifacts/video/2026-08-ep5-mail/exports/2026-08-ep5-mail.mp4
(171.789s, 1920×1080). Cortos: mismo staging vertical, exports/*vertical.mp4
y *vertical-nomusic.mp4 (39s, 1080×1920). Miniaturas duo-ep5.png y duo-ep5-cover.png;
captions.srt en ambos proyectos. Copys completos en proyecto horizontal/copys/.
Los dos cortos pasaron gateClip: música -15.1 LUFS; nomusic -14.9 LUFS, audio no mudo.
Repite gate y QA antes de publicar, incluidos principio, chat y cierre.

CORREGIDO Y VERIFICADO el 28 Sep antes de esta tarea: el máster vigente anuncia
«Next up: Photos» en voz/subtítulos y «Ep. 6 — Photos» en el cierre. El ejemplo real
de Inventory se conserva, pero ya no lo llama el siguiente módulo. Descripción y
capítulo final actualizados; duración 171.789s, 1920×1080, H.264 + AAC.
No repetir la regeneración. Verifica el hash/export y la evidencia en
/home/victor/Projects/_artifacts/scratch/ep5-mail-photos-correction/verification.json
y revisa el cierre del máster vigente antes de subir. La copia anterior está en
esa carpeta, bajo backup; NO publicar ese render anterior ni rediseñar el episodio.

## YouTube

Python ya instalado: /home/victor/.local/share/micelclaw-youtube/venv/bin/python.
Helpers existentes content-ops/scripts/youtube-{upload-private,complete,thumbnail}.py;
OAuth config /home/victor/.config/micelclaw-youtube (no imprimir su contenido).
Canal esperado UCAuPn0hzQp8s6JBuO5W9aIA. Usa items ep5-mail y ep5-mail-short.
Los helpers complete/thumbnail pueden restringir choices a Contacts: extender SOLO
para esos dos items Mail, conservando controles de canal/consent y recibos idempotentes.
No ampliar permisos ni inventar una API de related video. Channel playlists se pueden
leer: si no hay playlist, quitar placeholder, nunca inventar enlace.
Prepara metadata JSON válida desde copys, elimina <link-...> antes de cada subida.
Primero upload-private largo, thumbnail + captions English + metadatos, esperar
processing succeeded, hacerlo public y verificar por owner API. Registrar ledger
youtube/ep5-mail/date2026-09-28 con URL solo cuando privacy realmente sea public.
Después subir Short privado con descripción que enlaza largo; captions EN + metadata,
publicar/verificar y registrar youtube/ep5-mail-short. Configura la asociación nativa
en Studio si existe sesión/vía segura. Si no hay, avisa a María para hacerla; un link
en la descripción NO sustituye el related video y NO marcar asociación como hecha.

## Cortos y anuncios

Prepara URLs de hosting para Instagram: copia SOLO el corto aprobado y cover/card
a public/social/2026-09-28/ep5-*.mp4|jpg; commit/push esas rutas exactas. Si assets
PNG requieren JPG, usa generador existente. Build válido antes de push; conserva
todo lo ajeno. Espera deploy Cloudflare y verifica Content-Type video/mp4/image/*.
Para Instagram usa video_url público, no `video:` local que el script no interpreta.
INSTAGRAM_ACCESS_TOKEN puede estar vacío: token Facebook existente funciona como
fallback; pásalo por entorno sin mostrarlo. Usa nomusic en TikTok; gate vigente.
Publicar corto en Instagram y TikTok con scripts existentes. Lee spec de TikTok y
API status: distingue draft/inbox de público, no afirmar PUBLISH_COMPLETE si no lo es.
Si requiere acción móvil, avisa a María con caption suelto y cover, registra pendiente.

Solo después de verificar los enlaces YouTube públicos, rellena copys con URL larga
(y Short donde encaje). Publica los anuncios en Facebook, Telegram, Mastodon y
Bluesky usando el enlace al largo; no un segundo vídeo de Facebook por accidente.
Imagen de miniatura y texto adaptado a cada red. Verifica límites de texto antes.
Entrega X a María mediante scripts/lib/x-handoff.mjs, cada tuit por mensaje, imagen;
registra la entrega pero no confirmación live. Mantén idempotencia item ep5-mail,
fecha2026-09-28 en ledger. No ejecutar publish-day sobre todo queue/2026-09-28:
ese directorio tiene otro lote (Contacts). Ejecuta por fichero de este proyecto.
No hay stories de Mail aprobadas/preparadas: no inventarlas ni publicar nuevas ahora.
No blog/dev.to nuevo para Mail en esta tarea.

## Cierre y reporte

Verifica publicación por read-back owner/public APIs. Actualiza PUBLISH.md y notas
Mail de scripts/status.mjs según realidad; regenera STATUS.md. No marcar todo
publicado solo por aceptar una subida. Reporte final en español con URLs, estados
y acciones manuales pendientes; el wrapper lo envía al operador por Telegram.
La tarea arranca a las 20:00; procesamiento/corrección puede retrasar el momento
en que los vídeos queden públicos. Nunca publicar antes de esa hora ni otro día.
