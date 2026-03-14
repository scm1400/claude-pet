import React, { useEffect, useState } from 'react';
import { MamaSettings, MamaState, Locale, SkinConfig, SkinMode, MamaMood, MamaErrorExpression, DailyUtilRecord } from '../../shared/types';
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

  const [skinConfig, setSkinConfig] = useState<SkinConfig>({ mode: 'default' });
  const [showAdvancedSkin, setShowAdvancedSkin] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<DailyUtilRecord[]>([]);

  const locale = settings.locale;
  const i = (key: UIStringKey) => t(locale, key);

  const EXPRESSIONS: (MamaMood | MamaErrorExpression)[] = ['angry', 'worried', 'happy', 'proud', 'confused', 'sleeping'];

  // Auto-save skin config whenever it changes (no separate save button needed)
  const saveSkinConfig = async (config: SkinConfig) => {
    setSkinConfig(config);
    await window.electronAPI.setSettings({ skin: config } as Partial<MamaSettings>);
  };

  const handleSkinModeChange = async (mode: SkinMode) => {
    const newConfig = { ...skinConfig, mode };
    await saveSkinConfig(newConfig);
  };

  const handleSkinUpload = async (mood?: string) => {
    const filePath = await window.electronAPI.uploadSkin(mood);
    if (!filePath) return;

    let newConfig = { ...skinConfig };
    if (skinConfig.mode === 'single') {
      newConfig.singleImagePath = filePath;
    } else if (skinConfig.mode === 'per-mood' && mood) {
      newConfig.moodImages = { ...newConfig.moodImages, [mood]: filePath };
    } else if (skinConfig.mode === 'spritesheet') {
      newConfig.spritesheet = { ...newConfig.spritesheet!, imagePath: filePath };
    }
    await saveSkinConfig(newConfig);
  };

  const handleSkinReset = async () => {
    await window.electronAPI.resetSkin();
    setSkinConfig({ mode: 'default' });
  };

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s as MamaSettings);
      setLoading(false);
    });
    window.electronAPI.getMamaState().then((state) => {
      if (state) setMamaState(state as MamaState);
    });
    window.electronAPI.getSkinConfig().then((c) => {
      if (c) setSkinConfig(c as SkinConfig);
    });
    window.electronAPI.getDailyHistory().then((h) => {
      if (h) setDailyHistory(h as DailyUtilRecord[]);
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

          {/* Character Skin */}
          <div style={s.card}>
            <div style={s.cardLabel}>{i('character_skin')}</div>

            {/* Simple mode selection: Default / Single / Per-Mood */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
              {(['default', 'single', 'per-mood'] as SkinMode[]).map((mode) => {
                const labels: Record<string, UIStringKey> = { 'default': 'skin_default', 'single': 'skin_single', 'per-mood': 'skin_per_mood' };
                return (
                  <button
                    key={mode}
                    style={{
                      ...s.posBtn,
                      ...(skinConfig.mode === mode ? s.posBtnActive : {}),
                      fontSize: 11,
                    }}
                    onClick={() => handleSkinModeChange(mode)}
                  >
                    {i(labels[mode])}
                  </button>
                );
              })}
            </div>

            {/* Advanced: Spritesheet (collapsible) */}
            <button
              style={{
                ...s.advancedToggle,
                color: showAdvancedSkin || skinConfig.mode === 'spritesheet' ? '#ec4899' : '#9ca3af',
              }}
              onClick={() => setShowAdvancedSkin(!showAdvancedSkin)}
            >
              {showAdvancedSkin ? '▾' : '▸'} {i('skin_spritesheet')}
            </button>
            {(showAdvancedSkin || skinConfig.mode === 'spritesheet') && (
              <button
                style={{
                  ...s.posBtn,
                  ...(skinConfig.mode === 'spritesheet' ? s.posBtnActive : {}),
                  fontSize: 11, marginTop: 4, width: '100%',
                }}
                onClick={() => handleSkinModeChange('spritesheet')}
              >
                {skinConfig.mode === 'spritesheet' ? '✓ ' : ''}{i('skin_spritesheet')}
              </button>
            )}

            {/* Single image upload */}
            {skinConfig.mode === 'single' && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={s.dropZone}
                  onClick={() => handleSkinUpload()}
                >
                  {skinConfig.singleImagePath ? (
                    <img
                      src={`file://${skinConfig.singleImagePath}`}
                      alt={i('skin_preview')}
                      style={{ width: 60, height: 60, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div style={s.dropZoneEmpty}>
                      <span style={{ fontSize: 20 }}>+</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{i('skin_upload')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Per-mood uploads */}
            {skinConfig.mode === 'per-mood' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
                {EXPRESSIONS.map((expr) => {
                  const mk = `mood_${expr}` as UIStringKey;
                  const imgPath = skinConfig.moodImages?.[expr];
                  return (
                    <div
                      key={expr}
                      style={{ ...s.moodSlot, borderColor: imgPath ? '#22c55e' : '#e5e7eb' }}
                      onClick={() => handleSkinUpload(expr)}
                    >
                      {imgPath ? (
                        <img
                          src={`file://${imgPath}`}
                          alt={expr}
                          style={{ width: 50, height: 50, objectFit: 'contain', imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <div style={{ width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 18 }}>+</div>
                      )}
                      <span style={{ fontSize: 9, color: imgPath ? '#22c55e' : '#6b7280', fontWeight: 600, marginTop: 2 }}>
                        {i(mk)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spritesheet config */}
            {skinConfig.mode === 'spritesheet' && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={s.dropZone}
                  onClick={() => handleSkinUpload()}
                >
                  {skinConfig.spritesheet?.imagePath ? (
                    <img
                      src={`file://${skinConfig.spritesheet.imagePath}`}
                      alt={i('skin_preview')}
                      style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div style={s.dropZoneEmpty}>
                      <span style={{ fontSize: 20 }}>+</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{i('skin_upload')}</span>
                    </div>
                  )}
                </div>
                {skinConfig.spritesheet?.imagePath && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <label style={{ flex: 1, fontSize: 11, color: '#6b7280' }}>
                        {i('skin_columns')}
                        <input
                          type="number" min={1} max={16}
                          value={skinConfig.spritesheet?.columns ?? 1}
                          onChange={(e) => {
                            const cols = parseInt(e.target.value) || 1;
                            saveSkinConfig({ ...skinConfig, spritesheet: { ...skinConfig.spritesheet!, columns: cols } });
                          }}
                          style={s.numInput}
                        />
                      </label>
                      <label style={{ flex: 1, fontSize: 11, color: '#6b7280' }}>
                        {i('skin_rows')}
                        <input
                          type="number" min={1} max={16}
                          value={skinConfig.spritesheet?.rows ?? 1}
                          onChange={(e) => {
                            const rows = parseInt(e.target.value) || 1;
                            saveSkinConfig({ ...skinConfig, spritesheet: { ...skinConfig.spritesheet!, rows } });
                          }}
                          style={s.numInput}
                        />
                      </label>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Mood → Frame (col, row)</div>
                      {EXPRESSIONS.map((expr) => {
                        const frame = skinConfig.spritesheet?.moodMap?.[expr] ?? { col: 0, row: 0 };
                        const mk = `mood_${expr}` as UIStringKey;
                        return (
                          <div key={expr} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ width: 50, fontSize: 10, color: '#374151' }}>{i(mk)}</span>
                            <input
                              type="number" min={0} max={15} value={frame.col}
                              style={{ ...s.numInput, width: 36, textAlign: 'center' }}
                              onChange={(e) => {
                                const col = parseInt(e.target.value) || 0;
                                saveSkinConfig({
                                  ...skinConfig,
                                  spritesheet: { ...skinConfig.spritesheet!, moodMap: { ...skinConfig.spritesheet!.moodMap, [expr]: { ...frame, col } } },
                                });
                              }}
                            />
                            <input
                              type="number" min={0} max={15} value={frame.row}
                              style={{ ...s.numInput, width: 36, textAlign: 'center' }}
                              onChange={(e) => {
                                const row = parseInt(e.target.value) || 0;
                                saveSkinConfig({
                                  ...skinConfig,
                                  spritesheet: { ...skinConfig.spritesheet!, moodMap: { ...skinConfig.spritesheet!.moodMap, [expr]: { ...frame, row } } },
                                });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Reset button (only when not default) */}
            {skinConfig.mode !== 'default' && (
              <button
                style={s.resetBtn}
                onClick={handleSkinReset}
              >
                {i('skin_reset')}
              </button>
            )}
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
            {/* Streak Calendar */}
            {dailyHistory.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                {/* Streak counter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {i('streak_label')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: calcStreak(dailyHistory) >= 7 ? '#f59e0b' : calcStreak(dailyHistory) >= 3 ? '#22c55e' : '#6b7280' }}>
                    🔥 {calcStreak(dailyHistory)}{i('streak_days')}
                  </div>
                </div>
                {/* Heatmap grid - 30 days, 6 cols x 5 rows, newest at bottom-right */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
                  {(() => {
                    // Build 30-day array (pad with empty days if needed)
                    const today = new Date();
                    const cells: { date: string; percent: number }[] = [];
                    for (let i = 29; i >= 0; i--) {
                      const d = new Date(today);
                      d.setDate(d.getDate() - i);
                      const dateStr = d.toISOString().slice(0, 10);
                      const entry = dailyHistory.find((h) => h.date === dateStr);
                      cells.push({ date: dateStr, percent: entry?.percent ?? -1 });
                    }
                    return cells.map((cell) => (
                      <div
                        key={cell.date}
                        title={`${cell.date}: ${cell.percent >= 0 ? cell.percent.toFixed(0) + '%' : 'N/A'}`}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 3,
                          background: cell.percent < 0 ? '#f3f4f6' : getMoodColor(cell.percent),
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ));
                  })()}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'center' }}>
                  {[
                    { color: '#ef4444', label: '😡' },
                    { color: '#eab308', label: '😟' },
                    { color: '#22c55e', label: '😊' },
                    { color: '#f59e0b', label: '🥹' },
                    { color: '#e5e7eb', label: '—' },
                  ].map(({ color, label }) => (
                    <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: 9, color: '#9ca3af' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

function getMoodColor(percent: number): string {
  if (percent <= 0) return '#e5e7eb';
  if (percent < 25) return '#ef4444';  // angry
  if (percent < 60) return '#eab308';  // worried
  if (percent < 85) return '#22c55e';  // happy
  return '#f59e0b';                     // proud
}

function calcStreak(history: DailyUtilRecord[]): number {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.percent > 0) streak++;
    else break;
  }
  return streak;
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
  dropZone: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 12, background: '#f9fafb', borderRadius: 8,
    border: '2px dashed #e5e7eb', cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropZoneEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    color: '#9ca3af', padding: '8px 0',
  },
  moodSlot: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 6, borderRadius: 8, border: '2px solid #e5e7eb',
    cursor: 'pointer', background: '#fafafa', transition: 'border-color 0.2s',
  },
  advancedToggle: {
    background: 'none', border: 'none', fontSize: 11, fontWeight: 500,
    cursor: 'pointer', padding: '4px 0', textAlign: 'left' as const,
  },
  resetBtn: {
    width: '100%', marginTop: 10, padding: '8px 0', fontSize: 11, fontWeight: 500,
    border: '1px solid #fecaca', borderRadius: 6,
    background: '#fff', color: '#ef4444', cursor: 'pointer', textAlign: 'center',
  },
  numInput: {
    width: '100%', padding: '4px 6px', fontSize: 12,
    border: '1px solid #e5e7eb', borderRadius: 4, marginTop: 2,
  },
};
