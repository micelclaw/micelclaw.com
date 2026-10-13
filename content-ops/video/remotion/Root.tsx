import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { DEFAULT_PROPS, type VideoProps } from './types';
import { SocialGif } from './SocialGif';
import { DEFAULT_GIF_PROPS, type GifProps } from './gif-types';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={Video}
        durationInFrames={Math.round(DEFAULT_PROPS.durationSec * DEFAULT_PROPS.fps)}
        fps={DEFAULT_PROPS.fps}
        width={DEFAULT_PROPS.width}
        height={DEFAULT_PROPS.height}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={({ props }) => {
          const p = props as VideoProps;
          return {
            durationInFrames: Math.max(1, Math.round(p.durationSec * p.fps)),
            fps: p.fps,
            width: p.width,
            height: p.height,
          };
        }}
      />
      {/* GIF social corto y mudo (864x1080 4:5 por defecto) — lo emite scripts/compose-gif.mjs */}
      <Composition
        id="SocialGif"
        component={SocialGif}
        durationInFrames={Math.round(DEFAULT_GIF_PROPS.durationSec * DEFAULT_GIF_PROPS.fps)}
        fps={DEFAULT_GIF_PROPS.fps}
        width={DEFAULT_GIF_PROPS.width}
        height={DEFAULT_GIF_PROPS.height}
        defaultProps={DEFAULT_GIF_PROPS}
        calculateMetadata={({ props }) => {
          const p = props as GifProps;
          return {
            durationInFrames: Math.max(1, Math.round(p.durationSec * p.fps)),
            fps: p.fps,
            width: p.width,
            height: p.height,
          };
        }}
      />
    </>
  );
};
