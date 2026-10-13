# Ep. 5 — Mail · publicación única del 28 Sep 2026

## Verificado en vivo

- Máster correcto: SHA-256 `4ab084b5c735eeb800ee33a61bf19fdc45bbba5b109696aeb099b4de3f37e713`; 171.789 s, H.264/AAC, cierre «Next up: Photos» y «Ep. 6 — Photos». La copia anterior no se subió.
- [Episodio largo](https://youtu.be/2tE-EroGaTQ): público, procesado, canal `UCAuPn0hzQp8s6JBuO5W9aIA`, miniatura aplicada y subtítulos English `serving` (owner API).
- [Short](https://youtu.be/356e5p0NepM): público, procesado, mismo canal, subtítulos English `serving`; descripción con enlace al largo. **Vídeo relacionado nativo pendiente** en Studio; María avisada.
- [Instagram Reel](https://www.instagram.com/reel/Dd1zNRNjg48/): Graph API `VIDEO`/`REELS`, público. La línea interna `item: ep5-mail` aparece al principio del caption publicado; Graph API rechazó la edición. **María avisada para quitar esa línea en la app**, sin duplicar el Reel.
- TikTok: envío `v_inbox_file~v2.7690650545274619926`, API `SEND_TO_USER_INBOX`, **aún no público**. María recibió la instrucción, la portada y el caption inglés en mensajes separados. Debe tocar la notificación en la app, añadir música del catálogo y publicar. No se reenvió el archivo.
- [Facebook](https://www.facebook.com/122128325258915397/posts/122128376294915397): post con imagen y enlace al largo, no segundo vídeo. Graph API read-back `type=photo`; caption corregido en el mismo post.
- Telegram: mensaje 29 en el canal; caption corregido mediante `editMessageCaption`.
- [Mastodon](https://mastodon.social/@micelclaw/117350029085051311): público con imagen; línea interna quitada mediante edición del mismo status y read-back.
- [Bluesky](https://bsky.app/profile/micelclaw.bsky.social/post/3mwlwb5goe32j): post público con tarjeta que enlaza al largo. El registro PDS se actualizó sin cambiar la URI para quitar la línea interna, pero la AppView pública todavía devuelve la versión anterior: **verificar propagación** antes de dar el texto por corregido.
- X: cuatro tuits y la imagen entregados a María por Telegram. **Publicación en X no confirmada**.

## Evidencia y límites

- Assets del Reel/card/cover: commit `0daa5d2`, build Astro correcto, Cloudflare sirvió HTTP 200 con `video/mp4` e `image/jpeg`.
- Ledger: `content-ops/posted/posted.jsonl` con item `ep5-mail` y fecha `2026-09-28`; TikTok tiene observación posterior `draft`/`SEND_TO_USER_INBOX`. El primer registro `posted` de TikTok fue escrito por el script al salir en `PROCESSING_UPLOAD` y significa envío, no publicación pública.
- Copys locales actualizados con enlace real y sin placeholders. No se publicaron stories ni blog/dev.to de Mail.
