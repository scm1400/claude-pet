import { contextBridge, ipcRenderer } from 'electron';

// Channel names inlined to avoid require() in sandboxed preload context.
// Keep in sync with src/shared/types.ts IPC_CHANNELS.
const CHANNELS = {
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
} as const;

contextBridge.exposeInMainWorld('electronAPI', {
  onMamaStateUpdate: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(CHANNELS.MAMA_STATE_UPDATE, listener);
    return () => ipcRenderer.removeListener(CHANNELS.MAMA_STATE_UPDATE, listener);
  },

  getMamaState: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.MAMA_STATE_GET);
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

  uploadSkin: (mood?: string): Promise<string | null> => {
    return ipcRenderer.invoke(CHANNELS.UPLOAD_SKIN, mood) as Promise<string | null>;
  },

  resetSkin: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.RESET_SKIN);
  },

  getSkinConfig: (): Promise<unknown> => {
    return ipcRenderer.invoke(CHANNELS.GET_SKIN_CONFIG);
  },
});
