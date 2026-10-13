import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from '../brand';
import type { Word } from '../types';

// Subtítulos karaoke: ventana de palabras alrededor de la actual; la activa a
// plena opacidad, las key words SIEMPRE en ámbar. Inferior-central.
const WINDOW = 7;

export const Karaoke: React.FC<{ words: Word[]; bottomOffset?: number }> = ({ words, bottomOffset }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const t = frame / fps;

  // índice de la palabra activa (o la última pasada)
  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].start <= t) active = i;
    else break;
  }
  if (active === -1) return null;
  const w = words[active];
  // ocultar subs si hay un silencio largo (> 1.6s desde el fin de la última palabra)
  if (t > w.end + 1.6) return null;

  // la ventana NO cruza límites de escena (cada escena subtitula solo su línea)
  const sceneWords = words.filter((x) => (x as Word & { sceneId?: string }).sceneId === (w as Word & { sceneId?: string }).sceneId);
  const activeInScene = sceneWords.indexOf(w);
  const from = Math.max(0, activeInScene - Math.floor(WINDOW / 2));
  const slice = sceneWords.slice(from, from + WINDOW);

  return (
    <div
      style={{
        position: 'absolute',
        // En 9:16 los 220 por defecto caen DENTRO de los ~300px que la UI de TikTok tapa
        // (THUMBNAILS.md) y, con una captura móvil a escala 1:1, encima del compositor del chat
        // — el 2026-07-30 el subtítulo se comió el texto que la escena tenía que mostrar.
        // `captionBottom` del storyboard lo sube cuando la escena lo necesita.
        bottom: vertical ? (bottomOffset ?? 220) : 56,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: BRAND.fontSans,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: vertical ? 'wrap' : 'nowrap',
          justifyContent: 'center',
          maxWidth: vertical ? '92%' : undefined,
          gap: '0.42em',
          fontSize: vertical ? 44 : 30,
          fontWeight: 600,
          padding: '10px 26px',
          borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(5,5,9,0.0), rgba(5,5,9,0.55))',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}
      >
        {slice.map((word, i) => {
          const idx = from + i;
          const isActive = idx === activeInScene;
          const isPast = idx < activeInScene;
          const color = word.key ? BRAND.amber : isActive ? BRAND.text : isPast ? BRAND.dim : 'rgba(166,166,188,0.55)';
          return (
            <span key={`${idx}-${word.word}`} style={{ color, transition: 'color 80ms' }}>
              {word.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
