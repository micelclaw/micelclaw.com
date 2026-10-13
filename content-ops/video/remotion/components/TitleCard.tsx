import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { Scene } from '../types';

// Title card (intro): acento CIAN (marca web + logo pata).
export const TitleCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 90 }, durationInFrames: 24 });
  const wordIn = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 80 }, durationInFrames: 26 });
  const subIn = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 90], [0.98, 1.0], { extrapolateRight: 'clamp' });

  const [t1, t2] = scene.title ?? ['Micel', 'claw'];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: BRAND.fontSans,
      }}
    >
      {/* glow cian radial sutil */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 45% at 50% 42%, rgba(0,200,255,0.10), transparent 70%)`,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${scale})` }}>
        <Img
          src={staticFile('brand/logo.svg')}
          style={{
            width: 130,
            height: 130,
            opacity: logoIn,
            transform: `translateY(${(1 - logoIn) * 24}px)`,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: BRAND.text,
            opacity: wordIn,
            transform: `translateY(${(1 - wordIn) * 18}px)`,
          }}
        >
          {t1}
          <span style={{ color: BRAND.cyan }}>{t2}</span>
        </div>
        {scene.sub ? (
          <div style={{ fontSize: 34, fontWeight: 400, color: BRAND.dim, marginTop: 22, opacity: subIn }}>
            {scene.sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
