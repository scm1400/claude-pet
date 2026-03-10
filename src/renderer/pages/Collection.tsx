import React, { useEffect, useState } from 'react';
import { CollectionState, QuoteRarity, Locale, UnlockedQuote } from '../../shared/types';
import { t, UIStringKey } from '../../shared/i18n';
import { QUOTE_REGISTRY } from '../../core/quote-registry';

const RARITY_ORDER: QuoteRarity[] = ['common', 'rare', 'legendary', 'secret'];
const RARITY_COLORS: Record<QuoteRarity, string> = {
  common: '#6b7280',
  rare: '#3b82f6',
  legendary: '#f59e0b',
  secret: '#8b5cf6',
};

interface Props {
  locale: Locale;
}

export default function Collection({ locale }: Props) {
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const i = (key: UIStringKey) => t(locale, key);

  useEffect(() => {
    window.electronAPI.getCollection().then((c) => {
      if (c) setCollection(c as CollectionState);
    });
    const unsub = window.electronAPI.onCollectionUpdated((state) => {
      setCollection(state as CollectionState);
    });
    return unsub;
  }, []);

  if (!collection) {
    return <div style={s.empty}>{t(locale, 'loading')}</div>;
  }

  const totalUnlocked = Object.values(collection.byRarity).reduce((sum, r) => sum + r.unlocked, 0);
  const progressPct = collection.totalCount > 0 ? (totalUnlocked / collection.totalCount) * 100 : 0;

  const recentUnlocks = [...collection.unlocked]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, 5);

  return (
    <div style={s.wrapper}>
      {/* Progress */}
      <div style={s.card}>
        <div style={s.cardLabel}>{i('collection_progress')}</div>
        <div style={s.progressText}>
          {totalUnlocked} / {collection.totalCount} ({progressPct.toFixed(0)}%)
        </div>
        <div style={s.barTrack}>
          <div style={{ ...s.barFill, width: `${progressPct}%` }} />
        </div>
      </div>

      {/* By rarity */}
      <div style={s.card}>
        {RARITY_ORDER.map((rarity) => {
          const data = collection.byRarity[rarity];
          const pct = data.total > 0 ? (data.unlocked / data.total) * 100 : 0;
          const rarityKey = `rarity_${rarity}` as UIStringKey;
          return (
            <div key={rarity} style={s.rarityRow}>
              <span style={{ ...s.rarityDot, background: RARITY_COLORS[rarity] }} />
              <span style={s.rarityLabel}>{i(rarityKey)}</span>
              <span style={s.rarityCount}>{data.unlocked}/{data.total}</span>
              <div style={s.rarityBarTrack}>
                <div style={{
                  ...s.rarityBarFill,
                  width: `${pct}%`,
                  background: RARITY_COLORS[rarity],
                }} />
              </div>
              {data.unlocked === data.total && data.total > 0 && (
                <span style={s.checkmark}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent unlocks */}
      {recentUnlocks.length > 0 && (
        <div style={s.card}>
          <div style={s.cardLabel}>{i('recent_unlock')}</div>
          {recentUnlocks.map((unlock) => {
            const entry = QUOTE_REGISTRY.find((q) => q.id === unlock.id);
            if (!entry) return null;
            const msg = entry.messages[locale] || entry.messages.ko;
            const date = new Date(unlock.unlockedAt).toLocaleDateString();
            return (
              <div key={unlock.id} style={s.unlockItem}>
                <span style={{ ...s.rarityDot, background: RARITY_COLORS[entry.rarity] }} />
                <div style={s.unlockText}>
                  <div style={s.unlockMsg}>"{msg}"</div>
                  <div style={s.unlockDate}>{date}</div>
                </div>
                {entry.rarity !== 'common' && (
                  <button
                    style={s.shareBtn}
                    onClick={() => window.electronAPI.shareCard(unlock.id)}
                    title={i('share_this_quote')}
                  >
                    📤
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb',
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
  },
  progressText: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 },
  barTrack: { height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#ec4899', borderRadius: 4 },
  rarityRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13,
  },
  rarityDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  rarityLabel: { width: 40, fontWeight: 600, color: '#374151' },
  rarityCount: { width: 40, fontSize: 12, color: '#6b7280', textAlign: 'right' as const },
  rarityBarTrack: {
    flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
  },
  rarityBarFill: { height: '100%', borderRadius: 3 },
  checkmark: { color: '#22c55e', fontWeight: 700, fontSize: 14 },
  unlockItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  unlockText: { flex: 1 },
  unlockMsg: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  unlockDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  shareBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4,
  },
};
