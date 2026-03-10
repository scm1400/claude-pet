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
});
