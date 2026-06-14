import React from 'react';
import {
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Audio,
  staticFile,
  spring,
} from 'remotion';
import { SlideVideoProps, SlideData, ObjectData } from './Root';

const ObjectRenderer: React.FC<{
  obj: ObjectData;
  slideDurationInFrames: number;
  transitionDurationFrames: number;
  isHidden: boolean; 
}> = ({ obj, slideDurationInFrames, transitionDurationFrames, isHidden }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (isHidden) return null;

  const entranceDuration = Math.round(fps * 0.8);
  const entType = obj.entrance || 'none';
  
  let opacity = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (frame < entranceDuration) {
    if (entType === 'fade-in') {
      opacity = interpolate(frame, [0, entranceDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (entType === 'pop-in') {
      const spr = spring({
        frame,
        fps,
        config: { damping: 12 },
      });
      scale = spr;
      opacity = interpolate(frame, [0, 5], [0, 1], {
        extrapolateLeft: 'clamp',
      });
    } else if (entType === 'fly-in-left') {
      offsetX = interpolate(frame, [0, entranceDuration], [-400, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: 'clamp' });
    } else if (entType === 'fly-in-right') {
      offsetX = interpolate(frame, [0, entranceDuration], [400, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: 'clamp' });
    } else if (entType === 'fly-in-top') {
      offsetY = interpolate(frame, [0, entranceDuration], [-300, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: 'clamp' });
    } else if (entType === 'fly-in-bottom') {
      offsetY = interpolate(frame, [0, entranceDuration], [300, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: 'clamp' });
    }
  }

  const exitDuration = Math.round(fps * 0.4);
  const exitStartFrame = slideDurationInFrames - exitDuration;
  if (frame >= exitStartFrame) {
    opacity = interpolate(frame, [exitStartFrame, slideDurationInFrames], [opacity, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  let extraClass = '';
  const motion = obj.motion || 'none';
  if (motion === 'float') {
    extraClass = 'anim-float';
  } else if (motion === 'pulse') {
    extraClass = 'anim-pulse';
  } else if (motion === 'wiggle') {
    extraClass = 'anim-wiggle';
  } else if (motion === 'flash') {
    extraClass = 'anim-flash';
  } else if (obj.emphasis === 'spin') {
    extraClass = 'anim-spin';
  }

  // Pixel Snapping: 將百分比坐標與動畫位移強制換算並四捨五入為整數像素
  const pixelX = Math.round((obj.x / 100) * width);
  const pixelY = Math.round((obj.y / 100) * height);
  const roundedOffsetX = Math.round(offsetX);
  const roundedOffsetY = Math.round(offsetY);

  // 根據 X 坐標動態決定文字對齊，防止 1000px 容器偏移
  let textAlign: 'center' | 'left' | 'right' = 'center';
  if (obj.x < 35) {
    textAlign = 'left';
  } else if (obj.x > 65) {
    textAlign = 'right';
  }

  let marginLeft = -500;
  if (textAlign === 'left') {
    marginLeft = 0;
  } else if (textAlign === 'right') {
    marginLeft = -1000;
  }
  const marginTop = -80; // 統一推 80px 為了高 160px 置中

  let justifyContent = 'center';
  if (textAlign === 'left') {
    justifyContent = 'flex-start';
  } else if (textAlign === 'right') {
    justifyContent = 'flex-end';
  }

  // 支援打字機 (typewriter) 效果作為 entrance
  let content = obj.content;
  if (entType === 'typewriter') {
    const visibleChars = Math.round(
      interpolate(frame, [0, entranceDuration], [0, obj.content.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    );
    content = obj.content.slice(0, visibleChars);
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${pixelX + roundedOffsetX}px`,
    top: `${pixelY + roundedOffsetY}px`,
    marginLeft: `${marginLeft}px`,
    marginTop: `${marginTop}px`,
    fontSize: obj.size ? `${obj.size}px` : '32px',
    color: obj.color || '#ffffff',
    opacity,
    transform: `scale(${scale.toFixed(4)})`,
    textAlign,
    justifyContent,
  };

  return (
    <div className={`slide-object ${extraClass}`} style={style}>
      {content}
    </div>
  );
};

const Slide: React.FC<{
  slide: SlideData;
  nextSlide: SlideData | null;
  prevSlide: SlideData | null;
  durationInFrames: number;
  transitionDurationFrames: number;
  isFirst: boolean;
}> = ({ slide, nextSlide, prevSlide, durationInFrames, transitionDurationFrames, isFirst }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const blurDuration = Math.round(fps * 0.8);
  const blurVal = frame < blurDuration 
    ? interpolate(frame, [0, blurDuration], [12, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const animType = slide.animation?.type || 'none';
  const panType = slide.animation?.pan || 'none';

  let scale = 1.05; 
  if (animType === 'zoom-in') {
    scale = interpolate(frame, [0, durationInFrames], [1.0, 1.20], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (animType === 'zoom-out') {
    scale = interpolate(frame, [0, durationInFrames], [1.20, 1.0], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  let translateX = 0;
  let translateY = 0;
  
  if (panType === 'left-to-right') {
    translateX = interpolate(frame, [0, durationInFrames], [-30, 30], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (panType === 'right-to-left') {
    translateX = interpolate(frame, [0, durationInFrames], [30, -30], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (panType === 'top-to-bottom') {
    translateY = interpolate(frame, [0, durationInFrames], [-30, 30], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (panType === 'down-to-up') {
    translateY = interpolate(frame, [0, durationInFrames], [30, -30], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  const transType = slide.transition?.type || 'fade';
  
  let slideOpacity = 1;
  let transX = 0;
  let transY = 0;
  let slideScale = 1;
  let clipPathStr = 'none';

  if (!isFirst && frame < transitionDurationFrames) {
    if (transType === 'fade') {
      slideOpacity = interpolate(frame, [0, transitionDurationFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (transType === 'slide-left') {
      transX = interpolate(frame, [0, transitionDurationFrames], [width, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (transType === 'slide-right') {
      transX = interpolate(frame, [0, transitionDurationFrames], [-width, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (transType === 'slide-up') {
      transY = interpolate(frame, [0, transitionDurationFrames], [height, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (transType === 'slide-down') {
      transY = interpolate(frame, [0, transitionDurationFrames], [-height, 0], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (transType === 'wipe') {
      const percent = interpolate(frame, [0, transitionDurationFrames], [100, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      clipPathStr = `inset(0 ${percent}% 0 0)`;
    } else if (transType === 'zoom') {
      slideScale = interpolate(frame, [0, transitionDurationFrames], [0.5, 1], {
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      slideOpacity = interpolate(frame, [0, transitionDurationFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  const rawSubtitle = slide.subtitle || '';
  const typingDuration = Math.min(Math.round(fps * 2.0), durationInFrames - transitionDurationFrames - 10);
  const visibleCharCount = Math.round(
    interpolate(frame, [0, typingDuration], [0, rawSubtitle.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const displayedText = rawSubtitle.slice(0, visibleCharCount);

  const textOutroStart = durationInFrames - Math.round(fps * 0.5);
  const textOpacity = interpolate(frame, [textOutroStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isMorphedWithNext = (objId: string) => {
    if (!nextSlide || nextSlide.transition?.type !== 'morph') return false;
    const isOverlap = frame >= durationInFrames - transitionDurationFrames;
    if (!isOverlap) return false;
    return !!nextSlide.objects?.some(o => o.id === objId);
  };

  const isMorphedWithPrev = (objId: string) => {
    if (!prevSlide || slide.transition?.type !== 'morph') return false;
    const isOverlap = frame < transitionDurationFrames;
    if (!isOverlap) return false;
    return !!prevSlide.objects?.some(o => o.id === objId);
  };

  // Pixel Snapping for Slide elements
  const roundedTranslateX = Math.round(translateX);
  const roundedTranslateY = Math.round(translateY);
  const roundedTransX = Math.round(transX);
  const roundedTransY = Math.round(transY);

  return (
    <div 
      className="slide-container" 
      style={{ 
        opacity: slideOpacity,
        transform: `translate3d(${roundedTransX}px, ${roundedTransY}px, 0) scale(${slideScale.toFixed(4)})`,
        clipPath: clipPathStr,
      }}
    >
      {slide.audio && (
        <Audio src={staticFile(slide.audio)} />
      )}

      <img
        src={slide.image.startsWith('http') ? slide.image : staticFile(slide.image)}
        className="slide-image"
        style={{
          transform: `scale(${scale.toFixed(4)}) translate3d(${roundedTranslateX}px, ${roundedTranslateY}px, 0)`,
          filter: blurVal > 0 ? `blur(${blurVal}px)` : 'none',
        }}
        alt="slide background"
      />
      
      <div className="slide-overlay" />

      {slide.objects?.map((obj) => {
        const isHidden = isMorphedWithNext(obj.id) || isMorphedWithPrev(obj.id);
        return (
          <ObjectRenderer
            key={obj.id}
            obj={obj}
            slideDurationInFrames={durationInFrames}
            transitionDurationFrames={transitionDurationFrames}
            isHidden={isHidden}
          />
        );
      })}

      {displayedText && (
        <div className="subtitle-card" style={{ opacity: textOpacity }}>
          <span className="subtitle-text">{displayedText}</span>
        </div>
      )}
    </div>
  );
};

const MorphRenderer: React.FC<{
  objA: ObjectData;
  objB: ObjectData;
  startFrame: number;
  durationFrames: number;
}> = ({ objA, objB, startFrame, durationFrames }) => {
  const globalFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // 在 Sequence 內部的 useCurrentFrame() 已是從 0 開始的相對值，因此 relativeFrame 直接等於 globalFrame
  const relativeFrame = globalFrame; 

  const xPercent = interpolate(relativeFrame, [0, durationFrames], [objA.x, objB.x], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yPercent = interpolate(relativeFrame, [0, durationFrames], [objA.y, objB.y], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pixel Snapping for Morph values
  const pixelX = Math.round((xPercent / 100) * width);
  const pixelY = Math.round((yPercent / 100) * height);

  const size = interpolate(
    relativeFrame,
    [0, durationFrames],
    [objA.size || 32, objB.size || 32],
    {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // 根據目標物件 B 的 X 坐標動態決定對齊方式，防止 1000px 容器偏移
  let textAlign: 'center' | 'left' | 'right' = 'center';
  if (objB.x < 35) {
    textAlign = 'left';
  } else if (objB.x > 65) {
    textAlign = 'right';
  }

  let marginLeft = -500;
  if (textAlign === 'left') {
    marginLeft = 0;
  } else if (textAlign === 'right') {
    marginLeft = -1000;
  }
  const marginTop = -80; // 統一推 80px

  let justifyContent = 'center';
  if (textAlign === 'left') {
    justifyContent = 'flex-start';
  } else if (textAlign === 'right') {
    justifyContent = 'flex-end';
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${pixelX}px`,
    top: `${pixelY}px`,
    marginLeft: `${marginLeft}px`,
    marginTop: `${marginTop}px`,
    fontSize: `${size}px`,
    color: objB.color || '#ffffff',
    opacity: 1,
    textAlign,
    justifyContent,
  };

  let extraClass = '';
  if (objB.motion === 'float' || objA.motion === 'float') {
    extraClass = 'anim-float';
  } else if (objB.motion === 'pulse' || objA.motion === 'pulse') {
    extraClass = 'anim-pulse';
  } else if (objB.emphasis === 'spin' || objA.emphasis === 'spin') {
    extraClass = 'anim-spin';
  } else if (objB.motion === 'wiggle' || objA.motion === 'wiggle') {
    extraClass = 'anim-wiggle';
  } else if (objB.motion === 'flash' || objA.motion === 'flash') {
    extraClass = 'anim-flash';
  }

  return (
    <div className={`slide-object ${extraClass}`} style={style}>
      {objB.content}
    </div>
  );
};

export const SlideVideo: React.FC<SlideVideoProps> = ({ settings, slides }) => {
  const transitionDurationFrames = Math.round(settings.fps * 0.5); 

  const slideSequences: {
    from: number;
    duration: number;
    slide: SlideData;
    prev: SlideData | null;
    next: SlideData | null;
  }[] = [];

  let currentStartFrame = 0;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const durationInFrames = Math.round(slide.durationInSeconds * settings.fps);
    const startFrame = i === 0 ? 0 : currentStartFrame - transitionDurationFrames;
    
    slideSequences.push({
      from: startFrame,
      duration: durationInFrames,
      slide,
      prev: i > 0 ? slides[i - 1] : null,
      next: i < slides.length - 1 ? slides[i + 1] : null,
    });

    currentStartFrame = startFrame + durationInFrames;
  }

  const morphs: {
    id: string;
    objA: ObjectData;
    objB: ObjectData;
    startFrame: number;
    durationFrames: number;
  }[] = [];

  for (let i = 0; i < slideSequences.length - 1; i++) {
    const seqA = slideSequences[i];
    const seqB = slideSequences[i + 1];
    
    if (seqB.slide.transition?.type === 'morph') {
      const objectsA = seqA.slide.objects || [];
      const objectsB = seqB.slide.objects || [];
      
      for (const objA of objectsA) {
        const objB = objectsB.find(o => o.id === objA.id);
        if (objB) {
          morphs.push({
            id: objA.id,
            objA,
            objB,
            startFrame: seqB.from,
            durationFrames: transitionDurationFrames,
          });
        }
      }
    }
  }

  return (
    <div className="video-container">
      {settings.bgm && (
        <Audio
          src={staticFile(settings.bgm)}
          volume={settings.bgmVolume !== undefined ? settings.bgmVolume : 0.1}
          loop
        />
      )}
      {slideSequences.map((seq, index) => (
        <Sequence
          key={index}
          from={seq.from}
          durationInFrames={seq.duration}
          layout="none"
        >
          <Slide
            slide={seq.slide}
            nextSlide={seq.next}
            prevSlide={seq.prev}
            durationInFrames={seq.duration}
            transitionDurationFrames={transitionDurationFrames}
            isFirst={index === 0}
          />
        </Sequence>
      ))}

      {morphs.map((morph) => (
        <Sequence
          key={morph.id + '-' + morph.startFrame}
          from={morph.startFrame}
          durationInFrames={morph.durationFrames}
          layout="none"
        >
          <MorphRenderer
            objA={morph.objA}
            objB={morph.objB}
            startFrame={morph.startFrame}
            durationFrames={morph.durationFrames}
          />
        </Sequence>
      ))}
    </div>
  );
};
