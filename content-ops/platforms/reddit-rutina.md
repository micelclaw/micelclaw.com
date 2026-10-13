# Rutina diaria de Reddit — construir karma sin quemarse

Encargada el 2026-08-05. Se ejecuta **después** de publicar en las redes con API, cuando el usuario
dice *"postea lo de hoy"* o similar.

## 🚫 APARCADA (2026-08-05) — no ejecutar salvo petición expresa

Reddit rechazó la cuenta de marca por los tres lados el mismo día:

| Intento | Resultado |
|---|---|
| API para publicar en subreddit propio | Alta self-service **cerrada**; hay que pedir permiso y esperar semanas |
| Comentario en r/selfhosted | **Retirado por Reddit** a los 10 minutos |
| Crear r/Micelclaw | **Baneado** nada más crearlo (404 desde fuera, comprobado) |

Causa común: cuenta creada hace días, sin historial. **No es shadowban** — sus posts aparecen en los
listados públicos, medido. Es el trato por defecto de Reddit a una cuenta nueva.

**El error de fondo**: `GROWTH.md` §3 pedía envejecer **cuentas PERSONALES**, y se montó todo sobre
una cuenta de MARCA. En Reddit se participa como persona; una cuenta llamada "Micelclaw OS" recién
creada es literalmente el patrón que sus filtros cazan. El usuario no tiene cuenta personal con uso,
así que la palanca queda fuera hasta que exista una.

**Qué hacer mientras**: nada. Dejar la cuenta de marca quieta envejeciendo, y verificar su email
(ver abajo) porque es gratis. No generar borradores: se los borran.

Todo lo de abajo funciona y está probado — sirve tal cual con cualquier cuenta el día que se retome,
porque lo único que cambia es quién pega el comentario.

---

## ⚠️ ESTADO DE LA CUENTA (2026-08-05)

El primer comentario publicado con `u/Electrical_Week3771` en r/selfhosted **lo retiró Reddit** a los
10 minutos ("Comentario retirado por Reddit" — el filtro automático del sitio, no un moderador).

**NO es shadowban. Medido, no supuesto**: se publicó un post en r/ShadowBan y **aparece en el
listado público del subreddit** (`r/ShadowBan/new/.rss`, puesto 9), leído sin sesión. Los posts de
una cuenta en shadowban no salen en los listados para terceros.

> Falso indicio que conviene no repetir: `user/<nombre>/.rss` devuelve **404** para esta cuenta y
> 200 para una normal. Eso **no** prueba shadowban — el feed de perfil depende de que haya
> contenido visible, y se interpretó como señal de baneo cuando no lo era. La prueba buena es el
> **listado del subreddit**, no el feed del perfil.

**La causa real es el Contributor Quality Score**: la nota interna que Reddit da a cada cuenta.
Una cuenta nueva arranca en la más baja, y con esa nota los filtros de los subreddits grandes
retiran los comentarios automáticamente. No es un castigo: es el estado por defecto.

### Qué hacer mientras la nota sube

1. **Verificar el email** de la cuenta. Sin email verificado el filtrado es bastante más duro, y es
   de lo poco que sube la fiabilidad **al instante** en vez de con semanas de actividad.
   Ruta: avatar → *Settings* → pestaña *Account* → fila **Email address**. Si sale como no
   verificado, hay un botón para reenviar el correo; si no hay ningún correo puesto (Reddit permite
   crear cuenta sin él), se añade ahí y se verifica igual. En la app: avatar → Settings → Account
   settings → Email address.
   Bonus: sin email no se puede recuperar la cuenta, y en una cuenta de marca cuyo handle **no se
   puede cambiar** perderla sería definitivo.
2. **Empezar por subreddits tranquilos.** El radar ya apunta ahí por defecto (niveles 1 y 2); los
   grandes quedan fuera hasta que la cuenta aguante. Ver la tabla de abajo.
3. **Comprobar que cada comentario sobrevive**: abrir su enlace en ventana privada a los 10 min. Si
   desaparece, ese subreddit todavía filtra a la cuenta y no merece la pena insistir ahí.
   **Es la única medida real de si la cuenta ya pasa el filtro** — el ritmo de publicación mide
   competencia, no filtrado.
4. **No borrar y volver a publicar** lo retirado: empeora la señal.

### A dónde apunta el radar, y por qué

El ritmo se **midió** el 2026-08-05 (los 25 posts más recientes de cada feed y las horas que
abarcan). No hay forma de leer suscriptores sin API, pero el ritmo dice lo que importa: cuánta
competencia tiene un comentario por ser leído — y correlaciona con lo duro que filtran.

| Nivel | Subreddits | Ritmo medido | Cuándo |
|---|---|---|---|
| **1** | r/docker · r/Nextcloud · r/pihole · r/truenas · r/HomeServer · r/Proxmox | 2-8 posts/día | **Ahora.** Poca competencia y todo cae en lo que Víctor ha construido |
| **2** | r/ollama · r/immich · r/jellyfin | 15-23/día | Ahora también (van en el barrido por defecto) |
| **3** | r/selfhosted · r/homelab · r/LocalLLaMA | mucho más | **Mes 2**, cuando los comentarios del nivel 1 sobrevivan. Son los que retiraron el primero |

```bash
node scripts/reddit-radar.mjs             # niveles 1+2 (por defecto)
node scripts/reddit-radar.mjs --nivel 1   # solo los más tranquilos
node scripts/reddit-radar.mjs --nivel 3   # los grandes, cuando toque
```

Ojo al tiempo: 9 subreddits × ~25 s de espaciado ≈ **4 minutos** la primera vez del día. Después
tira de caché y es instantáneo.

Esto es exactamente lo que `GROWTH.md` §3 anticipaba al pedir 3-4 semanas de envejecimiento antes
de nada. La rutina sigue sirviendo — pero apuntando a subreddits pequeños hasta que la cuenta pase
los filtros de los grandes.

## La única forma de ganar karma que no acaba en baneo

No hay atajo. Reposteo, granjeo de comentarios y votos coordinados se detectan y cuestan la cuenta —
y la cuenta es justo lo que hace falta para el post de lanzamiento en r/selfhosted del mes 2
(`GROWTH.md` §4). Perderla por 200 puntos de karma sería el peor cambio posible.

Lo que sí funciona, y es lo que optimiza el radar:

1. **Llegar pronto.** Es el factor que más pesa, por encima de la calidad. Un comentario excelente en
   un hilo de 6 horas con 200 respuestas no lo lee nadie; uno correcto a los 30 minutos se queda
   arriba y recoge los votos de todo el que entre después. Por eso el radar prioriza frescura y la
   ventana por defecto son **8 horas**.
2. **Responder solo lo que sabes por haberlo construido.** Docker, proxy inverso, Postgres, ZFS,
   backups, Ollama, MCP, WSL. Un comentario específico en tu terreno vale más que diez genéricos, y
   además no te expone a que te corrijan.
3. **Nada de promo durante 3-4 semanas.** Ni Micelclaw, ni el blog, ni enlaces propios. Es la fase de
   envejecer la cuenta (`GROWTH.md` §3). Un enlace propio en la semana 1 marca la cuenta como
   promocional y ya no se quita.
4. **Aportar algo que no esté dicho.** Si el hilo ya está resuelto, el mejor movimiento es no
   comentar. Los agentes lo comprueban y pueden devolver "no merece".

## Los pasos

```bash
cd /home/victor/Projects/web/micelclaw.com/content-ops
node scripts/reddit-radar.mjs              # ventana de 8h; --horas N para ampliar
```

Deja `replies/<fecha>-reddit-candidatos.json` con los 12 mejores. Después:

- Lanzar **agentes Sonnet, esfuerzo medio, en paralelo** sobre los **3 primeros** candidatos. Cada
  agente lee el hilo REAL por RSS (`<url-del-hilo>.rss`), mira qué se ha respondido ya, y devuelve:
  veredicto · qué ya se ha dicho · borrador · riesgo.
- Volcar los tres a `replies/<fecha>-reddit.md`.

### ⚠️ LAS CAPTURAS SE MIRAN, SIEMPRE

**El fallo del 2026-08-05, cazado por el usuario.** Se redactó un comentario para un hilo de MCP
cuya tesis principal —"OpenWebUI no soporta MCP nativo, te hace falta un puente"— era **falsa**, y
las capturas del propio post lo desmentían: una enseñaba la conexión con tipo *MCP Streamable HTTP*,
o sea soporte nativo. Se había leído solo el texto.

En estos subreddits la mitad de la información va en imágenes: pantallas de configuración, logs,
mensajes de error, diagramas. Un comentario redactado sin verlas **puede ser directamente incorrecto**
y quedar en evidencia delante de la comunidad donde se está construyendo reputación.

Por eso el radar extrae `imagenes[]` de cada candidato. Regla dura:

1. **Si un candidato trae `imagenes`, se descargan y se MIRAN** antes de redactar nada.
   ```bash
   curl -s -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" \
        -H "Accept: image/*" -o img1.png "<url de preview.redd.it>"
   ```
   Se leen con la herramienta de lectura de imágenes, una a una. 3 s entre descargas.
2. **Un agente de texto no puede hacer esto solo**: quien lanza los agentes mira las imágenes y les
   pasa lo que se ve, o directamente redacta ese hilo él. No se delega a ciegas.
3. **Si no se han podido ver, se dice en el riesgo** y el borrador no afirma nada que dependa de
   ellas. Mejor un comentario que pide datos que uno que se inventa el diagnóstico.
4. **Limitación conocida**: si el post usa una **galería** de Reddit, el RSS no trae las URL de
   `preview.redd.it` y `imagenes[]` sale vacío aunque el cuerpo diga "las dos primeras imágenes".
   Visto el 2026-08-05 en un post de r/truenas. Si el texto menciona imágenes y `imagenes[]` está
   vacío, hay que abrir el hilo a mano antes de redactar.

### Formato de salida (pedido por el usuario el 2026-08-05, corregido el mismo día)

Tiene que poder abrir, copiar y pegar sin leerse un informe. Por cada hilo, **en este orden**:

    ## N · r/<sub> — <tema en 4 palabras>

    ### 🔗 [ABRIR EL HILO Y COMENTAR](<url del hilo>)

    Comentario:

    <el texto, en párrafos normales>

    ▸ **Por qué:** <2-3 líneas: el hueco que nadie ha cubierto>
    ▸ **Riesgo:** <qué no podrías defender si te repreguntan; "bajo" si no hay>

Reglas del formato, y las dos primeras vienen de correcciones suyas:

1. **EL COMENTARIO VA EN TEXTO PLANO.** Nada de bloques de código ni de `>` de cita: al copiarlos se
   pega el marcado y hay que limpiarlo a mano. Párrafos normales y ya.
2. **EL COMENTARIO VA EN EL IDIOMA DEL HILO.** No en el del documento. Casi todos son en inglés,
   pero r/homelab trae hilos en alemán con regularidad y r/selfhosted en varios idiomas. Mirar el
   cuerpo del post, no el subreddit. Si el hilo está en alemán, el comentario va en alemán.
3. **Distinguir mis notas del comentario.** Todo lo que no sea el comentario empieza por `▸`, y se
   dice al principio del documento. El usuario confundió las notas en español con el comentario.
4. **El enlace va arriba y en grande**, antes que nada: es lo primero que necesita.
5. **`Comentario:` seguido del texto** y nada más en medio. Sin preámbulo.
6. El contexto va **debajo**, no encima: se lee solo si duda.
7. **Si un borrador se apoya en algo sin verificar, suavízalo TÚ antes de escribirlo** y dilo en el
   riesgo, con la versión firme por si él prefiere comprobarlo y usarla. No dejarle la decisión
   metida dentro del texto que va a pegar.

Al lanzar los agentes hay que **decirles en qué idioma escribir**, deducido del cuerpo del post — si
no, redactan en inglés por defecto.

**El apartado de riesgo no es decorativo.** Los modelos redactan con seguridad cosas que no han
verificado; si el usuario publica una afirmación que no puede defender y le repreguntan, el daño a
la reputación es mayor que el karma ganado. Cuando un borrador dependa de un dato sin verificar, hay
que decirlo y ofrecer una redacción más prudente.

## Trampas medidas (2026-08-05)

- **La API de Reddit está cerrada** para nosotros; se lee por RSS público. Ver `platforms/reddit.md`.
- **El RSS rechaza el user-agent con forma de bot de API** (`node:app:v (by /u/…)`) con 403. Hay que
  identificarse como lector de feeds. Además hace falta cabecera **`Accept` explícita**: sin ella
  node recibe 429/403 donde `curl` pasa.
- **Límite de ritmo agresivo**: ~1 petición cada 25-30 s, y aun así salta a 429. Por eso el radar
  espacia, reintenta con espera creciente y **cachea 6 h en disco**. Relanzarlo el mismo día no pide
  nada a la red.
- Los agentes deben hacer **como mucho 2-3 peticiones** cada uno, con 25 s entre ellas.

## Qué NO hace esta rutina

- **No publica.** Ni comentarios ni posts, en ninguna comunidad ajena. Eso lo hace el humano.
- **No vota, no sigue, no manda mensajes.** `GROWTH.md` §7.3.
- **No toca r/Micelclaw**: ése es canal propio y va por `post-reddit.mjs`, cuando haya credenciales.
