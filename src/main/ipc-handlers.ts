import { ipcMain, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS, PetSettings, SkinConfig } from '../shared/types';
import { showSettingsWindow } from './settings-window';
import { updateAutoLaunch } from './auto-launch';
import { QuoteCollectionManager } from '../core/quote-collection';
import { generateShareCard } from './share-card';
import { BadgeManager } from '../core/badge-manager';
import { DEFAULT_LOCALE } from '../shared/i18n';
import { uploadSkinImage, resetSkin, getSkinConfig, saveSkinConfig } from './skin-manager';

const defaults: PetSettings = {
  autoStart: true,
  characterVisible: true,
  locale: DEFAULT_LOCALE,
  alwaysOnTop: true,
};

const store = new Store({ defaults });

export function getStore(): Store<PetSettings> {
  return store;
}

let onSettingsChanged: (() => void) | null = null;

export function setOnSettingsChanged(callback: () => void): void {
  onSettingsChanged = callback;
}

export function registerIpcHandlers(
  mainWindow?: BrowserWindow,
  collectionManager?: QuoteCollectionManager,
  badgeManager?: BadgeManager,
): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return store.store;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings: Partial<PetSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof PetSettings, value);
    }

    // Sync auto-launch preference
    if (typeof settings.autoStart === 'boolean') {
      await updateAutoLaunch(settings.autoStart);
    }

    // Sync always-on-top preference
    if (typeof settings.alwaysOnTop === 'boolean' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    }

    // Save skin config if provided and broadcast to all windows
    if (settings.skin) {
      saveSkinConfig(settings.skin as SkinConfig);
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) {
          w.webContents.send(IPC_CHANNELS.SKIN_CONFIG_UPDATED, settings.skin);
        }
      }
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

  // Badges
  ipcMain.handle(IPC_CHANNELS.BADGE_GET, () => {
    return badgeManager?.getState() ?? null;
  });

  // Skin
  ipcMain.handle(IPC_CHANNELS.UPLOAD_SKIN, async (_event, mood?: string) => {
    return uploadSkinImage(mood);
  });

  ipcMain.handle(IPC_CHANNELS.RESET_SKIN, () => {
    resetSkin();
    return { mode: 'default' };
  });

  ipcMain.handle(IPC_CHANNELS.GET_SKIN_CONFIG, () => {
    return getSkinConfig();
  });

  ipcMain.handle(IPC_CHANNELS.DAILY_HISTORY_GET, () => {
    return (store as any).get('dailyUtilization', []);
  });
}
