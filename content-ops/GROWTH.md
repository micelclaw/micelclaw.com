# GROWTH.md — playbook de crecimiento (0 → primeros 1000)

> Investigación 2026-07-25 (6 barridas web en paralelo + verificación por API de Bluesky/Mastodon).
> Estado de partida: 52 posts publicados en 11 días, 0 seguidores y 0 visualizaciones en todas las redes.
> Diagnóstico: emitimos sin bucle de descubrimiento — solo broadcast, cero replies, cero comunidades,
> y sin presencia en las superficies donde el nicho descubre cosas (feeds keyword de Bluesky, hashtags
> de Mastodon, r/selfhosted, HN, newsletters, directorios).

## 1. Veredicto: seguir gente de forma automatizada — NO (con una alternativa mejor)

| Red | ¿Auto-follow? | Por qué |
|---|---|---|
| X | **NO** | Regla de automatización más vigilada de 2026; ban waves masivas; churn detectado por ratio; API sin vía gratuita (endpoints follow eliminados del free tier en 2025). Ban = perder el handle de marca para siempre. |
| Instagram/Facebook | **NO** | La Graph API ni siquiera expone follow → todo bot usa APIs privadas (violación ToS). "Gran purga" de mayo 2026: cuentas con tácticas bot perdieron 30-60% de audiencia retroactivamente. Cuentas nuevas = límites más duros y bloqueos más rápidos. |
| TikTok | **NO** | Prohibición explícita; la penalización se paga en distribución (lo único que importa allí). |
| Bluesky | **NO al churn** | La API es libre, pero las guidelines (oct 2025) prohíben manipular "engagement metrics, follower counts"; moderación endurecida desde sept 2025. El mecanismo legítimo (starter packs) es además MÁS potente. |
| Mastodon | **NO, radioactivo** | Los self-hosters ADMINISTRAN las instancias: un follow-bot es exactamente lo que suspenden y defederan. Es la forma más rápida de quemar la marca ante su propio público objetivo. |
| YouTube/Telegram | **N/A** | No hay mecánica de follow-back explotable; sub4sub = strike; adds masivos en Telegram = ban casi instantáneo (Trust Score). |

Y aunque no te pillaran: los datos reales de follow-back del churn en 2026 son **0.11-0.25%**
(≈70 seguidores tras una semana de bot 24/7), de pésima calidad, y ese peso muerto hunde el
engagement-por-seguidor → los algoritmos suprimen el alcance. Riesgo máximo, techo mínimo.

### La alternativa legítima (y es la que haremos): el agente CURA, el humano EJECUTA
- **Cola diaria de follows sugeridos**: el agente recolecta 15-25 cuentas relevantes/día
  (hashtags #selfhosted/#homelab, miembros de starter packs, stargazers de repos adyacentes,
  autores de dev.to) → lista de revisión → Víctor pulsa follow a mano (5 min/día). Legal en todas.
- **Bulk-follow sancionado**: "Follow all" de starter packs en Bluesky e import CSV de listas de
  follows en Mastodon son features nativas con clic humano. Seed inicial: las ~40 cuentas del
  Fedi.Directory (Self-Hosting) + packs de homelab.
- **Replies asistidos**: el agente sugiere 6-12 hilos/día donde aportar; las respuestas las
  escribe/aprueba un humano. La táctica dominante 2026 en Bluesky/Mastodon es reply-first (80/20).

## 2. Quick wins (esta semana, casi gratis)

1. **Bluesky: handle @micelclaw.com** — TXT `_atproto.micelclaw.com` vía el módulo DNS de Core.
   Verificación gratuita + credibilidad ante este público. (Hoy: micelclaw.bsky.social, 0 followers.)
2. **Bluesky: keywords literales en el TEXTO** — los feeds del nicho son keyword-matched
   ("Selfhosting" matchea selfhosted/selfhost/homelab/proxmox/traefik...). Escribir "self-hosted"
   o "homelab" en el cuerpo del post = aparecer en esos feeds con 0 seguidores. → regla en
   `platforms/bluesky.md`.
3. **Bluesky: starter packs** — pedir inclusión en packs existentes ('Selfhosted starter pack',
   'Homelab & 3D Printing' de @johnbwoodruff.com) y crear el nuestro ('Self-hosted AI & Homelab',
   ~40 cuentas curadas). Estudio ICWSM 2025 (25M usuarios): estar en packs = hasta +85% followers;
   los packs generan ~20% de TODOS los follows de la red. Es el mecanismo nº1 y es 100% legítimo.
4. **Mastodon: el post #Introduction que nunca se hizo** — costumbre de la red: los introductions
   reciben boosts de desconocidos. El mayor ROI pendiente allí.
5. **Mastodon: formato correcto en cada post** — 3-5 hashtags CamelCase (#SelfHosted #HomeLab
   #FOSS #Privacy), alt-text SIEMPRE, y mención a @homelab@fedigroups.social cuando toque
   (auto-boost a todo el grupo). #selfhosted mueve ~3-4 posts/hora: un buen post queda visible horas.
6. **Decidir instancia de Mastodon AHORA** (1 follower = mudanza gratis; los posts no migran):
   (a) quedarse en mastodon.social (solo descubrimiento por hashtag), (b) invite a Fosstodon
   (ahí viven selfh.st, HedgeDoc, BookStack — mejor timeline local del nicho; prohíbe promo
   "excesivamente comercial" pero acoge proyectos propios), o (c) **self-hostear GoToSocial en
   social.micelclaw.com** — dogfooding perfecto para la marca y verificación por dominio.
7. **Email a selfh.st y noted.lol** — Self-Host Weekly (viernes) pide submissions de developers;
   una mención = miles de self-hosters que instalan cosas. Pitch cuidado: es la mejor puerta del
   nicho y es una sola persona (Ethan Sholly). El formulario se envía A MANO (bloquea bots).
8. **Directorios en una tarde**: AlternativeTo ("Suggest new application"), opensourcealternative.to
   (si aplica), SaaSHub, selfh.st/apps, openapps.pro. SEO permanente + backlinks. El agente
   pre-redacta, el humano envía.
9. **Captura de email desde ya** — Listmonk/Ghost self-hosted (es contenido en sí mismo) con un
   lead magnet concreto ("Self-hosting Micelclaw in 15 minutes"), mismo CTA en blog, README,
   descripciones de vídeo.
10. **X: registrar el handle** aunque siga en borrador (proteger marca). Ojo API: $0.20/post con
    link — si algún día se publica, hook en texto y link en reply.

## 3. Cimientos (semanas 1-4)

- **Rutina diaria de 15 min de replies** (humano, con hilos sugeridos por el agente) ANTES del
  post del día en Mastodon/Bluesky. Broadcast-only = estancado a ~0 en ambas culturas.
- **Envejecer cuentas personales YA**: Reddit (karma en r/selfhosted, r/homelab, r/LocalLLaMA
  comentando sin promo 3-4 semanas) y lemmy.world (gate DURO de 30 días de antigüedad en
  !selfhosted + tag [AIP] con disclosure de IA obligatorio desde jul 2026).
  - **Reddit: la cuenta YA EXISTE** (registrada en `PROFILES.md` el 2026-08-05):
    `u/Electrical_Week3771`, nombre visible "Micelclaw OS". El handle es el autogenerado y
    **Reddit no permite cambiarlo jamás** — se conserva a propósito: abrir una cuenta nueva
    reinicia el reloj de antigüedad, que es justo lo que miran los filtros de r/selfhosted.
    Pendiente de medir: karma y fecha de alta (Reddit devuelve 403 a las consultas desde el box;
    míralo en el propio perfil).
  - **Lo que puede hacer el agente aquí**: curar hilos donde aportar de verdad y dejar el
    comentario redactado. **Publicarlo lo hace el humano** (§7.2). Eso es lo que construye el
    karma que exige el post de lanzamiento del mes 2.
  - 🚫 **APARCADO el 2026-08-05.** Se intentó con la cuenta de MARCA y Reddit la rechazó por los
    tres lados: comentario en r/selfhosted retirado a los 10 min, subreddit propio r/Micelclaw
    **baneado nada más crearlo**, y la API cerrada. No es shadowban (comprobado: sus posts salen
    en los listados públicos). Es el trato por defecto a una cuenta sin historial.
    **La línea de arriba dice "cuentas PERSONALES" y ahí está el error**: en Reddit se participa
    como persona, no como marca — una cuenta llamada "Micelclaw OS" recién creada es exactamente
    el patrón que sus filtros cazan. El usuario **no tiene** cuenta personal con uso, así que esta
    palanca queda fuera hasta que exista una. La cuenta de marca se deja envejecer sin tocarla.
    Herramientas listas para cuando se retome: `scripts/reddit-radar.mjs` y
    `platforms/reddit-rutina.md` (funcionan con cualquier cuenta; solo cambia quién pega).
- **Decidir la postura open-source — gatea todo lo demás**: awesome-selfhosted (308k stars)
  exige FOSS + primera release hace >4 meses + releases tagueadas. Publicar un repo público YA
  arranca ese reloj (candidatos: spec MACP, plugin n8n, un módulo). Si no hay FOSS, queda
  non-free.md. Añadir `ai-declaration.md` al repo (lo exige Lemmy verbatim y desarma la
  objeción nº1: "AI slop").
- **YouTube**: verificación de ID para desbloquear Posts ya; playlists en serie ordenadas
  ("Module Tours #1-#N", el de mejor retención primero); auto-dubbing activado; disclosure de IA
  bien configurado (pipeline TTS/Remotion); revisar la política de "inauthentic content" antes
  de aplicar a YPP.

## 4. Lanzamientos escalonados (mes 2, cuando las cuentas tengan edad)

Secuencia: **r/selfhosted → (1-2 semanas) → Show HN → newsletters/podcasts**. Nunca el mismo
anuncio en todas partes la misma semana (pattern-match de spam).

- **r/selfhosted** (~800k, la comunidad nº1 para esto): post HUMANO tipo "I built Micelclaw OS —
  self-hosted AI productivity OS (tear it apart)", screenshots, docker-compose, requisitos de
  hardware, afiliación declarada, disclosure de IA honesto. Jamás publicado por el agente.
- **Show HN** (el techo más alto: 5-50k visitas/48h, ~1.4 stars/upvote): requiere producto
  PROBABLE sin fricción (demo pública o docker one-liner) — prerequisito, no nice-to-have.
  Mar-Jue 9-12 ET, título neutro, responder en el hilo 4+ horas, CERO upvotes coordinados
  (voting-ring detection penaliza el dominio entero).
- **Podcasts/newsletters del nicho**: el podcast Self-Hosted (Jupiter) MURIÓ en mayo 2025 —
  los targets ahora son selfh.st podcast, 2GuysTek, Digital Spacecast, Changelog (homelab) y
  Console.dev (review editorial gratuita, exige trial self-serve).

## 5. Vídeo (ajustes al plan actual)

- **Shorts/Reels/TikTok distribuyen content-first**: 0 seguidores NO es bloqueo estructural.
  Suelo normal: 10-500 views/short las primeras semanas; se evalúa a los ~30 vídeos, no antes.
- **Hook-first obligatorio**: frame 1 = payoff o dolor sobre UI real + overlay de 4-8 palabras;
  NUNCA logo/intro de tráiler (es exactamente lo que mata la retención en el segundo 1-3).
  Keyword hablada y en pantalla en <3s; caption con keyword en los primeros 50 caracteres;
  3-5 hashtags máx.
- **Formato ganador para devs**: pantalla real + voz humana enérgica, una tarea concreta por
  short ("self-host your photo backup in 45 seconds" — el formato Appwrite/Fireship).
- **Subida NATIVA por plataforma** (el agente ya renderiza masters): jamás repost con watermark
  (hasta -40% de alcance en Meta/Shorts).
- **Cada Short enlaza a su episodio padre** (Related Video link) + CTA verbal en los últimos 5s.
- **Dato para decidir** (no aplicado — la regla vigente es 2:30): el sweet spot de recomendación
  del nicho en long-form es 8-12 min y el "session contribution" favorece series; los tours de
  2:30 rinden en búsqueda pero apenas entran en Suggested. Opción: mantener tours 2:30 como
  serie + 1 vídeo insignia mensual de 8-12 min tipo "I replaced Google with a self-hosted AI OS".
- **TikTok es el mayor hueco**: mejor cold-start con 0 followers de las tres; Supabase/Appwrite
  prueban el formato exacto. **Fijado el 2026-07-27 en 3/semana** (1 episodio + 2 cortos), con
  plantilla y barrera de calidad propias; ver `platforms/tiktok.md`. El techo de 3-5 sigue en pie.
- **IG/Facebook → modo bajo coste** (syndication automática, memes dev-culture ocasionales):
  los devs no están ahí; reasignar el esfuerzo a TikTok/Shorts/comunidades.

## 6. Flywheel sin seguidores (el agente sí puede con esto)

- **pSEO en micelclaw.com**: páginas "Micelclaw vs X" / "best self-hosted <categoría>" con datos
  reales por página (matriz de features + screenshots). Long-tail rankea en 4-12 semanas; cabeza
  en 3-6 meses. Mercado con viento de cola ("Year of Self-Hosted Software", ~12% CAGR).
- **GitHub como homepage real**: README con GIF demo + docker one-liner + tabla comparativa +
  topics self-hosted/homelab/ai-agents. Los spikes de HN/Reddit y las stars se retroalimentan.
- **dev.to**: seguir republicando con canonical_url (7.6M visitas/mes) pero sin contarlo para
  los primeros 1000.

## 7. Reglas duras para el agente content-ops

1. **Automatizar SOLO canales propios**: blog, dev.to, Mastodon, Bluesky, Telegram, FB/IG, TikTok.
2. **JAMÁS publicar en comunidades AJENAS** (r/selfhosted y demás subreddits de otros, Lemmy, HN,
   Discords ajenos, lobste.rs): post humano, autoría declarada. Lemmy prohíbe posts automatizados
   explícitamente; awesome-selfhosted rechaza PRs generados por máquina; r/selfhosted está en plena
   reacción anti-slop (jul 2026). Un bot ahí se lleva por delante la cuenta **y el dominio**.
   - **La excepción, y es la única**: un **espacio PROPIO** — r/Micelclaw, un Discord nuestro — es
     un canal propio, igual que el canal de Telegram. Ahí sí puede publicar el agente: no hay
     norma de autopromoción que romper porque la casa es tuya.
   - Por eso `post-reddit.mjs` **solo acepta subreddits propios** (`REDDIT_OWN_SUBREDDITS`): un
     `subreddit:` mal puesto en la cola no puede acabar en un baneo. Decidido el 2026-08-05.
   - **Pero la API está CERRADA** (comprobado el 2026-08-05: el alta self-service de apps ya no
     existe; hay que pedir acceso y esperar aprobación, semanas, con el uso personal muy
     despriorizado). Automatizar un subreddit de ~0 miembros no compensa esa espera: de momento
     r/Micelclaw se publica a mano. Detalle en `platforms/reddit.md`.
3. **Nada de auto-follow/auto-like/auto-DM en ninguna red**. El agente cura candidatos; el
   humano ejecuta.
4. Cuenta que postee el agente en Mastodon → flag "Automated" si el volumen delata; respetar
   #nobot siempre.
5. Ventana de publicación fediverso: Mar-Jue ~13:00-17:00 UTC (validar con datos propios a las
   4 semanas).

## 8. KPIs y expectativas honestas (revisar a 90 días)

- Bluesky: cientos bajos de followers en 90 días si hay packs + replies diarios (las curvas de
  los blogs de growth-tools son techos optimistas).
- Mastodon: menos volumen pero el mejor fit audiencia/usuario; medir replies/boosts, no followers.
- YouTube: 6-12 meses a 1000 subs ejecutando bien; juzgar por CTR (4-6%+), retención (70%+ en
  tours de 2:30) e impresiones de búsqueda — no por views.
- Shorts: retención >70%, swipe-away <30%, CTR short→episodio; evaluar a los 30 vídeos.
- El pico follower-independent más probable = un buen Show HN. Convertir cada pico en email.

## Fuentes clave

ICWSM 2025 starter packs (arxiv.org/abs/2501.11605) · guidelines Bluesky oct-2025 ·
Fake Engagement Policy YouTube · CONTRIBUTING de awesome-selfhosted-data · reglas Lemmy
!selfhosted jul-2026 (lemmy.world/post/48725669) · showhn.html + newsfaq de HN · selfh.st/about ·
purga IG mayo-2026 (Yahoo Creators) · pricing X API 2026 · experimento follow-bot
(medium.com/@colmhayden) · API pública Bluesky/Mastodon (verificado 2026-07-25).
Los números de blogs de marketing (curvas de followers, % de algoritmo) son direccionales,
no benchmarks.
