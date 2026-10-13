import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { BRAND } from './brand';
import { useBrandFonts } from './components/Fonts';
import { FootageScene } from './components/FootageScene';
import { HookOverlay } from './components/HookOverlay';
import { Karaoke } from './components/Karaoke';
import { Outro } from './components/Outro';
import { SeriesCard } from './components/SeriesCard';
import { TitleCard } from './components/TitleCard';
import type { Scene, VideoProps } from './types';

const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.kind) {
    case 'title':
      return <TitleCard scene={scene} />;
    case 'series':
      return <SeriesCard scene={scene} />;
    case 'outro':
      return <Outro scene={scene} />;
    case 'footage':
    default:
      return <FootageScene scene={scene} />;
  }
};

export const Video: React.FC<VideoProps> = (props) => {
  useBrandFonts();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      {props.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={Math.round(scene.startSec * fps)}
          durationInFrames={Math.max(1, Math.round(scene.durSec * fps))}
          name={scene.id}
        >
          <SceneRenderer scene={scene} />
        </Sequence>
      ))}
      {props.showCaptions && props.words.length > 0 ? <Karaoke words={props.words} bottomOffset={props.captionBottom} /> : null}
      {props.hook ? <HookOverlay text={props.hook} holdSec={props.hookHoldSec} /> : null}
    </AbsoluteFill>
  );
};
