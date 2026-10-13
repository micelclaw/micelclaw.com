import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { GifBeat } from '../gif-types';

// Técnica 1: varias CAPTURAS reales del dash encadenadas con crossfade + un ken burns muy suave.
// Las capturas se apilan (la de arriba entra en opacidad = crossfade) y cada una lleva su propio
// encuadre `focus`. Las imágenes viven en video/public/gif-shots/ (compose-gif.mjs las copia ahí).
export const ShotSequence: React.FC<{ beats: GifBeat[]; starts: number[]; t: number }> = ({
  beats,
  starts,
  t,
}) => {
  const { width } = useVideoConfig();
  const k = width / 864;
  const FADE = 0.35; // s de crossfade

  return (
    <AbsoluteFill
      style={{
        borderRadius: 20 * k,
        overflow: 'hidden',
        border: `1px solid ${BRAND.border}`,
        backgroundColor: BRAND.surface,
        boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
      }}
    >
      {beats.map((b, i) => {
        if (!b.shot) return null;
        const start = starts[i];
        // la primera se ve desde el frame 0; las siguientes entran con crossfade
        const opacity =
          i === 0
            ? 1
            : interpolate(t, [start - FADE, start], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
        if (opacity <= 0) return null;

        const f = b.focus ?? { zoom: 1, cx: 0.5, cy: 0.5 };
        // Deriva lenta hacia dentro durante el beat. Muy contenida a propósito: en un GIF cada
        // píxel que cambia se paga en bytes, y sobre una captura el movimiento aporta poco.
        const drift = interpolate(t, [start, start + b.durSec], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const scale = f.zoom * (1 + 0.02 * drift);

        // Cada capa lleva su propio fondo opaco: con objectFit 'contain' la imagen no cubre todo el
        // marco y, sin él, se transparentaría la captura anterior por los lados.
        return (
          <div
            key={b.shot + i}
            style={{ position: 'absolute', inset: 0, opacity, backgroundColor: BRAND.surface }}
          >
            <Img
              src={staticFile(b.shot)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: b.fit ?? 'cover',
                transform: `scale(${scale})`,
                transformOrigin: `${f.cx * 100}% ${f.cy * 100}%`,
              }}
            />
          </div>
        );
      })}
      {/* viñeteado inferior: separa la captura de la firma sin meter un marco */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(5,5,9,0.55), transparent 22%)',
        }}
      />
    </AbsoluteFill>
  );
};
