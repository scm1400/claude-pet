import React, { useEffect, useState } from 'react';
import { MamaSettings, MamaState, Locale, SkinConfig, SkinMode, MamaMood, MamaErrorExpression } from '../../shared/types';
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

  const locale = settings.locale;
  const i = (key: UIStringKey) => t(locale, key);

  const EXPRESSIONS: (MamaMood | MamaErrorExpression)[] = ['angry', 'worried', 'happy', 'proud', 'confused', 'sleeping'];
  const SKIN_MODES: { value: SkinMode; label: UIStringKey }[] = [
    { value: 'default', label: 'skin_default' },
    { value: 'single', label: 'skin_single' },
    { value: 'per-mood', label: 'skin_per_mood' },
    { value: 'spritesheet', label: 'skin_spritesheet' },
  ];

  const handleSkinModeChange = (mode: SkinMode) => {
    setSkinConfig((prev) => ({ ...prev, mode }));
  };

  const handleSkinUpload = async (mood?: string) => {
    const filePath = await window.electronAPI.uploadSkin(mood);
    if (!filePath) return;

    if (skinConfig.mode === 'single') {
      setSkinConfig((prev) => ({ ...prev, singleImagePath: filePath }));
    } else if (skinConfig.mode === 'per-mood' && mood) {
      setSkinConfig((prev) => ({
        ...prev,
        moodImages: { ...prev.moodImages, [mood]: filePath },
      }));
    } else if (skinConfig.mode === 'spritesheet') {
      setSkinConfig((prev) => ({
        ...prev,
        spritesheet: { ...prev.spritesheet!, imagePath: filePath },
      }));
    }
  };

  const handleSkinReset = async () => {
    await window.electronAPI.resetSkin();
    setSkinConfig({ mode: 'default' });
  };

  const handleSkinSave = async () => {
    await window.electronAPI.setSettings({ skin: skinConfig } as Partial<MamaSettings>);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

            {/* Mode selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {SKIN_MODES.map(({ value, label }) => (
                <button
                  key={value}
                  style={{
                    ...s.posBtn,
                    ...(skinConfig.mode === value ? s.posBtnActive : {}),
                  }}
                  onClick={() => handleSkinModeChange(value)}
                >
                  {i(label)}
                </button>
              ))}
            </div>

            {/* Single image upload */}
            {skinConfig.mode === 'single' && (
              <div>
                <button style={s.uploadBtn} onClick={() => handleSkinUpload()}>
                  {i('skin_upload')}
                </button>
                {skinConfig.singleImagePath && (
                  <div style={s.skinPreview}>
                    <img
                      src={`file://${skinConfig.singleImagePath}`}
                      alt={i('skin_preview')}
                      style={{ width: 60, height: 60, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Per-mood uploads */}
            {skinConfig.mode === 'per-mood' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {EXPRESSIONS.map((expr) => {
                  const moodKey = `mood_${expr}` as UIStringKey;
                  const hasImage = skinConfig.moodImages?.[expr];
                  return (
                    <div key={expr} style={{ textAlign: 'center' }}>
                      <button
                        style={{
                          ...s.uploadBtn,
                          fontSize: 10,
                          padding: '6px 4px',
                          background: hasImage ? '#f0fdf4' : '#f9fafb',
                          borderColor: hasImage ? '#22c55e' : '#e5e7eb',
                        }}
                        onClick={() => handleSkinUpload(expr)}
                      >
                        {i(moodKey)}
                        {hasImage ? ' ✓' : ''}
                      </button>
                      {hasImage && (
                        <img
                          src={`file://${skinConfig.moodImages![expr]}`}
                          alt={expr}
                          style={{ width: 30, height: 30, objectFit: 'contain', imageRendering: 'pixelated', marginTop: 4 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spritesheet config */}
            {skinConfig.mode === 'spritesheet' && (
              <div>
                <button style={s.uploadBtn} onClick={() => handleSkinUpload()}>
                  {i('skin_upload')}
                </button>
                {skinConfig.spritesheet?.imagePath && (
                  <>
                    <div style={s.skinPreview}>
                      <img
                        src={`file://${skinConfig.spritesheet.imagePath}`}
                        alt={i('skin_preview')}
                        style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <label style={{ flex: 1, fontSize: 12 }}>
                        {i('skin_columns')}
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={skinConfig.spritesheet?.columns ?? 1}
                          onChange={(e) => setSkinConfig((prev) => ({
                            ...prev,
                            spritesheet: {
                              ...prev.spritesheet!,
                              columns: parseInt(e.target.value) || 1,
                            },
                          }))}
                          style={s.numInput}
                        />
                      </label>
                      <label style={{ flex: 1, fontSize: 12 }}>
                        {i('skin_rows')}
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={skinConfig.spritesheet?.rows ?? 1}
                          onChange={(e) => setSkinConfig((prev) => ({
                            ...prev,
                            spritesheet: {
                              ...prev.spritesheet!,
                              rows: parseInt(e.target.value) || 1,
                            },
                          }))}
                          style={s.numInput}
                        />
                      </label>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>Mood → Frame (col, row)</div>
                      {EXPRESSIONS.map((expr) => {
                        const frame = skinConfig.spritesheet?.moodMap?.[expr] ?? { col: 0, row: 0 };
                        const moodKey = `mood_${expr}` as UIStringKey;
                        return (
                          <div key={expr} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ width: 60, fontSize: 11, color: '#374151' }}>{i(moodKey)}</span>
                            <input
                              type="number" min={0} max={15} value={frame.col}
                              style={{ ...s.numInput, width: 40 }}
                              onChange={(e) => setSkinConfig((prev) => ({
                                ...prev,
                                spritesheet: {
                                  ...prev.spritesheet!,
                                  moodMap: {
                                    ...prev.spritesheet!.moodMap,
                                    [expr]: { ...frame, col: parseInt(e.target.value) || 0 },
                                  },
                                },
                              }))}
                            />
                            <input
                              type="number" min={0} max={15} value={frame.row}
                              style={{ ...s.numInput, width: 40 }}
                              onChange={(e) => setSkinConfig((prev) => ({
                                ...prev,
                                spritesheet: {
                                  ...prev.spritesheet!,
                                  moodMap: {
                                    ...prev.spritesheet!.moodMap,
                                    [expr]: { ...frame, row: parseInt(e.target.value) || 0 },
                                  },
                                },
                              }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Save + Reset buttons */}
            {skinConfig.mode !== 'default' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={{ ...s.saveBtn, flex: 1 }} onClick={handleSkinSave}>
                  {saved ? i('saved') : i('save')}
                </button>
                <button
                  style={{ ...s.uploadBtn, flex: 0, padding: '10px 14px', color: '#ef4444', borderColor: '#fecaca' }}
                  onClick={handleSkinReset}
                >
                  {i('skin_reset')}
                </button>
              </div>
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
  uploadBtn: {
    width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 500,
    border: '1px solid #e5e7eb', borderRadius: 6,
    background: '#f9fafb', color: '#374151', cursor: 'pointer', textAlign: 'center',
  },
  skinPreview: {
    marginTop: 8, padding: 8, background: '#f9fafb', borderRadius: 8,
    display: 'flex', justifyContent: 'center',
  },
  numInput: {
    width: '100%', padding: '4px 6px', fontSize: 12,
    border: '1px solid #e5e7eb', borderRadius: 4, marginTop: 2,
  },
};
