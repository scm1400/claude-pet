/** Mood stages mapped to utilization thresholds */
export type MamaMood = 'angry' | 'worried' | 'happy' | 'proud';

/** Error expression types */
export type MamaErrorExpression = 'confused' | 'sleeping';

/** Data sent from main to renderer on each update */
export interface MamaState {
  mood: MamaMood | MamaErrorExpression;
  utilizationPercent: number;
  fiveHourPercent: number | null;
  message: string;
  resetsAt: string | null;
  fiveHourResetsAt: string | null;
  dataSource: 'api' | 'cache' | 'none';
  stale: boolean;
  error: string | null;
}

export type Locale = 'ko' | 'en' | 'ja' | 'zh';

/** User preferences (persisted via electron-store) */
export interface MamaSettings {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoStart: boolean;
  characterVisible: boolean;
  locale: Locale;
}

/** Quote rarity tiers */
export type QuoteRarity = 'common' | 'rare' | 'legendary' | 'secret';

/** A single quote entry in the registry */
export interface QuoteEntry {
  id: string;
  rarity: QuoteRarity;
  messages: Record<Locale, string>;
  /** For common quotes: which mood pool and index this maps to */
  moodSource?: { mood: string; index: number };
}

/** Persisted unlock record */
export interface UnlockedQuote {
  id: string;
  unlockedAt: string; // ISO timestamp
}

/** Full collection state sent to renderer */
export interface CollectionState {
  unlocked: UnlockedQuote[];
  totalCount: number;
  byRarity: Record<QuoteRarity, { unlocked: number; total: number }>;
}

/** Historical daily utilization for trigger evaluation */
export interface DailyUtilRecord {
  date: string; // YYYY-MM-DD
  percent: number;
}

/** Input for trigger evaluation */
export interface TriggerContext {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  dailyHistory: DailyUtilRecord[];
  installDate: string; // ISO
  firstApiCallSeen: boolean;
  now: Date;
}

/** IPC channel names */
export const IPC_CHANNELS = {
  MAMA_STATE_UPDATE: 'mama:state-update',
  MAMA_STATE_GET: 'mama:state-get',
  SETTINGS_GET: 'mama:settings-get',
  SETTINGS_SET: 'mama:settings-set',
  SHOW_SETTINGS: 'mama:show-settings',
  COLLECTION_GET: 'mama:collection-get',
  COLLECTION_UPDATED: 'mama:collection-updated',
  SHARE_CARD: 'mama:share-card',
} as const;
