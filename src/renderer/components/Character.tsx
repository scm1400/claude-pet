import React, { CSSProperties, forwardRef, useEffect, useState } from 'react';
import { PetMood, PetErrorExpression, SkinConfig } from '../../shared/types';
import petPng from '../assets/claude-mama.png';
import { toFileUrl } from '../../shared/utils';

type Expression = PetMood | PetErrorExpression;

interface CharacterProps {
  expression: Expression;
  growthStage?: 'baby' | 'teen' | 'adult';
  hasNewMessage?: boolean;
  isDragging?: boolean;
  skinConfig?: SkinConfig;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const IMG_W = 60;
const IMG_H = 60;
const HIT_AREA = 80;

const MOOD_ANIMATIONS: Record<Expression, string> = {
  happy: 'happyBounce 1.5s ease-in-out infinite',
  playful: 'proudJump 1.2s ease-in-out infinite',
  sleepy: 'sleepingTilt 4s ease-in-out infinite',
  worried: 'worriedSway 2s ease-in-out infinite',
  bored: 'confusedWobble 1.5s ease-in-out infinite',
  confused: 'confusedWobble 1.5s ease-in-out infinite',
  sleeping: 'sleepingTilt 4s ease-in-out infinite',
};

const MOOD_AURA: Partial<Record<Expression, CSSProperties>> = {
  playful: { position: 'absolute', inset: -8, borderRadius: '50%', animation: 'proudGlow 2s ease-in-out infinite', pointerEvents: 'none' },
  happy: { position: 'absolute', inset: -8, borderRadius: '50%', animation: 'happyGlow 2s ease-in-out infinite', pointerEvents: 'none' },
};

function MoodOverlay({ expression }: { expression: Expression }) {
  const px = 2.5;

  switch (expression) {
    case 'worried':
      return (
        <>
          {/* Sweat drop */}
          <div style={{
            position: 'absolute', right: -px, top: px * 8,
            animation: 'sweatDrop 1.2s ease-in infinite',
          }}>
            <div style={{ width: px * 2, height: px * 2, background: '#60A5FA' }} />
            <div style={{ width: px, height: px, background: '#60A5FA', marginLeft: px * 0.5 }} />
          </div>
          {/* Rain drops */}
          {[0, 1, 2].map((i) => (
            <div key={`rain-${i}`} style={{
              position: 'absolute',
              top: -px * 2,
              left: px * 3 + i * px * 8,
              width: 2,
              height: 6,
              background: '#93C5FD',
              borderRadius: 1,
              opacity: 0.5,
              animation: `rainDrop 1.5s ease-in ${i * 0.4}s infinite`,
            }} />
          ))}
        </>
      );

    case 'happy':
      return (
        <>
          {/* Blush */}
          <div style={{ position: 'absolute', left: px * 3, bottom: px * 8, width: px * 4, height: px * 2, background: '#FFB0B0', opacity: 0.6, borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: px * 3, bottom: px * 8, width: px * 4, height: px * 2, background: '#FFB0B0', opacity: 0.6, borderRadius: 2 }} />
          {/* Floating hearts */}
          {[0, 1, 2].map((i) => (
            <div key={`heart-${i}`} style={{
              position: 'absolute',
              top: -px * 2,
              left: px * 4 + i * px * 6,
              fontSize: 10,
              color: '#FF69B4',
              animation: `floatUp 2s ease-out ${i * 0.6}s infinite`,
              pointerEvents: 'none',
            }}>
              ♥
            </div>
          ))}
        </>
      );

    case 'playful':
      return (
        <>
          {/* Sparkles */}
          {[
            { top: -px * 3, left: px * 2, delay: '0s' },
            { top: -px * 4, right: px * 2, delay: '0.5s' },
            { top: px * 4, left: -px * 3, delay: '0.25s' },
            { top: px * 2, right: -px * 3, delay: '0.75s' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', ...pos,
              width: px * 2, height: px * 2, background: '#FFD700',
              animation: `sparkle 1.4s ease-in-out ${pos.delay} infinite`,
            }} />
          ))}
          {/* Confetti */}
          {['#FFD700', '#FF69B4', '#00CED1', '#FF6347'].map((color, i) => (
            <div key={`conf-${i}`} style={{
              position: 'absolute',
              top: -px,
              left: px * 2 + i * px * 5,
              width: 4,
              height: 4,
              background: color,
              borderRadius: 1,
              animation: `confetti 2s ease-out ${i * 0.3}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
        </>
      );

    case 'bored':
      return (
        <div style={{
          position: 'absolute', top: -px * 5, right: -px * 2,
          fontSize: px * 5, fontWeight: 'bold', color: '#9ca3af',
          fontFamily: 'monospace',
          animation: 'floatQuestion 1.5s ease-in-out infinite',
          imageRendering: 'pixelated',
        }}>
          ...
        </div>
      );

    case 'confused':
      return (
        <div style={{
          position: 'absolute', top: -px * 5, right: -px * 2,
          fontSize: px * 6, fontWeight: 'bold', color: '#666',
          fontFamily: 'monospace',
          animation: 'floatQuestion 1.5s ease-in-out infinite',
          imageRendering: 'pixelated',
        }}>
          ?
        </div>
      );

    case 'sleepy':
      return (
        <>
          {/* Zzz only, no stars */}
          {['z', 'z', 'Z'].map((ch, i) => (
            <div key={i} style={{
              position: 'absolute', top: -px * 2, right: -px * 3,
              fontSize: px * (3 + i), fontWeight: 'bold', color: '#3B82F6',
              fontFamily: 'monospace', imageRendering: 'pixelated',
              animation: `zzz 2s ease-out ${i * 0.65}s infinite`,
              lineHeight: 1,
            }}>
              {ch}
            </div>
          ))}
        </>
      );

    case 'sleeping':
      return (
        <>
          {/* Zzz */}
          {['z', 'z', 'Z'].map((ch, i) => (
            <div key={i} style={{
              position: 'absolute', top: -px * 2, right: -px * 3,
              fontSize: px * (3 + i), fontWeight: 'bold', color: '#3B82F6',
              fontFamily: 'monospace', imageRendering: 'pixelated',
              animation: `zzz 2s ease-out ${i * 0.65}s infinite`,
              lineHeight: 1,
            }}>
              {ch}
            </div>
          ))}
          {/* Twinkling stars */}
          {[0, 1].map((i) => (
            <div key={`star-${i}`} style={{
              position: 'absolute',
              top: -px * 4 - i * px * 2,
              right: -px * 5 + i * px * 6,
              fontSize: 8,
              color: '#FBBF24',
              animation: `twinkle 2.5s ease-in-out ${i * 1.2}s infinite`,
              pointerEvents: 'none',
            }}>
              ★
            </div>
          ))}
        </>
      );

    default:
      return null;
  }
}

export const Character = forwardRef<HTMLDivElement, CharacterProps>(
  function Character({ expression, growthStage, hasNewMessage, isDragging, skinConfig, onMouseEnter, onMouseLeave }, ref) {
    const [spriteFrame, setSpriteFrame] = useState(0);
    let spriteAnim: { startFrame: number; endFrame: number; fps: number } | null = null;

    // Determine image source based on skin config
    let imgSrc = petPng;
    let spriteBgStyle: CSSProperties | null = null;

    if (skinConfig) {
      switch (skinConfig.mode) {
        case 'single':
          if (skinConfig.singleImagePath) imgSrc = toFileUrl(skinConfig.singleImagePath);
          break;
        case 'per-mood':
          if (skinConfig.moodImages?.[expression]) {
            imgSrc = toFileUrl(skinConfig.moodImages[expression]!);
          }
          break;
        case 'spritesheet':
          if (skinConfig.spritesheet) {
            const { imagePath, columns, rows, moodMap } = skinConfig.spritesheet;
            const anim = moodMap?.[expression];
            if (anim) {
              const frameCount = anim.endFrame - anim.startFrame + 1;
              const displayFrame = frameCount > 1 ? anim.startFrame + (spriteFrame % frameCount) : anim.startFrame;
              const col = displayFrame % columns;
              const row = Math.floor(displayFrame / columns);
              spriteBgStyle = {
                width: '100%',
                height: '100%',
                backgroundImage: `url(${toFileUrl(imagePath)})`,
                backgroundSize: `${columns * IMG_W}px ${rows * IMG_H}px`,
                backgroundPosition: `${-col * IMG_W}px ${-row * IMG_H}px`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated' as const,
              };
              spriteAnim = anim;
            }
          }
          break;
      }
    }

    // Sprite animation timer
    useEffect(() => {
      if (!spriteAnim || spriteAnim.startFrame === spriteAnim.endFrame) {
        setSpriteFrame(0);
        return;
      }
      const interval = setInterval(() => {
        setSpriteFrame((prev) => prev + 1);
      }, 1000 / spriteAnim.fps);
      return () => clearInterval(interval);
    }, [spriteAnim?.startFrame, spriteAnim?.endFrame, spriteAnim?.fps]);

    const hitAreaStyle: CSSProperties = {
      position: 'relative',
      width: HIT_AREA,
      height: HIT_AREA,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isDragging ? 'grabbing' : 'grab',
    };

    const growthScale = growthStage === 'baby' ? 0.75 : growthStage === 'teen' ? 0.9 : 1.0;
    const growthGlow = growthStage === 'adult' ? '0 0 12px rgba(255, 215, 0, 0.4)' :
                       growthStage === 'teen' ? '0 0 6px rgba(100, 200, 255, 0.3)' : 'none';

    const containerStyle: CSSProperties = {
      position: 'relative',
      width: IMG_W,
      height: IMG_H,
      animation: MOOD_ANIMATIONS[expression],
      transform: `scale(${growthScale})`,
      filter: growthStage === 'adult' ? 'brightness(1.1) saturate(1.1)' : undefined,
      boxShadow: growthGlow,
      borderRadius: '50%',
      transition: 'transform 0.5s ease, box-shadow 0.5s ease',
    };

    const imgStyle: CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      imageRendering: 'pixelated',
      ...(!spriteBgStyle && (expression === 'sleeping' || expression === 'sleepy') ? { filter: 'brightness(0.85) saturate(0.7)', opacity: 0.8 } : {}),
      ...(!spriteBgStyle && expression === 'playful' ? { filter: 'brightness(1.1) saturate(1.1)' } : {}),
    };

    const auraStyle = MOOD_AURA[expression];

    return (
      <div
        ref={ref}
        style={hitAreaStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div style={containerStyle}>
          {auraStyle && <div style={auraStyle as CSSProperties} />}
          {spriteBgStyle ? <div style={spriteBgStyle} /> : <img src={imgSrc} alt="Claude Pet" style={imgStyle} draggable={false} />}
          {!spriteBgStyle && <MoodOverlay expression={expression} />}
        </div>
        {hasNewMessage && (
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ef4444',
            animation: 'pulse-dot 1.5s ease-in-out infinite',
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
          }} />
        )}
      </div>
    );
  }
);
