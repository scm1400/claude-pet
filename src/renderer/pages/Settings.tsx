import React, { useEffect, useState } from 'react';
import { MamaSettings, MamaState, Locale } from '../../shared/types';
import { t, LOCALE_LABELS, UIStringKey, DEFAULT_LOCALE } from '../../shared/i18n';
import Collection from './Collection';

const LOCALES: Locale[] = ['ko', 'en', 'ja', 'zh'];

export default function Settings() {
  const [settings, setSettings] = useState<MamaSettings>({
    autoStart: true,
    characterVisible: true,
    locale: DEFAULT_LOCALE,
    alwaysOnTop: true,
  });
  const [mamaState, setMamaState] = useState<MamaState | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'collection'>('settings');

  const locale = settings.locale;
  const i = (key: UIStringKey) => t(locale, key);

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s as MamaSettings);
      setLoading(false);
    });
    window.electronAPI.getMamaState().then((state) => {
      if (state) setMamaState(state as MamaState);
    });
    const unsub = window.electronAPI.onMamaStateUpdate((state) => {
      setMamaState(state as MamaState);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    await window.electronAPI.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div style={s.root}>
        <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>{i('loading')}</p>
      </div>
    );
  }

  const sourceKey = mamaState ? `source_${mamaState.dataSource}` as UIStringKey : 'source_none' as UIStringKey;
  const moodKey = mamaState ? `mood_${mamaState.mood}` as UIStringKey : undefined;
  const errorMsg = mamaState?.error ?? null;

  return (
    <div style={s.root}>
      {/* Custom titlebar */}
      <div style={s.titlebar}>
        <span style={s.titleText}>{i('settings_title')}</span>
        <button style={s.closeBtn} onClick={() => window.close()} title={i('close')}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        <button
          style={{ ...s.tab, ...(activeTab === 'settings' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('settings')}
        >
          {i('tab_settings')}
        </button>
        <button
          style={{ ...s.tab, ...(activeTab === 'collection' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('collection')}
        >
          {i('tab_collection')}
        </button>
      </div>

      {/* Conditional content */}
      {activeTab === 'settings' ? (
        <div style={s.content}>
          {/* Language */}
          <div style={s.card}>
            <div style={s.cardLabel}>{i('language')}</div>
            <div style={s.localeGrid}>
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  style={{
                    ...s.posBtn,
                    ...(settings.locale === loc ? s.posBtnActive : {}),
                  }}
                  onClick={() => setSettings((prev) => ({ ...prev, locale: loc }))}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-start */}
          <div style={s.card}>
            <label style={s.toggleRow}>
              <span>{i('auto_start')}</span>
              <div
                style={{ ...s.toggle, background: settings.autoStart ? '#ec4899' : '#d1d5db' }}
                onClick={() => setSettings((prev) => ({ ...prev, autoStart: !prev.autoStart }))}
              >
                <div style={{ ...s.toggleKnob, transform: settings.autoStart ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
            </label>
          </div>

          {/* Always on Top */}
          <div style={s.card}>
            <label style={s.toggleRow}>
              <span>{i('always_on_top')}</span>
              <div
                style={{ ...s.toggle, background: settings.alwaysOnTop ? '#ec4899' : '#d1d5db' }}
                onClick={() => setSettings((prev) => ({ ...prev, alwaysOnTop: !prev.alwaysOnTop }))}
              >
                <div style={{ ...s.toggleKnob, transform: settings.alwaysOnTop ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
            </label>
          </div>

          {/* Status */}
          <div style={s.card}>
            <div style={s.cardLabel}>{i('current_status')}</div>
            <div style={s.statRow}>
              <span style={s.statKey}>{i('weekly_usage')}</span>
              <span style={s.statVal}>
                {mamaState ? `${mamaState.utilizationPercent.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div style={s.statRow}>
              <span style={s.statKey}>{i('five_hour_usage')}</span>
              <span style={s.statVal}>
                {mamaState?.fiveHourPercent != null ? `${mamaState.fiveHourPercent.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div style={s.statRow}>
              <span style={s.statKey}>{i('data_source')}</span>
              <span style={{
                ...s.statVal,
                color: mamaState?.dataSource === 'api' ? '#22c55e'
                  : mamaState?.dataSource === 'cache' ? '#f59e0b' : '#ef4444',
              }}>
                {i(sourceKey)}
              </span>
            </div>
            <div style={s.statRow}>
              <span style={s.statKey}>{i('current_mood')}</span>
              <span style={s.statVal}>{moodKey ? i(moodKey) : '—'}</span>
            </div>
          </div>

          {/* API status */}
          <div style={s.card}>
            <div style={s.cardLabel}>{i('api_connection')}</div>
            {errorMsg ? (
              <div style={badge('#fef2f2', '#dc2626')}>{errorMsg}</div>
            ) : mamaState?.dataSource === 'api' ? (
              <div style={badge('#f0fdf4', '#16a34a')}>{i('connected')}</div>
            ) : (
              <div style={badge('#fffbeb', '#92400e')}>
                {i('login_required').replace('{code}', 'claude')}
              </div>
            )}
          </div>

          {/* Save */}
          <button style={s.saveBtn} onClick={handleSave}>
            {saved ? i('saved') : i('save')}
          </button>
        </div>
      ) : (
        <div style={s.content}>
          <Collection locale={locale} />
        </div>
      )}
    </div>
  );
}

function badge(bg: string, color: string): React.CSSProperties {
  return { fontSize: 12, color, background: bg, padding: '6px 10px', borderRadius: 6, lineHeight: 1.5 };
}

const s: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#f8f8f8',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: '#1a1a1a',
  },
  titlebar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    WebkitAppRegion: 'drag' as unknown as string,
    flexShrink: 0,
  } as React.CSSProperties,
  titleText: { fontSize: 14, fontWeight: 600, color: '#374151' },
  closeBtn: {
    WebkitAppRegion: 'no-drag' as unknown as string,
    width: 24, height: 24, border: 'none', background: 'transparent',
    fontSize: 14, color: '#9ca3af', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
  } as React.CSSProperties,
  content: {
    flex: 1, overflowY: 'auto', padding: '12px 14px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  card: {
    background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb',
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
  },
  localeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 },
  posGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  posBtn: {
    padding: '8px 0', fontSize: 13, fontWeight: 500,
    border: '1px solid #e5e7eb', borderRadius: 6,
    background: '#f9fafb', color: '#374151', cursor: 'pointer', textAlign: 'center',
  },
  posBtnActive: {
    background: '#fce7f3', borderColor: '#ec4899', color: '#be185d', fontWeight: 600,
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 14, color: '#374151', cursor: 'pointer',
  },
  toggle: {
    width: 40, height: 24, borderRadius: 12, padding: 2,
    cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
  },
  toggleKnob: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s',
  },
  statRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 0', fontSize: 13,
  },
  statKey: { color: '#6b7280' },
  statVal: { fontWeight: 600, color: '#1a1a1a' },
  saveBtn: {
    width: '100%', background: '#ec4899', color: '#fff', border: 'none',
    borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', marginTop: 2,
  },
  tabBar: {
    display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  tab: {
    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
    border: 'none', background: 'transparent', color: '#6b7280',
    cursor: 'pointer', borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#ec4899', borderBottomColor: '#ec4899', fontWeight: 600,
  },
};
