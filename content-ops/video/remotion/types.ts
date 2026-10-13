// types.ts — contrato de props.json (lo emite scripts/50-render.mjs).
export type CameraKeyframe = {
  at: number; // fracción 0..1 de la escena
  zoom: number;
  cx: number; // centro x 0..1
  cy: number; // centro y 0..1
};

export type Scene = {
  id: string;
  kind: 'footage' | 'title' | 'outro' | 'series';
  // series card
  episode?: number;
  moduleName?: string;
  // outro tease
  next?: string; // "Ep. 2 — Calendar"
  startSec: number;
  durSec: number;
  // footage
  src?: string; // ruta bajo public/ (staticFile) o URL file://
  srcOffsetSec?: number;
  camera?: CameraKeyframe[];
  lowerThird?: string;
  freezeAtEnd?: boolean;
  fadeIn?: boolean;
  // title / outro
  title?: string[]; // ["Micel", "claw"]
  sub?: string;
  tagline?: string;
  url?: string;
  cta?: string;
};

export type Word = {
  word: string;
  start: number; // seg absolutos en la timeline
  end: number;
  key?: boolean; // resaltada en ámbar
};

export type VideoProps = {
  fps: number;
  width: number;
  height: number;
  durationSec: number;
  scenes: Scene[];
  words: Word[];
  showCaptions: boolean;
  /**
   * Gancho de 4-8 palabras visible DESDE EL FRAME 1. El karaoke no puede darlo: se ancla a la
   * primera palabra hablada, que con el lead-in cae a los ~0,3-0,5 s. Opcional: sin `hook` la
   * composición sale exactamente igual que antes.
   */
  captionBottom?: number;
  hook?: string;
  hookHoldSec?: number;
};

export const DEFAULT_PROPS: VideoProps = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationSec: 8,
  scenes: [
    {
      id: 'demo-title',
      kind: 'title',
      startSec: 0,
      durSec: 4,
      title: ['Micel', 'claw'],
      sub: 'Your self-hosted AI productivity OS.',
    },
    {
      id: 'demo-outro',
      kind: 'outro',
      startSec: 4,
      durSec: 4,
      title: ['Micel', 'claw'],
      tagline: 'All your data. One brain. Your hardware.',
      url: 'micelclaw.com',
      cta: 'Try it.',
    },
  ],
  words: [],
  showCaptions: false,
};
