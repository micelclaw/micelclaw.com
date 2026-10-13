// gif-types.ts — contrato de props.json de los GIF sociales (lo emite scripts/compose-gif.mjs).
// Formato: 864x1080 (4:5, <1 MP para que Mastodon lo acepte), 12 fps, 6-8 s, mudo con rótulos
// quemados y pausa final en el fotograma-conclusión. Ver plan y `platforms/*.md`.

export type GifFocus = {
  zoom: number; // 1 = encaja; >1 acerca
  cx: number; // centro x 0..1 del encuadre
  cy: number; // centro y 0..1
};

export type GifBeat = {
  label: string; // rótulo quemado (el "subtítulo grande"); '' para no mostrar ninguno
  durSec: number;
  shot?: string; // ruta bajo video/public/ (staticFile) — solo kind 'shots'
  // 'cover' llena el marco (recorta lo que sobra) · 'contain' encaja entera, sin recortar:
  // obligatorio en capturas panorámicas como el árbol de agentes, que con cover perdería la mitad.
  fit?: 'cover' | 'contain';
  focus?: GifFocus; // encuadre del ken burns sobre esa captura
  tone?: 'neutral' | 'amber' | 'cyan' | 'bad' | 'good'; // color del acento del rótulo
};

export type GifProps = {
  fps: number;
  width: number;
  height: number;
  durationSec: number; // total, pausa final incluida
  kind: 'shots' | 'concept';
  concept?: 'token' | 'delegation' | 'team'; // qué animación vectorial (kind 'concept')
  kicker?: string; // etiqueta pequeña ámbar arriba
  beats: GifBeat[];
  signature?: string; // se revela en el último beat: "micelclaw.com/blog/agent-identity"
};

export const DEFAULT_GIF_PROPS: GifProps = {
  fps: 12,
  width: 864,
  height: 1080,
  durationSec: 7,
  kind: 'concept',
  concept: 'token',
  kicker: 'AGENT IDENTITY',
  beats: [
    { label: 'The model retypes its own token.', durSec: 2.5 },
    { label: 'One wrong turn and it invents one.', durSec: 2, tone: 'bad' },
    { label: 'Now the host fills it in.', durSec: 1.5, tone: 'amber' },
    { label: 'The model never types the secret.', durSec: 1, tone: 'good' },
  ],
  signature: 'micelclaw.com',
};

// Beat activo en el segundo `t`, con su tiempo local y su inicio absoluto.
export const beatAt = (beats: GifBeat[], t: number) => {
  let acc = 0;
  for (let i = 0; i < beats.length; i++) {
    if (t < acc + beats[i].durSec) return { index: i, local: t - acc, start: acc };
    acc += beats[i].durSec;
  }
  const last = Math.max(0, beats.length - 1);
  const start = acc - (beats[last]?.durSec ?? 0);
  return { index: last, local: t - start, start };
};

// Inicio absoluto de cada beat (los concept scenes se cronometran contra esto).
export const beatStarts = (beats: GifBeat[]) => {
  const out: number[] = [];
  let acc = 0;
  for (const b of beats) {
    out.push(acc);
    acc += b.durSec;
  }
  return out;
};
