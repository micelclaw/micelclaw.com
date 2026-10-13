# PLAYBOOK — Pipeline de vídeo de content-ops

Genera vídeos de producto (tráilers, shorts) a partir de un `storyboard.json`:
capturas reales del dash (Playwright/Chromium, sesión Paco) + title cards
animadas (Remotion) + narración TTS (Kokoro, CPU) + subtítulos karaoke
alineados (faster-whisper) + música con ducking + SFX (ffmpeg).

## Flujo (audio-first: la voz fija las ventanas ANTES de capturar)

```bash
cd web/micelclaw.com/content-ops/video

# 0. (una vez) setup — ver §Setup
# 1. duraciones del guion (iterar hasta que la duración total cuadre)
.venv/bin/python scripts/10-tts.py --project <slug> --dry-durations
# 2. TTS definitivo → narration.wav + vo-timeline.json (SSOT de ventanas)
.venv/bin/python scripts/10-tts.py --project <slug>
# 3. metraje (por escena o todas) → footage/<id>.mp4 4K CFR + actions.json
node scripts/20-capture.mjs --project <slug> [--scene s03]
# 4. subtítulos karaoke → subs/words.json + captions.srt
.venv/bin/python scripts/30-align.py --project <slug>
# 5. audio maestro (música+ducking+SFX, -14 LUFS) → audio/master.wav
node scripts/40-audio-mix.mjs --project <slug>
# 6. render + mux → exports/<slug>.mp4
node scripts/50-render.mjs --project <slug>
```

Staging pesado: `/home/victor/Projects/_artifacts/video/<slug>/` (gitignored; `footage/raw/*.webm` borrable tras transcode).
Proyecto (texto/JSON): `projects/<slug>/{script.md,storyboard.json,subs/,copys/}`.

## Contrato del storyboard.json

- `scenes[]` en orden; cada escena: `id`, `kind` (`footage|title|series|outro`),
  `voiceover` (inglés, frases cortas), `leadSec` (silencio antes de la voz),
  `padSec` (después), `minSec` (suelo de la ventana visual — el pad se ESTIRA
  para llenarlo, así narración y vídeo duran lo mismo SIEMPRE),
  `highlight` (palabras en ámbar en el karaoke, scoping POR escena),
  `lowerThird`, `camera` (keyframes `{at 0..1, zoom, cx, cy}` sobre metraje 4K
  → zoom hasta 2x sin perder nitidez; el compositor limita el paneo en cada
  frame para que el metraje cubra siempre el lienzo), `capture.actions` (vocabulario:
  goto/waitFor/moveTo/hover/click/type/press/scroll/scrollIntoView/pause/eval;
  `sfx` en una acción ancla un efecto en su timestamp real), `sfx` a nivel de
  escena (`{name, atSec}` relativo al inicio de la ventana).
- **Vertical 9:16 = captura MÓVIL NATIVA**, nunca recorte del 16:9 (el usuario
  lo rechazó: "se ve muy cortada"). `size: [1080, 1920]` en el storyboard
  activa el modo móvil de 20-capture automáticamente (ver GOTCHAS).
- `pronounce`: {"Micelclaw": "My-cell-claw"} — SOLO afecta al TTS; los
  subtítulos conservan la grafía real. (Verificado con espeak: `My-cell-claw`
  → maɪsˈɛlklɔː, la pronunciación correcta.)
- `music`: fichero de `assets/music/` (CC-BY Kevin MacLeod → ¡ATRIBUCIÓN en la
  descripción! ver assets/LICENSES.md). `musicDb`/`sfxDb` niveles base.

## Setup (una vez por máquina)

1. `sudo apt install espeak-ng python3-venv` (fonemizador de Kokoro).
2. `python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile faster-whisper`.
3. Modelos Kokoro → `assets/models/`: `kokoro-v1.0.onnx` + `voices-v1.0.bin`
   (releases de thewh1teagle/kokoro-onnx). Voz usada: `am_michael`.
4. `pnpm install` (Remotion 4.0.399; usa el chrome-headless-shell de Playwright
   ya instalado — ver remotion.config.ts — sin descargar otro Chrome).
5. Fuentes en `public/fonts/` (InterVariable, JetBrainsMono) — NO están en el
   sistema; Remotion las carga vía FontFace + delayRender.
6. Sesión Paco: regenerar el storageState si caduca (JWT 24h):
   el formato lo replica cualquier login → ver cómo se generó en
   `tests/dash/mcp/auth/save-paco-storage.ts`; la ruta se configura en
   `content-ops/.env.local` → `DASH_STORAGE_STATE`.

## GOTCHAS (sangre real de esta máquina)

- **WSL2 mirrored rompe el get-port de Remotion**: conectar a un puerto LIBRE
  en 127.0.0.1/0.0.0.0 se CUELGA (timeout) en vez de dar ECONNREFUSED → Remotion
  cree que TODOS los puertos están ocupados → "No available ports found" tras
  5 min. **Fix aplicado**: `patches/@remotion__renderer@4.0.399.patch` (pnpm
  patchedDependencies): timeout de sonda 500ms + timeout⇒puerto libre. Si se
  sube de versión Remotion, re-generar el patch.
- **El screencast de Chromium graba en píxeles CSS**, no de dispositivo: un
  viewport 1920x1080 con deviceScaleFactor 2 acaba en el CUARTO superior-izq
  del lienzo 4K (recordVideo solo REDUCE, nunca amplía). **Fix**: viewport
  3840x2160 + dsf 1 + `document.body.style.zoom = 2` (la UI se ve como una
  pantalla 1080p pero rasteriza a 4K real). El cursor inyectado vive en <html>
  (FUERA del zoom) → sus tamaños van al doble y sus coords son clientX directas.
- **Captura móvil (9:16 nativo)**: el shell móvil del dash se activa por media
  query real (`max-width: 767px` en use-media-query.ts) — el truco del zoom NO
  sirve, y el screencast CDP solo entrega píxeles LÓGICOS (393x698). **Fix**:
  Xvfb `:97` (1080x1920) + Chromium HEADED `launchPersistentContext` con
  `--app=<url>` (sin chrome de navegador; --kiosk se ignora sin WM) +
  `--force-device-scale-factor=2.748` + `--window-size=393,698` → framebuffer
  físico 1080x1920 grabado con `ffmpeg -f x11grab`. `--app` no soporta
  storageState → el claw-auth se inyecta por `addInitScript` (localStorage).
  Cursor = disco táctil translúcido (56px), no flecha. Las coords de acciones
  van en espacio CSS móvil (393x698).
- **En móvil, el click del DSL usa boundingBox SIN actionability**: si el
  elemento está fuera del viewport, el clic cae donde esté el cursor. Antes de
  clicar una chip: op `scrollIntoView`. Y el drawer de conversaciones NO se
  cierra al elegir una conv — hay que tapear el backdrop (x≈340) después.
- **REGLA DEL USUARIO: los Insights del chat salen SIEMPRE colapsados en
  cámara** (salvo orden contraria). 20-capture inyecta
  `claw-insights-collapsed=true` en localStorage ANTES de cargar (ChatPage lee
  la clave en el primer render) — sin clics en cámara. Override puntual:
  `"ui": {"insightsCollapsed": false}` en el storyboard.
- **REGLA DEL USUARIO: zoom sí, lienzo descubierto nunca** (2026-08-20).
  La cámara puede acercarse y seguir el elemento señalado, pero ninguna
  traslación puede mostrar el fondo del compositor, franjas negras ni zonas
  fuera de la captura. `FootageScene` acota zoom y centro en cada frame; el QA
  debe revisar también los puntos intermedios de cada movimiento de cámara.
- **Drag de dnd-kit bajo captura**: `body.style.zoom > 1` puede desalinear el
  `DragOverlay` respecto al puntero y hacer que la tarjeta parezca saltar. Para
  un drag que vaya a cámara, usar por escena `desktopSize:[2560,1440]` y
  `uiZoom:1`, activar el sensor con 10-12 px y usar `drag.toSelector` para una
  trayectoria continua hasta un destino real.
- **El comando `file` no existe** en el sandbox de esta caja — validar imágenes
  por magic bytes (python), no con `file`.
- **FreePD cerró** (2026) y **Pixabay bloquea scraping** (403): música =
  incompetech (CC-BY, atribución) o pista CC0 aportada a mano.
- **Los SFX son sintetizados** con ffmpeg lavfi (assets/sfx/, CC0 propios):
  click/pop/whoosh/chime/thud/key1-3. Regenerables (ver historial del repo).
- **Kokoro es rápido en CPU** (~2s/frase) — NO usa GPU, no compite con ollama.
- **faster-whisper small.en en CPU int8** para el alineado: el TEXTO canónico
  es el del guion; whisper solo pone tiempos (align greedy + interpolación).
- **Remotion CLI necesita red local** → correr `50-render.mjs` FUERA del
  sandbox del agente si el sandbox bloquea bind de puertos.
- **El lower-third va a x=320** para no pisar el sidebar del dash (~230px @1080p).
- **Regla de acento MIXTO**: cian (#00c8ff) en TitleCard/Outro/logo; ámbar
  (#d4a017) en lower-thirds/karaoke-keywords/halo del cursor (remotion/brand.ts).

## Checklist de calidad (antes de dar por bueno un export)

- [ ] `ffprobe`: h264+aac, faststart, duración esperada — **1920x1080 en horizontal,
      1080x1920 en vertical** (un vertical NUNCA es un recorte del 16:9).
- [ ] Frames de QA en 3+ puntos (título, metraje con subs, cierre) — mirarlos.
- [ ] En toda escena con cámara, revisar inicio, mitad y final: el metraje cubre
      el 100% del lienzo y nunca aparecen franjas o áreas negras.
- [ ] LUFS -14±1 (lo imprime 40-audio-mix; también en audio/mix-report.json).
- [ ] Sin pantallas vacías ni "UNPROCESSED" en el metraje (staging listo).
- [ ] Cursor visible y natural; halo en cada click que suena.
- [ ] Karaoke sincronizado (desfase percibido <±80ms) y keywords correctas.
- [ ] Música con arco (fade-in/ducking/fade-out); SFX discretos.
- [ ] Atribución de la música copiada a los copys si es CC-BY.
- [ ] **Si va a TikTok / Reels / Shorts, pasar la puerta de calidad** — es la que decide, no el ojo:
      `node -e "import('./content-ops/scripts/lib/video-gate.mjs').then(m=>console.log(m.gateClip({pathOrUrl:'<mp4>',surface:'tiktok'}).summary))"`
      Mide 9:16, duración, sonoridad, PICO y silencio. El 2026-07-27 se publicó un clip a −70 LUFS
      con pico −∞ dBFS que a la vista parecía normal: **el pico es la señal inequívoca**, no el ojo.
- [ ] En un CORTO: gancho de 4-8 palabras visible en el **frame 1** (mirar el fotograma, no fiarse)
      y silencio por debajo del 40% (sin música los huecos se oyen; el gate avisa).

## GOTCHAS del Ep. 2 (Calendar, 2026-08-04)

- **`:text-is` FALLA sobre elementos compuestos** (Radix SelectItem, chips): usa
  `:has-text(...)` o `a[title="..."]`. Las chips de entidad son `a[title="<título>"]`.
- **Radix Select bajo captura**: el click retenido (70ms) del DSL abre-y-cierra el listbox
  (press-drag-release sobre el content que se monta ENCIMA del trigger) → op `click` con
  `"fast": true` para triggers. Y el centro de un option ancho puede caer FUERA del viewport →
  `dx` negativo.
- **NUNCA `el.remove()` en un eval sobre DOM de React** (rompe la reconciliación y el render
  posterior — el Select nunca montaba): usar `el.style.display='none'`.
- **El grid del calendario era zoom-naive** (dividía px de viewport por la constante CSS
  TOTAL_HEIGHT): arreglado en dash (slot-click, dragover, drop, resize usan rect.height/pxPerMin).
  El modal de crear evento tampoco ofrecía los calendarios reales (solo defaults): arreglado
  (EventFormFields recibe calendarNames).
- **Escenas de chat con modelo local (gemma-12b)**: respuestas nondeterministas — hilo largo ⇒
  turnos vacíos (el filtro reasoning-tags se come salidas solo-<think>); idioma español pese a
  USER/SOUL/IDENTITY (identidad en español pesa más) ⇒ añadir "In English, please." al prompt EN
  CÁMARA es lo único fiable; escribe horas como UTC (sufijo Z) ⇒ NO nombrar horas en narración ni
  ver el prompt+modal en el mismo plano.
- **Patrón toma única**: los beats consecutivos de chat (crear→modificar→chip) se ruedan en UNA
  captura larga (holdSec 250) y se rebanan copiando el mp4 a chatN.mp4 con srcOffsets — menos
  transiciones = menos modos de fallo.
- **Related Entities vacías en eventos recién creados** (índices sin procesar): sembrar relaciones
  reales vía `POST /api/v1/links` ({source_type, source_id, target_type, target_id,
  link_type:'manual', created_by:'user'}).
- **La sidebar de conversaciones NO filtra por agente** y solo carga los ~20 últimos mensajes:
  conversaciones de test contaminan la lista → colapsarla en cámara (botón title="Collapse
  sidebar", el de conversaciones — hay OTRO con "(⌘B)" que colapsa la nav).

## GOTCHAS del Ep. 4 (Contacts, 2026-08-10)

- **`render/video-only.mp4` LLEVA una pista aac MUDA**: un mux manual (p.ej. el máster
  nomusic) sin `-map 0:v:0 -map 1:a:0` elige esa pista y el export sale mudo. La puerta
  de calidad lo caza (−70 LUFS); no confiar en el oído.
- **El módulo Mail de Paco muestra las cuentas REALES del usuario** (victor@/gmail con
  etiquetas y contadores personales): NUNCA abrir Mail/composer en cámara sin staging
  propio. El Ep. 5 (Mail) necesita resolverlo ANTES del guion.
- **Francis corre ahora gpt-5.6-luna** (ya no gemma local): responde en ~10-20s, inglés
  fiable, chips correctas. Esperas del chatmega: 40-45s bastan; "In English, please."
  se mantiene por higiene.
- Los contactos del seed llevan avatares cartoon (webp en `core/src/scripts/seed-assets/
  avatars/`, sembrados por seed-demo.ts); la búsqueda de contactos cubre las NOTAS
  (ILIKE) — el beat "search what you remember" es real.
- **REGLA DEL USUARIO (2026-08-10): la cámara NUNCA saca el encuadre del metraje** (nada
  de franjas negras). Con zoom Z el centro debe quedar en [0.5/Z, 1−0.5/Z] en ambos ejes.
  FootageScene.tsx ya lo CLAMPEA por frame (fix de raíz), pero los keyframes del
  storyboard deben escribirse legales igualmente — el clamp es la red, no el diseño.

## GOTCHAS del Ep. 5 (Mail, 2026-08-10)

- **Los clics de 20-capture NO pre-scrollean**: `centerOf` clica con coordenadas crudas; en
  desktop-HQ (viewport 4K + body.zoom=2) un target bajo el pliegue tiene bbox fuera del
  viewport (y=5000+) y el clic muere SIN error. Precede todo clic bajo el pliegue con un
  `eval` de `scrollIntoView({block:'center',behavior:'smooth'})` + pause.
- **El op `scroll` rueda bajo el CURSOR** (mouse.wheel): si el cursor está sobre una zona no
  scrolleable (sidebar), no pasa nada. Mover el ratón sobre la lista antes, o eval.
- **Insights del chat**: colapso determinista = `localStorage.setItem('claw-insights-collapsed','true')`
  + goto de recarga. El clic al botón Collapse falla en frío (el panel monta tarde).
- **Francis (gpt-5.6-luna) puede correr un `bash` fallido que vuelca su SOUL.md EN PANTALLA**
  (2 de 3 tomas). Los tool-cards fallidos quedan EXPANDIDOS incluso al reabrir la conversación.
  Defensa para tomas re-abiertas: eval que sube desde el leaf 'bash' hasta el último ancestro
  que no contenga el tool bueno y lo oculta (display:none). En vivo no hay defensa: QA SIEMPRE
  los frames del segundo turno; si sale, re-rebanar o re-tomar.
- **Patrón "toma de reapertura" para chat3**: en vez de rebanar el final del chatmega, reabrir
  la conversación en una captura propia (tools colapsados, se puede sanear por eval antes de
  rodar) y hacer ahí el clic de la chip. Más limpio y re-rodable sin re-tirar al agente.
- **'Relacionado' (panel Related Entities) y 'Conectar' están en ES** → evals de traducción/
  ocultado; con MutationObserver si hay navegación SPA posterior.
- **Las rebanadas del chatmega hay que COPIARLAS** (`cp chat1.mp4 chat2.mp4`): si falta el mp4
  de una escena-rebanada, el render sale NEGRO sin error. Comprobar frames del export SIEMPRE.
- La pila de no-leídos del cold se preserva solo con HOVERS (un clic los marca leídos).
