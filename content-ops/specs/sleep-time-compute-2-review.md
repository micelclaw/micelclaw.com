# Sleep Time / Digest — revisión editorial y evidencia

Fecha de preparación y publicación aprobada: 2026-09-28. La carpeta/media 2026-09-30
conserva la fecha propuesta original; `publication_date` indica 2026-09-28.
El usuario aprobó «Perfecto publica» tras revisar la traducción editorial. Blog
`draft:false`, lote `approved:true`. ROADMAP no se recrea: fuente STATUS.

## Autorización y alcance

El usuario autorizó preparar blog, dev.to y derivadas con datos artificiales; autorizó
usar Paco con permisos admin **como excepción para esta tarea**, no como regla permanente.
Paco: `dd4d75fb-8bfb-44c8-b858-0d56364fe728`. Sesión renovada mediante el helper existente,
sin revelar ni incorporar credenciales al contenido. No reinicio de Core, cambios de
roles, SQL directo, envío de correo, publicación social, push o notificaciones a María.

## Datos y resultado real

Caso Harbor Lights, expresamente ficticio. Se crearon por REST 3 notas, 1 evento local
sin asistentes ni recordatorios y 2 bookmarks de example.com. Tag `demo`,
`morning-briefing-2026-09-28`; `custom_fields.synthetic_demo=true`.
Manifest de IDs y configuración: `_artifacts/scratch/sleep-time-content-demo/manifest.json`.
Los registros se conservan para revisión; no se borraron datos anteriores.

Para aislar el lote se ejecutó primero el digest real de los 9 cambios ya pendientes de
Paco. Esto marcó esos cambios como digeridos (operación normal), sin borrar sus registros.
Después se comprobaron los 6 IDs nuevos en pending y se ejecutó el digest real.
Configuración temporal: intervalo 5 min y quiet hours 00:00–23:59 para no disparar
el despertar de OpenClaw. Canales originales solo Dash; no SMTP/Telegram habilitado.
Resultado: `f4dad319-1322-49a1-95a6-e73e57cfc303`, 6 cambios,
domains notes/events/bookmarks, SILENT, channels_delivered history_only.
Generación real a las 12:28 del 28 Sep; no ejecución nocturna ni fechas retocadas.
El ciclo normal escribe DIGEST.md como parte de su funcionamiento; no se fabricó un resumen.

Captura quiet hours: se activó realmente 23:00–07:00 y se restauró después.
Configuración final comprobada por GET: enabled true, 30 min, quiet_hours null,
domains null, channels [dash], alert_levels [SILENT,NORMAL,URGENT].
Durante las capturas hubo una indisponibilidad transitoria del puerto 7200; volvió
sin intervención de esta tarea. Se reintentó la captura y se comprobó la restauración.

## Límites observados — revisar antes de aprobar

- `/digest/history/:id/changes` devolvió HTTP 500, código 42846 en la comprobación inicial.
  Repetido tras recuperar Core: sigue devolviendo HTTP 500/42846.
  No se simula un drill-down funcional; no hay arreglo de producto dentro de esta tarea.
  Los IDs se verificaron en pending antes de la generación; no se afirma verificada su
  membresía por el endpoint de detalles que falló.
- AI summary generado en español (prompt actual lo solicita). El usuario autorizó
  traducir únicamente este lote. Se crearon representaciones editoriales HTML→PNG
  del digest en inglés, etiquetadas «Translated from the original Spanish output».
  No son capturas de una UI que genere inglés nativamente. Se conservan timestamp,
  count, level, domains y el error «next month». Originales intactos en inbox y copia
  `public/images/sleep-time-history-original-es.png`; artículo enlaza esa copia.
  Fuente/traducción: `_artifacts/scratch/sleep-time-content-demo/translation.json`.
  Ningún cambio en Core, Dash, prompts, settings o registros del producto en esta revisión.
- La salida afirma «próximo mes» para una cita del 29 Sep, aunque se generó el 28 Sep.
  Error temporal conservado y explicado: la cita original prevalece sobre el resumen.
- Telegram digest es placeholder (`delivery-engine.ts`). SMTP no probado aquí.
- Digest periódico ≠ motor Sleep Time. No se simula historial de hábitos o tareas
  de sueño completadas. No se presenta esta sesión admin como prueba de permisos Free.

## Fuentes inspeccionadas

- Core: `routes/digest.ts`, `services/digest.service.ts`, `services/digest-history.service.ts`,
  `services/delivery-engine.ts`, `jobs/digest.job.ts`, `jobs/sleep-time.ts`, `lib/crud-hooks.ts`.
- Dash: `modules/digest/DigestHistoryPage.tsx`, `components/settings/sections/DigestSection.tsx`,
  `modules/notes/NotesPage.tsx`, `modules/notes/NoteEditor.tsx`.
- Blog y dev.to: cuerpo común; dev.to incorpora apéndice técnico basado en las fuentes
  anteriores, imágenes absolutas y canonical_url. No APIs o cifras externas inventadas.

## Material del lote

Blog + dev.to; Mastodon, Bluesky, Telegram, Facebook, Instagram, hilo X;
5 stories estáticas 1080×1920; 3 tarjetas de feed 1080×1350 por público;
capturas originales y render traducido para el blog. Publicación registrada en ledger.
No TikTok ni Reel ni GIF mudo: este lote utiliza imágenes; no se produjo un corto con voz.
No se crean crons. Mail, TikTok y YouTube no incluidos en esta publicación.

## Gate de publicación

Gate satisfecho con el OK expreso del usuario tras revisar los límites y la traducción.
Commit `cd2e004` incluye únicamente el artículo y 12 imágenes de esta pieza: no se
incluyeron cambios ajenos de inventory, AGENTS, ROADMAP, credenciales u otros lotes.
Push a main; GitHub check Cloudflare Pages completed/success. Artículo y medios
verificados por GET público (contenido del artículo y Content-Type image/*).
dev.to publicado y leído por API: canonical correcto y explicación de traducción presente.
Scripts de publicación reutilizados; `--queue-date` separa carpeta de fecha real y
evita un relanzamiento automático en la fecha provisional. STATUS cuenta stories por frame.

## Resultado de publicación — 28 Sep

- Blog: https://micelclaw.com/blog/sleep-time-compute-2
- dev.to: https://dev.to/micelclaw/while-you-sleep-a-quieter-way-to-catch-up-11b6
- Mastodon: https://mastodon.social/@micelclaw/117348346171046636
- Bluesky: https://bsky.app/profile/micelclaw.bsky.social/post/3mwl6dn4lca2l
- Telegram: https://t.me/micelclaw/28
- Facebook: https://www.facebook.com/122128325258915397/posts/122128329320915397
- Instagram feed: https://www.instagram.com/p/Dd1CofdoCaI/
- Stories: 5/5 verificadas activas por Graph API, en orden, IDs
  18124398512508957, 17957378922252144, 18106988207184740,
  18175746637387455, 18102895337377798.
- X: 4 tuits + imagen entregados a María por Telegram; no confirmación de publicación en X.
- Aviso de guardar stories en destacado enviado a María; destacado no confirmado.

Read-back: dev.to API con published_at y canonical correctos; Mastodon visibility
public y media; Bluesky getPosts con imagen; Facebook Graph con permalink, texto y
attachment; Instagram Graph con caption, permalink y 5 stories activas. Telegram
sendPhoto exitoso y getChat confirma canal público micelclaw. STATUS regenerado;
ninguna pieza sin publicar en cola (X cuenta como entregado, no confirmado en vivo).
No reinicio ni cambios del producto. No publicación de Mail u otros lotes.

## Verificación ejecutada

- `pnpm build`: completado, 23 páginas; aviso de imports sin uso de Astro/Vite,
  sin errores. Borrador excluido de rutas públicas por `draft:true`.
- Tarjetas re-compuestas tras QA: las capturas se muestran completas, con altura
  intrínseca (sin `cover` que recortaba texto). Paleta y safe zones de compose-card;
  composición específica en `_artifacts/scratch/compose-sleep-content.mjs`.
- 3 tarjetas feed + 5 stories; copias idénticas en queue y public/social, sin desplegar.
- Capturas originales Notes, Digest y Quiet Hours inspeccionadas visualmente.
  Revisión de idioma: se usó un render editorial offline del digest traducido,
  no interceptación de respuestas ni edición de datos almacenados. Notes y Quiet
  Hours conservan sus capturas. Quiet Hours original restaurado por GET en la preparación.
