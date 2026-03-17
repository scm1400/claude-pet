import { contextBridge, ipcRenderer } from 'electron';

// Channel names inlined to avoid require() in sandboxed preload context.
// Keep in sync with src/shared/types.ts IPC_CHANNELS.
const CHANNELS = {
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

contextBridge.exposeInMainWorld('electronAPI', {
  onPetStateUpdate: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(CHANNELS.PET_STATE_UPDATE, listener);
    return () => ipcRenderer.removeListener(CHANNELS.PET_STATE_UPDATE, listener);
  },

  getPetState: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.PET_STATE_GET);
  },

  getSettings: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.SETTINGS_GET);
  },

  setSettings: (settings: Record<string, unknown>): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.SETTINGS_SET, settings);
  },

  showSettings: (): void => {
    ipcRenderer.send(CHANNELS.SHOW_SETTINGS);
  },

  getCollection: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.COLLECTION_GET);
  },

  onCollectionUpdated: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(CHANNELS.COLLECTION_UPDATED, listener);
    return () => ipcRenderer.removeListener(CHANNELS.COLLECTION_UPDATED, listener);
  },

  shareCard: (quoteId?: string): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.SHARE_CARD, quoteId);
  },

  setIgnoreMouse: (ignore: boolean): void => {
    ipcRenderer.send(CHANNELS.SET_IGNORE_MOUSE, ignore);
  },

  savePosition: (x: number, y: number): void => {
    ipcRenderer.send(CHANNELS.SAVE_POSITION, x, y);
  },

  moveWindow: (x: number, y: number): void => {
    ipcRenderer.send(CHANNELS.MOVE_WINDOW, x, y);
  },

  showContextMenu: (): void => {
    ipcRenderer.send(CHANNELS.SHOW_CONTEXT_MENU);
  },

  getBadges: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.BADGE_GET);
  },

  onBadgeUnlocked: (callback: (badgeIds: string[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ids: string[]) => callback(ids);
    ipcRenderer.on(CHANNELS.BADGE_UNLOCKED, listener);
    return () => ipcRenderer.removeListener(CHANNELS.BADGE_UNLOCKED, listener);
  },

  uploadSkin: (mood?: string): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.UPLOAD_SKIN, mood);
  },

  resetSkin: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.RESET_SKIN);
  },

  getSkinConfig: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.GET_SKIN_CONFIG);
  },

  onSkinConfigUpdated: (callback: (config: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, config: unknown) => callback(config);
    ipcRenderer.on(CHANNELS.SKIN_CONFIG_UPDATED, listener);
    return () => ipcRenderer.removeListener(CHANNELS.SKIN_CONFIG_UPDATED, listener);
  },

  getDailyHistory: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.DAILY_HISTORY_GET);
  },
});
