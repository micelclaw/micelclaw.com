# THUMBNAILS.md — miniaturas de YouTube del canal

Compañero del `PLAYBOOK.md`. **El estándar está cerrado** (usuario, 2026-07-25): todas las
miniaturas del canal se componen con `scripts/60-thumbs.mjs --layout duo`. Lo de abajo es la
receta ejecutable; las reglas investigadas que la sustentan van al final.

---

## ⭐ ESTÁNDAR DEL CANAL — layout `duo`

Escritorio en perspectiva + el móvil del corte vertical montado por delante, placa ámbar con el
**nombre del módulo a secas**, gancho en la placa blanca y la mosca abajo-derecha translúcida.
Es lo que hace reconocible la serie en la parrilla y, de paso, cuenta que es el mismo producto en
las dos pantallas.

```bash
node scripts/60-thumbs.mjs --layout duo --duo-phone 630 --duo-overlap 270 \
  --shot   <frame-horizontal>.png --crop  0,0,1920,900 \
  --shot2  <frame-vertical>.png   --crop2 0,0,1080,1580 \
  --plate "<MODULO>" --sub "<GANCHO>" --qa \
  --out projects/<slug>/thumbs/duo-<slug>.png
```

### Los cuatro invariantes

1. **Placa ámbar = el módulo A SECAS**, en mayúsculas: `NOTES`, `CALENDAR`, `PROJECTS`, `CONTACTS`,
   `MAIL`, `INVENTORY`, `DIARY`, `OFFICE`. Ni verbos, ni el nombre del producto, ni el número de
   episodio. Es la constante de la colección.
2. **Placa blanca = el gancho**, la única parte redactada. Hasta ~34 caracteres (el generador
   escala la tipografía sola). Aquí va lo que el título del vídeo no dice.
3. **Las dos pantallas muestran EL MISMO REGISTRO**: la misma nota, el mismo evento, el mismo
   contacto. Si cada una enseña una cosa distinta se lee como dos productos, no como uno en dos
   dispositivos. Elegir los frames en consecuencia.
4. **Encuadre 630 / 270** (`--duo-phone` / `--duo-overlap`): pantallas grandes y solapadas.

### Parámetros

- `--duo-phone` — altura del móvil en px (540 discreto · 600 medio · **630 estándar**). El móvil va
  anclado a la derecha; de ahí salen su ancho (9:16) y su posición vertical.
- `--duo-overlap` — px que el móvil monta sobre el escritorio. El escritorio se estira hasta ese
  punto, así que **subir el solape agranda las dos pantallas a la vez**.
- `--tone graph` (default) sube brillo y saturación: correcto para la UI oscura del dash.
  `photo` la oscurece y sobre un módulo ya oscuro da un fondo casi negro.
- `--blur` 0.5 por defecto: aquí la captura es contenido, no textura.
- `--scale` reescala el letrero si un episodio lo pide (default 1 → placa 92px, sub 30px).

### Elegir los frames

- **Escritorio**: un momento con el registro ABIERTO y contenido en pantalla (no un panel vacío).
  En el Ep. 1 es `t≈78 s`, justo después del clic en la chip.
- **Móvil**: el mismo registro en el corte vertical. En el Ep. 1, `t≈17 s`.
- **Recortar SIEMPRE los subtítulos quemados**, o salen frases del vídeo en la miniatura:
  horizontal `--crop 0,0,1920,900` · vertical `--crop2 0,0,1080,1580`.
- Extraer candidatos: `ffmpeg -ss <t> -i exports/<slug>.mp4 -frames:v 1 -q:v 1 f<t>.png`.

### Mosca

Abajo-derecha, 80px, opacidad .62, `z-index:20`. La **sombra negra dura** es lo que la despega de
la pantalla del móvil: sin ella se lee como un icono más de la interfaz. Va a 52px del borde
inferior a propósito — la esquina es donde YouTube incrusta el badge de duración.

### Portada vertical 9:16 (TikTok / Reels) — se genera SOLA

Cada invocación emite **también** `<out>-cover.png` a **1080x1920** con los mismos elementos
recompuestos (no es un recorte del 16:9: eso se comería el letrero o una de las pantallas).
`--no-cover` lo desactiva si alguna vez no hace falta.

Zonas seguras que respeta la composición:
- La UI de TikTok/Reels tapa **~300px abajo** (caption, botones, música) y algo arriba → el
  letrero vive sobre `bottom:440` y la mosca sube a `bottom:290`.
- En la **cuadrícula del perfil** la portada se recorta (1:1 en TikTok, 3:4 en Instagram) tomando
  el centro → la placa del módulo tiene que caer en la franja central. Verificado con los tres
  encuadres antes de dar por buena la del Ep. 1.
- El letrero va 1.5x respecto al horizontal: en la cuadrícula se ve a un tamaño mucho menor.

### Test & Compare (opcional)

Si se usa, las 3 variantes mantienen encuadre y placa, y **cambian solo el gancho blanco** (y si
acaso los frames). YouTube decide por **cuota de tiempo de visualización**, no por clics.

---

## Reglas duras (investigadas 2026-07; siguen vigentes)

1. **Fichero**: 1280×720, 16:9, PNG/JPG ≤2MB. Componer a 1280×720 CSS con `deviceScaleFactor:2` y
   reescalar con lanczos — lo hace el generador.
2. **Ámbar BRILLANTE `#f2b621`** para las placas: el `#d4a017` de marca se vuelve marrón al
   recomprimir a tamaño feed. Cian `#00c8ff` secundario ≤10% del área (la mosca).
3. **Anti-fusión**: nuestro canvas `#08080e` ≈ dark mode de YouTube `#0f0f0f`. Nunca borde plano
   casi-negro: rim light + sombras marcadas en cada pantalla. QA sobre `#0f0f0f` **y** sobre blanco.
4. **Zonas seguras**: nada crítico en la esquina inferior-derecha (~120×60px, badge de duración) ni
   en la franja inferior 15% (barra de progreso); esquinas superiores limpias (iconos hover).
5. **La puerta de los 120px**: `--qa` emite `<out>-qa120.png` con el contacto a 120px sobre fondo
   oscuro y blanco. **Mirarlo antes de entregar.** Si la placa no se capta en ~0.4s, rehacer.
6. **Promesa honesta**: lo que afirma la miniatura debe cobrarse en los primeros ~20s del vídeo.
   La audiencia self-host castiga el hype y el watch-share castiga el rebote.
7. **Hover-preview**: tras ~1s el hover la sustituye por los primeros frames → el cold open debe
   continuar visualmente la promesa de la miniatura.

### Reglas que el estándar sustituye a propósito

Se conservan escritas porque explican por qué el estándar es como es:

- *"Máx 4 palabras, glifo ≥110px, prohibido repetir el título"* → la placa repite el módulo del
  título **deliberadamente** (es la constante de la serie) y va a 92px, no 110+: se bajó porque
  letreros enormes sobre capturas con zoom 3x hacían ilegible el producto.
- *"Un solo elemento focal"* → el dúo tiene dos pantallas. El foco lo da la placa; el móvil delante
  crea la jerarquía.
- *"Screenshots = dirección de arte, zoom 2-3x, el texto de la UI nunca debe leerse, prohibido el
  dashboard entero"* → invertido por decisión del usuario: **la captura es el contenido**. Se usa
  pantalla casi completa y blur mínimo, porque el valor de este producto se ve en su interfaz.

## Otros layouts (reserva, no estándar)

| Layout | Composición | Cuándo |
|---|---|---|
| `hero` | una captura casi entera, ligeramente inclinada | si un episodio no tuviera corte vertical |
| `phone` | móvil de protagonista, escritorio detrás desenfocado | lo más legible a 120px (un solo objeto focal) |
| `split` | pantalla en perspectiva + banda de texto | ganchos largos que piden aire |
| `trio` | tres pantallas escalonadas | mostrar un recorrido (lista → chat → resultado) |
| `sticker` | composición original: zoom fuerte + letrero grande | histórico; el tráiler usa este estilo |

Referencia viva: `projects/2026-07-ep1-notes/thumbs/duo-4-maximo.png` (Ep. 1) y las 3 del tráiler
en `projects/2026-07-trailer-user/thumbs/` (estilo `sticker`, anterior al estándar).
