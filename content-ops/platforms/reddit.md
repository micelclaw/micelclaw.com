# Platform: Reddit — SOLO SUBREDDIT PROPIO

**Cuenta:** `u/Electrical_Week3771`, nombre visible "Micelclaw OS". El handle es el autogenerado del
alta y **Reddit no permite cambiarlo nunca**; se conserva a propósito porque abrir otra cuenta
reinicia la antigüedad, que es lo que miran los filtros de las comunidades grandes.

## La regla que gobierna esto

Reddit no es un canal de difusión: es una comunidad con sistema inmunitario. `GROWTH.md` §7.2 lo
fija y esto no lo cambia:

| Destino | Quién publica |
|---|---|
| **r/Micelclaw** (subreddit propio) | el agente, automático — es un canal propio como el de Telegram |
| r/selfhosted, r/homelab, r/LocalLLaMA… | **humano, siempre**. Un bot ahí quema la cuenta y el dominio |

Por eso `post-reddit.mjs` rechaza cualquier subreddit que no esté en `REDDIT_OWN_SUBREDDITS`. No es
una advertencia en un comentario: es una comprobación que aborta el envío.

## ⚠️ ESTADO REAL: la API está cerrada para nosotros (2026-08-05)

**El alta self-service de aplicaciones ya no existe.** Intentado ese día en
<https://www.reddit.com/prefs/apps> con el formulario relleno y el captcha validado: al pulsar
*create app* el captcha se resetea, no se crea nada y aparece un enlace a la *Responsible Builder
Policy*. No es un fallo del navegador — es la puerta.

Cómo está el asunto ahora:

- Hay que **solicitar acceso y que lo aprueben** antes de tocar la API. El punto de entrada es el
  wiki de la Data API (<https://www.reddit.com/wiki/api>), que enlaza el formulario de contacto.
- Categorías: *developer* · *researcher* · *moderator* · comercial. **La de moderador es la que más
  aprobaciones consigue**, y encaja: se pide para publicar en el subreddit propio que moderamos.
- Los tiempos se cuentan en **semanas**, y el uso personal/hobby está muy despriorizado.

**Decisión de coste/beneficio**: automatizar un subreddit recién creado, con ~0 miembros y como
mucho un post semanal, ahorra minutos al mes. No justifica semanas de espera. Mientras tanto,
`reddit.md` en la cola se entrega **a mano** (o a María, como X y TikTok — el mecanismo ya existe en
`scripts/lib/x-handoff.mjs`). Se revisa si r/Micelclaw llega a tener audiencia.

El código de abajo **ya está escrito y probado**; sin credenciales se salta con motivo y no rompe el
día. Queda latente para el momento en que haya acceso.

## Qué habría que configurar (si algún día lo aprueban)

1. **Crear el subreddit propio**: reddit.com → Crear una comunidad → `r/Micelclaw`. Sin esto no hay
   destino válido y el publicador se salta el día con motivo. *(Hecho: r/Micelclaw existe.)*
2. **Registrar la aplicación** una vez aprobado el acceso: tipo **script** (es el que permite actuar
   como la propia cuenta, sin flujo de navegador), redirect uri `http://localhost:8080` (obligatorio
   aunque no se use en ese tipo). Al guardar quedan a la vista el **client id** (la cadena corta bajo
   el nombre de la app) y el **secret**.
3. **Rellenar `content-ops/.env.local`**:

   ```
   REDDIT_CLIENT_ID=...
   REDDIT_CLIENT_SECRET=...
   REDDIT_USERNAME=Electrical_Week3771
   REDDIT_PASSWORD=...
   REDDIT_OWN_SUBREDDITS=Micelclaw
   ```

   - **Si la cuenta tiene 2FA**, la contraseña va como `contraseña:código` en cada llamada, y el
     código caduca en 30 s → inservible para un cron. Con 2FA hay que pasar a *refresh token*
     (flujo de autorización una vez, y se guarda el token). Dilo si es el caso y lo cambio.
   - `.env.local` **nunca se commitea** (está en `.gitignore`).

## Detalles de la API que importan

- **User-Agent obligatorio y descriptivo.** Reddit devuelve **403** a los genéricos; comprobado el
  2026-08-05 intentando leer el perfil con un UA de navegador. Formato:
  `plataforma:id-app:versión (by /u/usuario)`.
- **Token**: `POST https://www.reddit.com/api/v1/access_token` con `grant_type=password` y Basic
  auth `client_id:secret`. Dura 1 hora; se pide uno por ejecución y no se guarda.
- **Publicar**: `POST https://oauth.reddit.com/api/submit` con `sr`, `kind` (`self` para texto,
  `link` para enlace), `title` y `text`/`url`.
- **Trampa de la API**: `/api/submit` responde **HTTP 200 aunque falle**. El error va dentro del
  cuerpo, en `json.errors`. Un publicador que solo mire el código de estado da por publicado lo que
  Reddit rechazó — por eso el nuestro mira los errores del cuerpo.
- **Límite**: 100 peticiones/minuto por client id. Irrelevante a este volumen.

## Formato de la cola

`queue/<fecha>/reddit.md`: el cuerpo es el texto (Markdown, que Reddit entiende nativamente), más
líneas opcionales:

```
title: El titular del post
subreddit: Micelclaw
link: https://micelclaw.com/blog/...
```

- **`title` es obligatorio** (Reddit no lo deduce del cuerpo). Máximo 300 caracteres.
- Sin `link:` sale como post de texto; con `link:`, como post de enlace.
- `subreddit:` es opcional: por defecto, el primero de `REDDIT_OWN_SUBREDDITS`.

## Expectativa honesta

Un subreddit propio recién creado tiene **cero miembros**, así que publicar ahí no llega a nadie por
sí solo. Sirve como archivo y como destino al que enlazar, no como canal de captación. Lo que trae
gente sigue siendo el post humano de lanzamiento en r/selfhosted del mes 2 (`GROWTH.md` §4) — y ese
no lo publica el agente.
