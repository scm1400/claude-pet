import { ipcMain, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS, MamaSettings } from '../shared/types';
import { showSettingsWindow } from './settings-window';
import { updateAutoLaunch } from './auto-launch';
import { QuoteCollectionManager } from '../core/quote-collection';
import { generateShareCard } from './share-card';
import { DEFAULT_LOCALE } from '../shared/i18n';

const defaults: MamaSettings = {
  autoStart: true,
  characterVisible: true,
  locale: DEFAULT_LOCALE,
  alwaysOnTop: true,
};

const store = new Store({ defaults });

export function getStore(): Store<MamaSettings> {
  return store;
}

let onSettingsChanged: (() => void) | null = null;

export function setOnSettingsChanged(callback: () => void): void {
  onSettingsChanged = callback;
}

export function registerIpcHandlers(
  mainWindow?: BrowserWindow,
  collectionManager?: QuoteCollectionManager,
): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return store.store;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings: Partial<MamaSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof MamaSettings, value);
    }

    // Sync auto-launch preference
    if (typeof settings.autoStart === 'boolean') {
      await updateAutoLaunch(settings.autoStart);
    }

    // Sync always-on-top preference
    if (typeof settings.alwaysOnTop === 'boolean' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    }

    // Re-broadcast state with updated settings (e.g. locale change)
    onSettingsChanged?.();

    return store.store;
  });

  ipcMain.on(IPC_CHANNELS.SHOW_SETTINGS, () => {
    showSettingsWindow();
  });

  // Collection
  ipcMain.handle(IPC_CHANNELS.COLLECTION_GET, () => {
    return collectionManager?.getState() ?? null;
  });

  // Share card
  ipcMain.handle(IPC_CHANNELS.SHARE_CARD, async (_event, quoteId?: string) => {
    return generateShareCard(quoteId);
  });
}
