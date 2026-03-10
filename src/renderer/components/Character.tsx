import React, { CSSProperties } from 'react';
import { MamaMood, MamaErrorExpression } from '../../shared/types';
import mamaPng from '../assets/claude-mama.png';

type Expression = MamaMood | MamaErrorExpression;

interface CharacterProps {
  expression: Expression;
}

const IMG_W = 100;
const IMG_H = 100;

const MOOD_ANIMATIONS: Record<Expression, string> = {
  angry: 'angryShake 0.5s ease-in-out infinite',
  worried: 'worriedSway 2s ease-in-out infinite',
  happy: 'happyBounce 1.5s ease-in-out infinite',
  proud: 'proudJump 1.2s ease-in-out infinite',
  confused: 'confusedWobble 1.5s ease-in-out infinite',
  sleeping: 'sleepingTilt 4s ease-in-out infinite',
};

const MOOD_AURA: Partial<Record<Expression, CSSProperties>> = {
  angry: {
    position: 'absolute', inset: -8, borderRadius: '50%',
    animation: 'angryPulse 1.5s ease-in-out infinite',
    pointerEvents: 'none',
  },
  proud: {
    position: 'absolute', inset: -8, borderRadius: '50%',
    animation: 'proudGlow 2s ease-in-out infinite',
    pointerEvents: 'none',
  },
  happy: {
    position: 'absolute', inset: -8, borderRadius: '50%',
    animation: 'happyGlow 2s ease-in-out infinite',
    pointerEvents: 'none',
  },
};

function MoodOverlay({ expression }: { expression: Expression }) {
  const px = 4;

  switch (expression) {
    case 'angry':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', top: -px * 2 - i * px * 3, left: px * 6 + i * px * 5,
              width: px * 2, height: px * 2, background: '#E05050',
              animation: `steamPuff 1s ease-out ${i * 0.3}s infinite`,
            }} />
          ))}
        </>
      );

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

    case 'proud':
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

export function Character({ expression }: CharacterProps) {
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: IMG_W,
    height: IMG_H,
    animation: MOOD_ANIMATIONS[expression],
  };

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    ...(expression === 'sleeping' ? { filter: 'brightness(0.85) saturate(0.7)', opacity: 0.8 } : {}),
    ...(expression === 'angry' ? { filter: 'saturate(1.2) brightness(1.05)' } : {}),
    ...(expression === 'proud' ? { filter: 'brightness(1.1) saturate(1.1)' } : {}),
  };

  const auraStyle = MOOD_AURA[expression];

  return (
    <div style={containerStyle}>
      {auraStyle && <div style={auraStyle as CSSProperties} />}
      <img src={mamaPng} alt="Claude Mama" style={imgStyle} draggable={false} />
      <MoodOverlay expression={expression} />
    </div>
  );
}
