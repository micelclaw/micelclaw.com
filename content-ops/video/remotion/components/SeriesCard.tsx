import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { Scene } from '../types';

// Series card: "Micelclaw OS · Ep. N — <Module>" (acento cian, mismo stinger).
// Campos usados del Scene: episode (número), moduleName, sub (opcional).
export const SeriesCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const k = vertical ? 0.82 : 1;

  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 90 }, durationInFrames: 20 });
  const epIn = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 90 }, durationInFrames: 22 });
  const modIn = spring({ frame: frame - 9, fps, config: { damping: 16, stiffness: 80 }, durationInFrames: 24 });
  const subIn = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: BRAND.fontSans,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 45% at 50% 42%, rgba(0,200,255,0.10), transparent 70%)`,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: logoIn }}>
          <Img src={staticFile('brand/logo.svg')} style={{ width: 56 * k, height: 56 * k }} />
          <div style={{ fontSize: 40 * k, fontWeight: 700, color: BRAND.text, letterSpacing: '-0.01em' }}>
            Micel<span style={{ color: BRAND.cyan }}>claw</span> OS
          </div>
        </div>
        <div
          style={{
            marginTop: 44 * k,
            fontSize: 30 * k,
            fontWeight: 600,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: BRAND.cyan,
            opacity: epIn,
            transform: `translateY(${(1 - epIn) * 14}px)`,
          }}
        >
          Episode {scene.episode ?? 1}
        </div>
        <div
          style={{
            marginTop: 14 * k,
            fontSize: 110 * k,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: BRAND.text,
            opacity: modIn,
            transform: `translateY(${(1 - modIn) * 18}px)`,
          }}
        >
          {scene.moduleName ?? scene.title?.join('') ?? ''}
        </div>
        {scene.sub ? (
          <div style={{ marginTop: 20 * k, fontSize: 30 * k, color: BRAND.dim, opacity: subIn }}>{scene.sub}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
