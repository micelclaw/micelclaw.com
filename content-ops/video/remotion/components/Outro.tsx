import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { Scene } from '../types';

// Outro: wordmark + tagline + URL; el CTA ("Try it.") aparece 2s después, solo.
export const Outro: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inS = spring({ frame, fps, config: { damping: 15, stiffness: 80 }, durationInFrames: 28 });
  const tagIn = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlIn = interpolate(frame, [24, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaFrame = frame - 2 * fps;
  const ctaIn = spring({ frame: ctaFrame, fps, config: { damping: 13, stiffness: 100 }, durationInFrames: 22 });

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 55% 40% at 50% 45%, rgba(0,200,255,0.08), transparent 70%)`,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: inS, transform: `translateY(${(1 - inS) * 16}px)` }}>
          <Img src={staticFile('brand/logo.svg')} style={{ width: 84, height: 84 }} />
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: '-0.02em', color: BRAND.text }}>
            {t1}
            <span style={{ color: BRAND.cyan }}>{t2}</span>
          </div>
        </div>
        {scene.tagline ? (
          <div style={{ fontSize: 30, color: BRAND.dim, marginTop: 26, opacity: tagIn }}>{scene.tagline}</div>
        ) : null}
        {scene.url ? (
          <div
            style={{
              fontSize: 32,
              fontFamily: BRAND.fontMono,
              color: BRAND.text,
              marginTop: 44,
              opacity: urlIn,
            }}
          >
            {scene.url}
          </div>
        ) : null}
        {scene.cta ? (
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: BRAND.cyan,
              marginTop: 30,
              opacity: Math.max(0, ctaIn),
              transform: `scale(${0.9 + 0.1 * ctaIn})`,
            }}
          >
            {scene.cta}
          </div>
        ) : null}
        {scene.next ? (
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: BRAND.dim,
              marginTop: 36,
              opacity: Math.max(0, ctaIn),
            }}
          >
            Next: {scene.next} →
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
