import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers, getStore } from './ipc-handlers';
import { UsageTracker } from '../core/usage-tracker';
import { computeMood } from '../core/mood-engine';
import { getCurrentCommonQuoteId } from '../core/messages';
import { IPC_CHANNELS, MamaState, TriggerContext, DailyUtilRecord } from '../shared/types';
import { createTray } from './tray';
import { syncAutoLaunch } from './auto-launch';
import { initAutoUpdater } from './auto-updater';
import { evaluateQuoteTriggers } from '../core/quote-triggers';
import { QuoteCollectionManager } from '../core/quote-collection';
import { setShareCardState } from './share-card';

const isDev = !app.isPackaged;

const usageTracker = new UsageTracker();
let lastMamaState: MamaState | null = null;
let lastUsageInput: Parameters<typeof computeMood>[0] | null = null;
let messageRotationTimer: ReturnType<typeof setInterval> | null = null;
const MESSAGE_ROTATION_MS = 120_000; // 2 minutes

let collectionManager: QuoteCollectionManager;
let dailyHistory: DailyUtilRecord[] = [];
let installDate: string;
let firstApiCallSeen: boolean;

function broadcastState(): void {
  if (!lastUsageInput) return;
  const state = computeMood(lastUsageInput);
  lastMamaState = state;
  setShareCardState(state);

  // Evaluate triggers
  const now = new Date();
  const ctx: TriggerContext = {
    weeklyUtilization: state.utilizationPercent,
    fiveHourUtilization: state.fiveHourPercent,
    dailyHistory,
    installDate,
    firstApiCallSeen,
    now,
  };

  // Determine which common quote is currently displayed for collection tracking
  const moodKey = state.mood as string;
  const currentCommonId = getCurrentCommonQuoteId(moodKey as any);

  const triggeredIds = evaluateQuoteTriggers(ctx, currentCommonId);
  const newlyUnlocked = collectionManager.processTriggered(triggeredIds, now);

  if (newlyUnlocked.length > 0) {
    const store = getStore();
    (store as any).set('unlockedQuotes', collectionManager.serialize());
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send(IPC_CHANNELS.COLLECTION_UPDATED, collectionManager.getState());
      }
    }
  }

  if (!firstApiCallSeen && state.utilizationPercent > 0) {
    firstApiCallSeen = true;
    (getStore() as any).set('firstApiCallSeen', true);
  }

  // Update daily history
  const today = now.toISOString().slice(0, 10);
  const existingIdx = dailyHistory.findIndex((d) => d.date === today);
  if (existingIdx >= 0) {
    dailyHistory[existingIdx].percent = state.utilizationPercent;
  } else {
    dailyHistory.push({ date: today, percent: state.utilizationPercent });
  }
  dailyHistory = dailyHistory.slice(-14);
  (getStore() as any).set('dailyUtilization', dailyHistory);

  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC_CHANNELS.MAMA_STATE_UPDATE, state);
    }
  }
}

function createWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 250;
  const winHeight = 300;

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 16,
    y: height - winHeight - 16,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }

  // Send state updates to ALL windows on each poll result
  usageTracker.onUpdate((data) => {
    const locale = getStore().get('locale', 'ko') as import('../shared/types').Locale;
    lastUsageInput = { ...data, locale };
    broadcastState();
  });

  // Rotate message every 2 minutes (independent of 5-min poll)
  messageRotationTimer = setInterval(() => {
    if (lastUsageInput) {
      broadcastState();
    }
  }, MESSAGE_ROTATION_MS);

  return win;
}

app.whenReady().then(async () => {
  // Initialize collection from store
  const storeInstance = getStore();
  const persisted = (storeInstance as any).get('unlockedQuotes', []) as any[];
  collectionManager = new QuoteCollectionManager(persisted);
  installDate = (storeInstance as any).get('installDate', new Date().toISOString()) as string;
  if (!(storeInstance as any).get('installDate')) {
    (storeInstance as any).set('installDate', installDate);
  }
  firstApiCallSeen = (storeInstance as any).get('firstApiCallSeen', false) as boolean;
  dailyHistory = (storeInstance as any).get('dailyUtilization', []) as DailyUtilRecord[];

  const win = createWindow();

  // Register IPC handlers with main window so position changes can be applied
  registerIpcHandlers(win, collectionManager);

  // Return current state on demand (for settings window)
  ipcMain.handle(IPC_CHANNELS.MAMA_STATE_GET, () => lastMamaState);

  // Create system tray
  createTray(win);

  // Sync auto-launch on startup based on stored preference
  const settings = getStore().store;
  await syncAutoLaunch(settings.autoStart);

  // Check for updates
  initAutoUpdater();

  // Start polling after window is ready to receive messages
  win.webContents.once('did-finish-load', () => {
    usageTracker.start();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  usageTracker.stop();
  if (messageRotationTimer) {
    clearInterval(messageRotationTimer);
    messageRotationTimer = null;
  }
});
