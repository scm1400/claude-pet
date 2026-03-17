import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePetState } from './hooks/usePetState';
import { useWidgetMode } from './hooks/useWidgetMode';
import { Character } from './components/Character';
import { SpeechBubble } from './components/SpeechBubble';
import { WeeklyBar, FiveHourBar, MiniBar, OfflineLabel } from './components/UsageIndicator';
import Settings from './pages/Settings';
import { Locale, SkinConfig } from '../shared/types';
import { t, DEFAULT_LOCALE } from '../shared/i18n';

function MainView() {
  const petState = usePetState();
  const { mode, onToggle } = useWidgetMode();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [skinConfig, setSkinConfig] = useState<SkinConfig | undefined>();
  const [showDragHint, setShowDragHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDirection, setBubbleDirection] = useState<'up' | 'down'>('up');
  const prevMessageRef = useRef<string>('');
  const characterRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const lastIgnoreRef = useRef(true);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      if (s && (s as { locale?: Locale }).locale) {
        setLocale((s as { locale: Locale }).locale);
      }
    });
  }, []);

  useEffect(() => {
    window.electronAPI.getSkinConfig().then((c) => {
      if (c) setSkinConfig(c as SkinConfig);
    });
    return window.electronAPI.onSkinConfigUpdated((c) => {
      if (c) setSkinConfig(c as SkinConfig);
    });
  }, []);

  // First-run drag hint
  useEffect(() => {
    const hintShown = localStorage.getItem('firstRunHintShown');
    if (!hintShown) {
      setShowDragHint(true);
      localStorage.setItem('firstRunHintShown', 'true');
      setTimeout(() => setShowDragHint(false), 3000);
    }
  }, []);

  // Hit-test based dynamic pointer event switching
  useEffect(() => {
    const isPointInRef = (ref: React.RefObject<HTMLDivElement | null>, x: number, y: number) => {
      if (!ref.current) return false;
      const rect = ref.current.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (characterRef.current) {
        const isOverInteractive = isPointInRef(characterRef, e.clientX, e.clientY)
          || isPointInRef(barsRef, e.clientX, e.clientY);

        const shouldIgnore = !isOverInteractive;
        if (shouldIgnore !== lastIgnoreRef.current) {
          lastIgnoreRef.current = shouldIgnore;
          window.electronAPI.setIgnoreMouse(shouldIgnore);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Manual window drag on character area
  const dragRef = useRef<{ startScreenX: number; startScreenY: number; winX: number; winY: number } | null>(null);
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      // Only start drag if mouse is over the character hit area
      if (!characterRef.current) return;
      const rect = characterRef.current.getBoundingClientRect();
      const isOverCharacter =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!isOverCharacter) return;

      dragRef.current = {
        startScreenX: e.screenX,
        startScreenY: e.screenY,
        winX: window.screenX,
        winY: window.screenY,
      };
      // Keep mouse events active during drag (prevent hit-test from disabling)
      lastIgnoreRef.current = false;
      window.electronAPI.setIgnoreMouse(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.screenX - dragRef.current.startScreenX;
      const dy = e.screenY - dragRef.current.startScreenY;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        setIsDragging(true);
      }
      if (isDragging || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        window.electronAPI.moveWindow(dragRef.current.winX + dx, dragRef.current.winY + dy);
      }
    };

    const onMouseUp = () => {
      if (dragRef.current) {
        if (isDragging) {
          window.electronAPI.savePosition(window.screenX, window.screenY);
        }
        dragRef.current = null;
        setIsDragging(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const mood = petState?.mood ?? 'sleeping';
  const message = petState?.message ?? t(locale, 'loading_message');
  const utilizationPercent = petState?.utilizationPercent ?? 0;
  const fiveHourPercent = petState?.fiveHourPercent ?? null;
  const fiveHourResetsAt = petState?.fiveHourResetsAt ?? null;
  const dataSource = petState?.dataSource ?? 'none';
  const rateLimited = petState?.rateLimited ?? false;

  // Show speech bubble on message rotation (independent of bar state)
  useEffect(() => {
    if (message !== prevMessageRef.current) {
      prevMessageRef.current = message;
      if (petState) {
        const dir = window.screenY < 120 ? 'down' : 'up';
        setBubbleDirection(dir);
        setBubbleVisible(true);
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      }
    }
  }, [message, petState]);

  const isExpanded = mode === 'expanded';

  // Right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.showContextMenu();
  }, []);

  const handleBubbleComplete = useCallback(() => {
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
      bubbleTimerRef.current = null;
    }, 1000);
  }, []);

  const bubble = bubbleVisible ? (
    <SpeechBubble message={message} mood={mood} tailDirection={bubbleDirection === 'up' ? 'down' : 'up'} onComplete={handleBubbleComplete} />
  ) : null;

  const character = (
    <div
      onContextMenu={handleContextMenu}
      style={{ position: 'relative' }}
    >
      <Character
        ref={characterRef}
        expression={mood}
        isDragging={isDragging}
        skinConfig={skinConfig}
      />
      {showDragHint && (
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          animation: 'fade-out 3s ease forwards',
        }}>
          Drag me to move!
        </div>
      )}
    </div>
  );

  const isStale = false;
  const usageBars = dataSource === 'none' ? (
    <OfflineLabel locale={locale} rateLimited={rateLimited} />
  ) : isExpanded ? (
    <div ref={barsRef} onClick={onToggle} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, cursor: 'pointer' }}>
      <WeeklyBar utilizationPercent={utilizationPercent} resetsAt={petState?.resetsAt ?? null} mood={mood} stale={isStale} />
      {fiveHourPercent != null && (
        <FiveHourBar fiveHourPercent={fiveHourPercent} fiveHourResetsAt={fiveHourResetsAt} stale={isStale} />
      )}
    </div>
  ) : (
    <div ref={barsRef} onClick={onToggle} style={{ cursor: 'pointer' }}>
      <MiniBar utilizationPercent={utilizationPercent} mood={mood} stale={isStale} resetsAt={petState?.resetsAt} />
    </div>
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: bubbleDirection === 'up' ? 'flex-end' : 'flex-start',
      background: 'transparent',
      padding: '8px 0',
      transition: 'all 300ms ease',
    }}>
      {bubbleDirection === 'up' ? (
        <>
          {bubble}
          {bubble && <div style={{ height: 6 }} />}
          {character}
          <div style={{ marginTop: 4 }}>{usageBars}</div>
        </>
      ) : (
        <>
          {character}
          <div style={{ marginTop: 4 }}>{usageBars}</div>
          {bubble && <div style={{ height: 6 }} />}
          {bubble}
        </>
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
