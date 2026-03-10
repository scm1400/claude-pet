import React, { CSSProperties, useState, useEffect } from 'react';
import { MamaMood, MamaErrorExpression, Locale } from '../../shared/types';
import { t } from '../../shared/i18n';

type Expression = MamaMood | MamaErrorExpression;

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
  return (
    <div style={styles.panel}>
      <div style={styles.topRow}>
        <div style={styles.label}>{label}</div>
        <div style={styles.percent}>{clamped.toFixed(0)}%</div>
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${clamped}%`, background: color }} />
      </div>
      {countdown && (
        <div style={styles.countdown}>↻ {countdown}</div>
      )}
    </div>
  );
}

/** Left panel (7-day) */
export function WeeklyBar({ utilizationPercent, resetsAt, mood }: {
  utilizationPercent: number;
  resetsAt: string | null;
  mood: Expression;
}) {
  const countdown = useCountdown(resetsAt);
  const color = MOOD_COLORS[mood] ?? '#9ca3af';
  return (
    <Panel
      percent={utilizationPercent}
      color={color}
      label="7d"
      countdown={countdown}
    />
  );
}

/** Right panel (5-hour) */
export function FiveHourBar({ fiveHourPercent, fiveHourResetsAt }: {
  fiveHourPercent: number;
  fiveHourResetsAt: string | null;
}) {
  const countdown = useCountdown(fiveHourResetsAt);
  const color = fiveHourPercent > 90 ? '#ef4444' : '#60a5fa';
  return (
    <Panel
      percent={fiveHourPercent}
      color={color}
      label="5h"
      countdown={countdown}
    />
  );
}

/** Offline text for no-data state */
export function OfflineLabel({ locale = 'ko' }: { locale?: Locale }) {
  return (
    <div style={{
      marginTop: 6,
      fontSize: 11,
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    }}>
      {t(locale, 'offline')}
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
};
