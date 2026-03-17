import React, { CSSProperties, useState, useEffect } from 'react';
import { PetMood, PetErrorExpression, Locale } from '../../shared/types';
import { t, DEFAULT_LOCALE } from '../../shared/i18n';

type Expression = PetMood | PetErrorExpression;

const MOOD_COLORS: Record<Expression, string> = {
  angry: '#ef4444',
  worried: '#eab308',
  happy: '#22c55e',
  proud: '#f59e0b',
  confused: '#9ca3af',
  sleeping: '#9ca3af',
};

const BAR_WIDTH = 50;
const BAR_HEIGHT = 7;

function clamp(v: number): number {
  return Math.min(100, Math.max(0, v));
}

function formatTimeLeft(resetsAt: string): string | null {
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ''}`;
  return `${m}m`;
}

function useCountdown(resetsAt: string | null): string | null {
  const [text, setText] = useState<string | null>(
    resetsAt ? formatTimeLeft(resetsAt) : null
  );
  useEffect(() => {
    if (!resetsAt) { setText(null); return; }
    setText(formatTimeLeft(resetsAt));
    const id = setInterval(() => {
      setText(formatTimeLeft(resetsAt));
    }, 30_000);
    return () => clearInterval(id);
  }, [resetsAt]);
  return text;
}

function Panel({ percent, color, label, countdown }: {
  percent: number;
  color: string;
  label: string;
  countdown: string | null;
}) {
  const clamped = clamp(percent);
  const isMaxed = clamped >= 100;

  return (
    <div style={styles.panel}>
      <div style={styles.topRow}>
        <div style={styles.label}>{label}</div>
        <div style={styles.percent}>{clamped.toFixed(0)}%</div>
      </div>
      {isMaxed && countdown ? (
        <div style={styles.maxedCountdown}>
          ↻ {countdown}
        </div>
      ) : (
        <>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${clamped}%`, background: color }} />
          </div>
          {countdown && (
            <div style={styles.countdown}>↻ {countdown}</div>
          )}
        </>
      )}
    </div>
  );
}

/** Left panel (7-day) */
export function WeeklyBar({ utilizationPercent, resetsAt, mood, stale }: {
  utilizationPercent: number;
  resetsAt: string | null;
  mood: Expression;
  stale?: boolean;
}) {
  const countdown = useCountdown(resetsAt);
  const color = MOOD_COLORS[mood] ?? '#9ca3af';
  return (
    <div style={{ opacity: stale ? 0.7 : 1, transition: 'opacity 0.3s ease' }}>
      <Panel
        percent={utilizationPercent}
        color={color}
        label={stale ? '7d ·' : '7d'}
        countdown={countdown}
      />
    </div>
  );
}

/** Right panel (5-hour) */
export function FiveHourBar({ fiveHourPercent, fiveHourResetsAt, stale }: {
  fiveHourPercent: number;
  fiveHourResetsAt: string | null;
  stale?: boolean;
}) {
  const countdown = useCountdown(fiveHourResetsAt);
  const color = fiveHourPercent > 90 ? '#ef4444' : '#60a5fa';
  return (
    <div style={{ opacity: stale ? 0.7 : 1, transition: 'opacity 0.3s ease' }}>
      <Panel
        percent={fiveHourPercent}
        color={color}
        label={stale ? '5h ·' : '5h'}
        countdown={countdown}
      />
    </div>
  );
}

/** Offline / rate-limited text for no-data state */
export function OfflineLabel({ locale = DEFAULT_LOCALE, rateLimited = false }: { locale?: Locale; rateLimited?: boolean }) {
  return (
    <div style={{
      marginTop: 6,
      fontSize: 11,
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    }}>
      {rateLimited ? t(locale, 'rate_limited') : t(locale, 'offline')}
    </div>
  );
}

/** Compact single-line bar for mini mode */
export function MiniBar({ utilizationPercent, mood, stale, resetsAt }: {
  utilizationPercent: number;
  mood: Expression;
  stale?: boolean;
  resetsAt?: string | null;
}) {
  const clamped = clamp(utilizationPercent);
  const color = MOOD_COLORS[mood] ?? '#9ca3af';
  const countdown = useCountdown(resetsAt ?? null);
  const isMaxed = clamped >= 100;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(0, 0, 0, 0.65)',
      borderRadius: 6,
      padding: '3px 6px',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      opacity: stale ? 0.75 : 1,
      transition: 'opacity 0.3s ease',
    }}>
      {isMaxed && countdown ? (
        <span style={{
          fontSize: 9,
          color: '#fbbf24',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          textShadow: '0 0 4px rgba(251, 191, 36, 0.5), 0 1px 3px rgba(0,0,0,1)',
        }}>
          ↻ {countdown}
        </span>
      ) : (
        <>
          <div style={{
            width: 36,
            height: 5,
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${clamped}%`,
              background: color,
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{
            fontSize: 9,
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,1)',
          }}>
            {clamped.toFixed(0)}%
          </span>
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    background: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 8,
    padding: '5px 8px',
    backdropFilter: 'blur(6px)',
    minWidth: 60,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textShadow: '0 1px 3px rgba(0,0,0,1)',
  },
  percent: {
    fontSize: 10,
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 700,
    textShadow: '0 1px 3px rgba(0,0,0,1)',
  },
  track: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    background: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease, background 0.3s ease',
    boxShadow: '0 0 4px rgba(255,255,255,0.3)',
  },
  countdown: {
    fontSize: 8,
    color: '#e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,1)',
    textAlign: 'center',
  },
  maxedCountdown: {
    fontSize: 12,
    color: '#fbbf24',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 800,
    textShadow: '0 0 6px rgba(251, 191, 36, 0.5), 0 1px 3px rgba(0,0,0,1)',
    textAlign: 'center',
    padding: '2px 0',
    animation: 'pulse-dot 2s ease-in-out infinite',
  },
};
