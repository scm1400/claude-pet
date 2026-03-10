import React, { useState, useEffect } from 'react';
import { useMamaState } from './hooks/useMamaState';
import { Character } from './components/Character';
import { SpeechBubble } from './components/SpeechBubble';
import { WeeklyBar, FiveHourBar, OfflineLabel } from './components/UsageIndicator';
import Settings from './pages/Settings';
import { Locale } from '../shared/types';
import { t } from '../shared/i18n';

function MainView() {
  const mamaState = useMamaState();
  const [locale, setLocale] = useState<Locale>('ko');

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      if (s && (s as { locale?: Locale }).locale) {
        setLocale((s as { locale: Locale }).locale);
      }
    });
  }, []);

  const mood = mamaState?.mood ?? 'sleeping';
  const message = mamaState?.message ?? t(locale, 'loading_message');
  const utilizationPercent = mamaState?.utilizationPercent ?? 0;
  const fiveHourPercent = mamaState?.fiveHourPercent ?? null;
  const fiveHourResetsAt = mamaState?.fiveHourResetsAt ?? null;
  const dataSource = mamaState?.dataSource ?? 'none';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        gap: 0,
        padding: '12px 0',
      }}
    >
      {/* Speech bubble appears above the character */}
      <SpeechBubble message={message} mood={mood} />

      {/* Small gap between bubble tail and character */}
      <div style={{ height: 10 }} />

      {/* Character */}
      <Character expression={mood} />

      {/* Usage panels below character */}
      {dataSource === 'none' ? (
        <OfflineLabel locale={locale} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
          <WeeklyBar
            utilizationPercent={utilizationPercent}
            resetsAt={mamaState?.resetsAt ?? null}
            mood={mood}
          />
          {fiveHourPercent != null && (
            <FiveHourBar
              fiveHourPercent={fiveHourPercent}
              fiveHourResetsAt={fiveHourResetsAt}
            />
          )}
        </div>
      )}
    </div>
  );
}

function getHash(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export default function App() {
  const [hash, setHash] = useState(getHash);

  useEffect(() => {
    const handleHashChange = () => setHash(getHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (hash === 'settings') {
    return <Settings />;
  }

  return <MainView />;
}
