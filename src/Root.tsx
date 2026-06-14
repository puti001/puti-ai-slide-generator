import { Composition } from 'remotion';
import { SlideVideo } from './SlideVideo';
import './styles.css';
import inputData from '../input.json';

export interface SlideAnimation {
  type: 'zoom-in' | 'zoom-out' | 'pan-only' | 'none';
  pan: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'down-to-up' | 'none';
}

export interface SlideTransition {
  type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'wipe' | 'none';
}

export interface ObjectData {
  id: string;
  type: 'text' | 'image';
  content: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  entrance?: 'fade-in' | 'pop-in' | 'fly-in-left' | 'fly-in-right' | 'fly-in-top' | 'fly-in-bottom' | 'none';
  emphasis?: 'pulse' | 'spin' | 'float' | 'none';
  motion?: 'float' | 'pulse' | 'none';
}

export interface SubtitleItem {
  text: string;
  start: number;
  end: number;
}

export interface SlideData {
  image: string;
  durationInSeconds: number;
  animation?: SlideAnimation;
  transition?: SlideTransition;
  objects?: ObjectData[];
  subtitle?: string;
  subtitles?: SubtitleItem[];
  audio?: string;
}

export interface SlideVideoProps {
  settings: {
    width: number;
    height: number;
    fps: number;
    bgm?: string;
    bgmVolume?: number;
  };
  slides: SlideData[];
}

export const Root: React.FC = () => {
  const { settings, slides } = inputData as SlideVideoProps;
  
  const totalFrames = slides.reduce((acc, slide) => {
    return acc + Math.round(slide.durationInSeconds * settings.fps);
  }, 0);

  return (
    <>
      <Composition
        id="SlideVideo"
        component={SlideVideo}
        durationInFrames={totalFrames}
        fps={settings.fps}
        width={settings.width}
        height={settings.height}
        defaultProps={inputData}
      />
    </>
  );
};
