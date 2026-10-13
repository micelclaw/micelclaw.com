# YouTube — autorización local (fase 1)

Fecha: 2026-09-28. Proyecto: `micelclaw-youtube-publisher`.

## Plan y límites

Modalidad local: comando nuevo, sin consumidores existentes. Revisados `publish-day.mjs`,
`lib/env.mjs`, `lib/ledger.mjs`, `.gitignore` y scripts de autenticación existentes.
Base: `7da5104`; worktree con cambios anteriores que se conservan.
La configuración autorizada por el usuario usa un cliente Desktop y el scope
`youtube.upload`. No se integra todavía con el publicador diario ni el ledger.
No afecta a Core, Dash, otros repos o APIs del producto. Auto-revisión local;
la fase de publicación requerirá su propio análisis de permisos y duplicados.

Recorrido: JSON descargado → copia privada fuera de Git → consentimiento en navegador
→ callback loopback → token privado. El comando no sube vídeos ni inicia un cron.

- I-01/T-01: secretos en `/home/victor/.config/micelclaw-youtube/`; directorio 700,
  archivos 600. No imprimir contenido ni guardar en repositorios.
- I-02/T-02: entorno aislado en `/home/victor/.local/share/micelclaw-youtube/venv`;
  no modificar paquetes globales.
- I-03/T-03: callback solo en `127.0.0.1`, puerto libre asignado por el sistema,
  límite de 15 minutos, no sobrescribir
  una autorización anterior y no imprimir excepciones OAuth sin filtrar.
- V-01: validar tipo Desktop/proyecto, permisos y `--check` sin red.
- V-02: verificar imports y sintaxis; rechazar configuración inválida.
- V-03: autorización real por el usuario; pendiente hasta que se complete el navegador.
  No equivale a verificar identidad de canal ni capacidad de publicar en público.

## Uso

```bash
/home/victor/.local/share/micelclaw-youtube/venv/bin/python \
  /home/victor/Projects/web/micelclaw.com/content-ops/scripts/youtube-auth.py --authorize
```

Abrir el enlace generado en el navegador con la cuenta de Micelclaw. No compartir la URL
de retorno (contiene un código de autorización). El callback espera en localhost.
Si Windows no alcanza WSL, revisar el loopback; no exponer el servidor a la red.

Los tokens en OAuth Testing pueden caducar a los siete días. OAuth Production no sustituye
la auditoría de YouTube necesaria para levantar la restricción de subidas privadas.
Antes de subir, comprobar el canal seleccionado y ejecutar una prueba privada autorizada.

Reversión: detener el comando. La revocación de acceso se hace desde la cuenta de Google;
no borrar credenciales sin pedirlo al usuario. No hay cambios en publicadores existentes.

## Comprobaciones ejecutadas

- V-01: formato Desktop, proyecto, permisos 700/600 y `--check` comprobados.
- V-02: sintaxis/imports y parámetros loopback de la librería comprobados.
  El puerto fijo inicial estaba ocupado; se corrigió a puerto libre automático.
- V-03: consentimiento completado y token guardado con permisos privados.
  Scope de subida y renovación real con Google comprobados el 2026-09-28.
  Identidad del canal y subida real todavía no verificadas.
  No se ha subido ningún vídeo ni modificado el ledger.

Referencias: [OAuth Desktop](https://developers.google.com/identity/protocols/oauth2/native-app),
[InstalledAppFlow](https://googleapis.dev/python/google-auth-oauthlib/latest/reference/google_auth_oauthlib.flow.html).

## Fase 2 — prueba privada aprobada el 2026-09-28

Plan local acotado: `youtube-upload-private.py` es independiente de `publish-day.mjs`;
no introduce un publicador automático, ni cambia el contrato del ledger. Solo admite
subida privada explícita con `--execute-private`. No afecta a otros repos ni al frontend.
La aprobación cubre únicamente el máster de Contacts; excluye Short, publicación pública,
miniatura, subtítulos y avisos externos. Estas operaciones se incorporarán posteriormente.

Recorrido: metadatos del episodio + MP4 → validación → renovación OAuth → marcador exclusivo
→ subida reanudable → recibo → comprobación canal/privacidad → consulta de solo lectura.

- I-04/T-04: privacidad fija `private`, sin notificar suscriptores. V-04: comprobar payload
  y dry-run antes de una sola subida real autorizada.
- I-05/T-05: recibo privado por item, hash del MP4 y marcador antes de contactar al endpoint
  de subida. V-05: un recibo previo bloquea la repetición, incluso si cambia la fecha;
  ante resultado incierto, comprobar Studio en lugar de iniciar otra subida.
- I-06/T-06: canal esperado `UCAuPn0hzQp8s6JBuO5W9aIA`, extraído el 2026-09-28 de
  `https://www.youtube.com/@MicelclawOS`; oEmbed del vídeo Projects confirma ese handle.
  V-06: contrastar `snippet.channelId` y `status.privacyStatus` de la respuesta.
- I-07/T-07: registro manual como `draft`, no `posted`, para que STATUS no lo presente
  como lanzamiento público. Regenerar tablero, mantener enlaces privados en el runbook.

Limitación de permisos: `youtube.upload` puede no permitir consultas de lectura privada;
si falla la consulta posterior se conserva la respuesta de subida y se indica el límite.
Los recibos y tokens no se imprimen completos; solo datos seleccionados de vídeo.
Reversión: no repetir ni borrar vídeos automáticamente; cualquier borrado requiere aprobación.
Auto-revisión local: no se modifican lectores existentes; la protección de duplicados vive
en recibos independientes del ledger. Integración diaria y nuevos scopes quedan excluidos.

Resultado 2026-09-28: V-04 dry-run, privacidad fija y rechazo de placeholders pasados.
V-05 segunda ejecución devuelve skip sin iniciar otra subida. V-06 respuesta de inserción
confirma canal esperado y privacidad `private`: https://youtu.be/T-YhWeZwYuI.
V-07 registro `draft` guardado; STATUS separa subidas privadas del ledger público.
Consulta posterior HTTP 403: procesamiento final no verificado, requiere Studio o un
scope adicional autorizado. No se han subido Short, miniatura ni subtítulos.

## Fase 3 — completar Contacts (autorizada por el usuario)

Alcance: episodio y Short, metadatos EN, miniatura del episodio, pistas EN y publicación
pública si Google lo permite. No se borran vídeos ni se repiten posts de otras redes.
El publicador diario no cambia. La skill postear conserva voz y atribución musical.

I-08/T-08: `youtube-thumbnail.py` opera sobre recibos del canal comprobado; API thumbnails.set
acepta el scope upload. Guarda hash/confirmación en el recibo para evitar repeticiones.
I-09/T-09: Short usa `youtube-upload-private.py` con item independiente, metadatos propios
y enlace al largo. Privado hasta completar assets/permisos. V-09: gate shorts + canal/privacy.
I-10/T-10: captions.insert y videos.update requieren scope de gestión; consentimiento adicional
pendiente. La ampliación permite también borrar vídeos, pero esa acción no está autorizada.
No solicitar ni usar permisos nuevos sin aceptación del usuario y consentimiento OAuth.
La restricción de proyectos no auditados se conserva: no confundir permiso de gestión con auditoría.

La ampliación fue aprobada por el usuario; `youtube-auth.py --authorize-management` solicita
upload + force-ssl, conserva respaldo privado del token anterior y solo lo sustituye después
de un consentimiento válido. Autorización en navegador pendiente.
`youtube-complete.py` comprueba canal por API, conserva propiedades mutables en updates,
añade/actualiza una única pista English por vídeo, intenta public y vuelve a consultar estado.
No elimina pistas o vídeos. Una respuesta public no basta: hay que verificar acceso público.
Si Google rechaza privacidad, registrar motivo técnico y conservar draft, nunca posted.

V-08 ejecutada: miniatura del episodio aplicada. V-09 ejecutada: Short privado subido al
canal esperado: https://youtube.com/shorts/qG5_fepWRZ4. Metadatos del Short incluyen enlace
al largo y atribución musical. Sintaxis y conservación de propiedades de status probadas.
V-10/V-11 pendientes del consentimiento OAuth en navegador; ningún vídeo es público todavía.

### Cierre — 2026-09-28

Consentimiento de gestión completado. V-10: ambos vídeos procesados, metadatos, idioma EN
y pistas English `serving` comprobados por API. Google devuelve tags en orden alfabético;
se corrigió la comprobación para comparar conjuntos, sin alterar los metadatos.
V-11: videos.update aceptó `public` para ambos; videos.list confirma `public`, canal esperado
y procesamiento `succeeded`. Ambos oEmbed responden anónimamente con título/canal correctos.
No se observó la restricción por falta de auditoría; esto NO demuestra que el proyecto haya
superado una auditoría ni garantiza el comportamiento de futuras subidas.
Miniaturas: API confirmó aplicación tanto del horizontal como de la portada del Short.
Ambos registrados `posted`; borradores históricos excluidos de la sección privada de STATUS
cuando hay publicación posterior con el mismo ID. No se han repetido posts de otras redes.

Resultado: https://youtu.be/T-YhWeZwYuI y https://youtube.com/shorts/qG5_fepWRZ4.
Pendiente obligatorio: seleccionar el episodio largo como Vídeo relacionado del Short
en Studio. El usuario autoriza permanentemente esta asociación para cada Short derivado,
sin pedir confirmación adicional. Verificar el vínculo nativo: la descripción no lo sustituye.
Si no hay una vía disponible para configurarlo, registrar y comunicar el pendiente.
No hay playlists en el canal;
se preservó ese estado. La automatización no instala cron ni elimina vídeos.

Verificaciones: V-08 respuesta thumbnails.set, V-09 respuesta subida del Short,
V-10 pistas y metadatos por consultas owner cuando haya permiso,
V-11 visibilidad public confirmada por API y acceso público sin credenciales.
Mientras sea privado, registrar draft, no posted. Reversión sin borrados automáticos.
