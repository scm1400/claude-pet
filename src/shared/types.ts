/** Mood stages mapped to utilization thresholds */
export type PetMood = 'happy' | 'playful' | 'sleepy' | 'worried' | 'bored';

/** Error expression types */
export type PetErrorExpression = 'confused' | 'sleeping';

/** Pet event triggered by user interaction */
export interface PetEvent {
  type: 'feed' | 'play' | 'pet';
  timestamp: string;
}

/** Data sent from main to renderer on each update */
export interface PetState {
  mood: PetMood | PetErrorExpression;
  utilizationPercent: number;
  fiveHourPercent: number | null;
  message: string;
  resetsAt: string | null;
  fiveHourResetsAt: string | null;
  dataSource: 'api' | 'jsonl' | 'none';
  stale: boolean;
  rateLimited: boolean;
  error: string | null;
  hunger: number;
  happiness: number;
  energy: number;
  exp: number;
  level: number;
  growthStage: 'baby' | 'teen' | 'adult';
  lastEvent: PetEvent | null;
  petName: string | null;
}

export type Locale = 'ko' | 'en' | 'ja' | 'zh';

/** User preferences (persisted via electron-store) */
export interface PetSettings {
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
  mood?: PetMood | PetErrorExpression;
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
  happyCount: number;
  worriedCount: number;
}

export type SkinMode = 'default' | 'single' | 'per-mood' | 'spritesheet';
type Expression = PetMood | PetErrorExpression;

export interface SkinConfig {
  mode: SkinMode;
  singleImagePath?: string;
  moodImages?: Partial<Record<Expression, string>>;
  spritesheet?: {
    imagePath: string;
    columns: number;
    rows: number;
    imageWidth: number;   // original image natural width
    imageHeight: number;  // original image natural height
    frameWidth: number;   // imageWidth / columns
    frameHeight: number;  // imageHeight / rows
    moodMap: Record<Expression, { startFrame: number; endFrame: number; fps: number }>;
  };
}

/** Result from skin image upload */
export type SkinUploadResponse =
  | { ok: true; path: string; width: number; height: number }
  | { ok: false; error: 'file_too_large' | 'invalid_format' }
  | null;

/** IPC channel names */
export const IPC_CHANNELS = {
  PET_STATE_UPDATE: 'pet:state-update',
  PET_STATE_GET: 'pet:state-get',
  SETTINGS_GET: 'pet:settings-get',
  SETTINGS_SET: 'pet:settings-set',
  SHOW_SETTINGS: 'pet:show-settings',
  COLLECTION_GET: 'pet:collection-get',
  COLLECTION_UPDATED: 'pet:collection-updated',
  SHARE_CARD: 'pet:share-card',
  SET_IGNORE_MOUSE: 'pet:set-ignore-mouse',
  SAVE_POSITION: 'pet:save-position',
  MOVE_WINDOW: 'pet:move-window',
  SHOW_CONTEXT_MENU: 'pet:show-context-menu',
  BADGE_GET: 'pet:badge-get',
  BADGE_UNLOCKED: 'pet:badge-unlocked',
  UPLOAD_SKIN: 'pet:upload-skin',
  RESET_SKIN: 'pet:reset-skin',
  GET_SKIN_CONFIG: 'pet:get-skin-config',
  SKIN_CONFIG_UPDATED: 'pet:skin-config-updated',
  DAILY_HISTORY_GET: 'pet:daily-history-get',
} as const;
