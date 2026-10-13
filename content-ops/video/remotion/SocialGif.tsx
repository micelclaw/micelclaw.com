import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrandFonts } from './components/Fonts';
import { GifShell } from './components/GifShell';
import { ShotSequence } from './components/ShotSequence';
import { ConceptScene } from './components/ConceptScene';
import { beatAt, beatStarts, type GifProps } from './gif-types';

// GIF social corto y MUDO (los rótulos hacen de subtítulos). Dos técnicas:
//   kind 'shots'   → varias capturas reales del dash encadenadas (ShotSequence)
//   kind 'concept' → animación vectorial que explica un concepto (ConceptScene)
// Se renderiza con scripts/compose-gif.mjs (codec gif nativo de Remotion + pasada de paleta).
export const SocialGif: React.FC<GifProps> = (props) => {
  useBrandFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const starts = beatStarts(props.beats);
  const { index, local } = beatAt(props.beats, t);
  const beat = props.beats[index] ?? { label: '', durSec: 1 };

  return (
    <GifShell
      kicker={props.kicker}
      beat={beat}
      beatIndex={index}
      beatLocal={local}
      isLast={index === props.beats.length - 1}
      signature={props.signature}
    >
      {props.kind === 'shots' ? (
        <ShotSequence beats={props.beats} starts={starts} t={t} />
      ) : (
        <ConceptScene concept={props.concept ?? 'token'} t={t} starts={starts} />
      )}
    </GifShell>
  );
};
