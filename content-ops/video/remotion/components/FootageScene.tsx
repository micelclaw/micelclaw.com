import React from 'react';
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { CameraKeyframe, Scene } from '../types';

// Cámara: zoom/pan subpíxel interpolando keyframes sobre el metraje 4K.
function cameraAt(camera: CameraKeyframe[] | undefined, t: number) {
  if (!camera || camera.length === 0) return { zoom: 1, cx: 0.5, cy: 0.5 };
  if (camera.length === 1) return camera[0];
  const sorted = [...camera].sort((a, b) => a.at - b.at);
  const ats = sorted.map((k) => k.at);
  const ease = Easing.inOut(Easing.cubic);
  const zoom = interpolate(t, ats, sorted.map((k) => k.zoom), {
    easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const cx = interpolate(t, ats, sorted.map((k) => k.cx), {
    easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const cy = interpolate(t, ats, sorted.map((k) => k.cy), {
    easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { zoom, cx, cy };
}

export const FootageScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = scene.durSec > 0 ? frame / (scene.durSec * fps) : 0;
  const { zoom: rawZoom, cx: rawCx, cy: rawCy } = cameraAt(scene.camera, Math.min(1, t));
  const zoom = Math.max(1, rawZoom);

  // REGLA (usuario, ratificada 2026-08-20): el encuadre NUNCA se sale del metraje — nada de
  // franjas negras. Con zoom Z la media ventana visible es 0.5/Z, así que el centro
  // se acota a [0.5/Z, 1-0.5/Z] EN CADA FRAME (también a mitad de interpolación).
  const half = zoom > 1 ? 0.5 / zoom : 0.5;
  const cx = Math.min(1 - half, Math.max(half, rawCx));
  const cy = Math.min(1 - half, Math.max(half, rawCy));

  // transform: escala y recentra para que (cx,cy) quede en el centro del lienzo
  const tx = (0.5 - cx) * width * zoom;
  const ty = (0.5 - cy) * height * zoom;

  const fadeIn = scene.fadeIn ? interpolate(frame, [0, Math.round(0.35 * fps)], [0, 1], { extrapolateRight: 'clamp' }) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          opacity: fadeIn,
        }}
      >
        {scene.src ? (
          <OffthreadVideo
            src={scene.src.startsWith('http') ? scene.src : staticFile(scene.src)}
            startFrom={Math.round((scene.srcOffsetSec ?? 0) * fps)}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </AbsoluteFill>
      {scene.lowerThird ? <LowerThird text={scene.lowerThird} /> : null}
    </AbsoluteFill>
  );
};

// Lower-third minimalista: tick ámbar de 3px + Inter Medium, esquina inferior izquierda.
export const LowerThird: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const inO = interpolate(frame, [Math.round(0.4 * fps), Math.round(0.75 * fps)], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: vertical ? 52 : 320, // horizontal: a la derecha del sidebar del dash (~230px @1080p)
        bottom: vertical ? 420 : 130,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: inO,
        transform: `translateY(${(1 - inO) * 10}px)`,
        fontFamily: BRAND.fontSans,
      }}
    >
      <div style={{ width: 4, height: vertical ? 40 : 30, background: BRAND.amber, borderRadius: 2 }} />
      <div
        style={{
          fontSize: vertical ? 38 : 27,
          fontWeight: 500,
          color: BRAND.text,
          textShadow: '0 1px 8px rgba(0,0,0,0.7)',
          letterSpacing: '0.01em',
        }}
      >
        {text}
      </div>
    </div>
  );
};
