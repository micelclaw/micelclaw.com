import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';

/**
 * Gancho de los primeros segundos: 4-8 palabras GRANDES sobre la UI real, desde el frame 1.
 *
 * Por qué existe aparte del karaoke: el karaoke se ancla a la PRIMERA PALABRA HABLADA, que con el
 * lead-in de la narración cae en torno a los 0,3-0,5 s — así que el frame 1 (el que decide si
 * alguien sigue mirando) sale sin texto. Y `GROWTH.md` §5 pide exactamente lo contrario:
 * "frame 1 = payoff sobre UI real + overlay de 4-8 palabras, NUNCA logo/intro".
 *
 * Vive arriba (el karaoke ocupa abajo) y se va con un fundido para no competir con los subtítulos.
 */
export const HookOverlay: React.FC<{ text: string; holdSec?: number }> = ({ text, holdSec = 2.2 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const t = frame / fps;

  const FADE = 0.45;
  if (t > holdSec + FADE) return null;

  // SIN fundido de entrada, a propósito: el frame 1 tiene que estar al 100%. Un fade-in de solo
  // 0,12 s dejaba el primer fotograma al 28% de opacidad — medido en el render, no supuesto — o
  // sea ilegible justo en el instante que decide si alguien sigue mirando. Solo se funde la SALIDA.
  const opacity = interpolate(t, [0, holdSec, holdSec + FADE], [1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        // En 9:16: por debajo de la UI de TikTok/Reels (~180 px) Y por debajo de la cabecera de la
        // propia app capturada, con la que se solapaba a 190 px (visto en el render). Un 22% del
        // alto cae en la zona de contenido, que en el móvil del dash suele estar despejada.
        top: vertical ? Math.round(height * 0.22) : 64,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: vertical ? '88%' : '70%',
          textAlign: 'center',
          fontFamily: BRAND.fontSans,
          fontSize: vertical ? 76 : 52,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
          color: BRAND.text,
          padding: vertical ? '18px 26px' : '14px 22px',
          borderRadius: 16,
          background: 'rgba(5,5,9,0.62)',
          // Sin blur: Remotion lo rasteriza por frame y encarece el render sin aportar legibilidad.
          textShadow: '0 2px 10px rgba(0,0,0,0.85)',
          textWrap: 'balance',
        }}
      >
        {text}
      </div>
    </div>
  );
};
