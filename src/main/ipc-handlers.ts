import { ipcMain, BrowserWindow, screen } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS, MamaSettings } from '../shared/types';
import { showSettingsWindow } from './settings-window';
import { updateAutoLaunch } from './auto-launch';
import { QuoteCollectionManager } from '../core/quote-collection';
import { generateShareCard } from './share-card';

const defaults: MamaSettings = {
  position: 'bottom-right',
  autoStart: true,
  characterVisible: true,
  locale: 'ko',
};

const store = new Store<MamaSettings>({ defaults });

const WIN_WIDTH = 250;
const WIN_HEIGHT = 300;

export function getStore(): Store<MamaSettings> {
  return store;
}

function applyPosition(
  win: BrowserWindow,
  position: MamaSettings['position']
): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  let x: number;
  let y: number;

  switch (position) {
    case 'bottom-left':
      x = 0;
      y = height - WIN_HEIGHT;
      break;
    case 'top-right':
      x = width - WIN_WIDTH;
      y = 0;
      break;
    case 'top-left':
      x = 0;
      y = 0;
      break;
    case 'bottom-right':
    default:
      x = width - WIN_WIDTH;
      y = height - WIN_HEIGHT;
      break;
  }

  win.setPosition(x, y);
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

    // Apply position change to the main window
    if (settings.position && mainWindow && !mainWindow.isDestroyed()) {
      applyPosition(mainWindow, settings.position);
    }

    // Sync auto-launch preference
    if (typeof settings.autoStart === 'boolean') {
      await updateAutoLaunch(settings.autoStart);
    }

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
