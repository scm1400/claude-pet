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
  dataSource: 'api' | 'jsonl' | 'none';
  stale: boolean;
  rateLimited: boolean;
  error: string | null;
}

export type Locale = 'ko' | 'en' | 'ja' | 'zh';

/** User preferences (persisted via electron-store) */
export interface MamaSettings {
  autoStart: boolean;
  characterVisible: boolean;
  locale: Locale;
  alwaysOnTop: boolean;
  skin?: SkinConfig;
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
  mood?: MamaMood | MamaErrorExpression;
}

/** Input for trigger evaluation */
export interface TriggerContext {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  dailyHistory: DailyUtilRecord[];
  installDate: string; // ISO
  firstApiCallSeen: boolean;
  now: Date;
  resetsAt?: string | null;
}

export type ContextTrigger = 'weekend' | 'unusedStreak' | 'spike' | 'resetImminent';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeEntry {
  id: string;
  tier: BadgeTier;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  icon: string;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: string;
}

export interface BadgeState {
  unlocked: UnlockedBadge[];
  totalCount: number;
  byTier: Record<BadgeTier, { unlocked: number; total: number }>;
}

export interface BadgeTriggerContext extends TriggerContext {
  proudCount: number;
  angryCount: number;
}

export type SkinMode = 'default' | 'single' | 'per-mood' | 'spritesheet';
type Expression = MamaMood | MamaErrorExpression;

export interface SkinConfig {
  mode: SkinMode;
  singleImagePath?: string;
  moodImages?: Partial<Record<Expression, string>>;
  spritesheet?: {
    imagePath: string;
    columns: number;
    rows: number;
    frameWidth: number;   // naturalWidth / columns — calculated at upload time
    frameHeight: number;  // naturalHeight / rows — calculated at upload time
    moodMap: Record<Expression, { col: number; row: number }>;
  };
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
  SET_IGNORE_MOUSE: 'mama:set-ignore-mouse',
  SAVE_POSITION: 'mama:save-position',
  MOVE_WINDOW: 'mama:move-window',
  SHOW_CONTEXT_MENU: 'mama:show-context-menu',
  BADGE_GET: 'mama:badge-get',
  BADGE_UNLOCKED: 'mama:badge-unlocked',
  UPLOAD_SKIN: 'mama:upload-skin',
  RESET_SKIN: 'mama:reset-skin',
  GET_SKIN_CONFIG: 'mama:get-skin-config',
  DAILY_HISTORY_GET: 'mama:daily-history-get',
} as const;
