import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { GifBeat } from '../gif-types';

// Marco común de los GIF sociales: lenguaje PROPIO (decisión del usuario) — sin la ventana mac de
// las tarjetas fijas. Fondo de marca + kicker + rótulo grande arriba + lienzo libre + firma que
// solo se revela en el último beat.
const TONE: Record<string, string> = {
  neutral: BRAND.text,
  amber: BRAND.amber,
  cyan: BRAND.cyan,
  bad: '#ff6b5f',
  good: '#3ddc84',
};

export const GifShell: React.FC<{
  kicker?: string;
  beat: GifBeat;
  beatIndex: number;
  beatLocal: number;
  isLast: boolean;
  signature?: string;
  children: React.ReactNode;
}> = ({ kicker, beat, beatIndex, beatLocal, isLast, signature, children }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const k = width / 864; // escala si algún día se renderiza a otro tamaño

  // El rótulo entra por beat (no en cada frame): resorte anclado al inicio del beat.
  const labelIn = spring({
    frame: Math.round(beatLocal * fps),
    fps,
    config: { damping: 16, stiffness: 90 },
    durationInFrames: Math.round(0.45 * fps),
  });
  const kickerIn = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sigIn = isLast
    ? interpolate(beatLocal, [0.05, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, fontFamily: BRAND.fontSans }}>
      {/* glows de marca: ámbar arriba-derecha, cian abajo-izquierda (regla de las tarjetas) */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 70% 45% at 82% -6%, rgba(212,160,23,0.18), transparent 65%),` +
            `radial-gradient(ellipse 65% 40% at 4% 106%, rgba(0,200,255,0.12), transparent 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          padding: 56 * k,
          display: 'flex',
          flexDirection: 'column',
          gap: 26 * k,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontSize: 24 * k,
              fontWeight: 800,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: BRAND.amber,
              opacity: kickerIn,
            }}
          >
            {kicker}
          </div>
        ) : null}

        {/* rótulo grande = los "subtítulos" del GIF (sin audio, por decisión del usuario) */}
        <div
          key={beatIndex}
          style={{
            minHeight: 148 * k,
            fontSize: 52 * k,
            lineHeight: 1.14,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: TONE[beat.tone ?? 'neutral'] ?? BRAND.text,
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 16 * k}px)`,
            textWrap: 'balance',
          }}
        >
          {beat.label}
        </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>{children}</div>

        <div
          style={{
            height: 40 * k,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: sigIn,
          }}
        >
          <div style={{ fontSize: 27 * k, fontWeight: 800, color: BRAND.text }}>
            Micel<span style={{ color: BRAND.amber }}>claw</span>
          </div>
          {signature ? <div style={{ fontSize: 24 * k, color: BRAND.dim }}>{signature}</div> : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
