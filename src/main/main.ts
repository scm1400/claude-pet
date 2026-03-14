import { app, BrowserWindow, ipcMain, screen, Menu, dialog } from 'electron';
import path from 'path';
import { registerIpcHandlers, getStore, setOnSettingsChanged } from './ipc-handlers';
import { showSettingsWindow } from './settings-window';
import { UsageTracker } from '../core/usage-tracker';
import { computeMood } from '../core/mood-engine';
import { getCurrentCommonQuoteId } from '../core/messages';
import { IPC_CHANNELS, MamaState, MamaMood, TriggerContext, DailyUtilRecord, Locale, BadgeTriggerContext } from '../shared/types';
import { getContextualMessage } from '../core/contextual-messages';
import { BadgeManager } from '../core/badge-manager';
import { evaluateBadgeTriggers } from '../core/badge-triggers';
import { createTray } from './tray';
import { syncAutoLaunch } from './auto-launch';
import { initAutoUpdater, checkForUpdatesManual } from './auto-updater';
import { evaluateQuoteTriggers } from '../core/quote-triggers';
import { QuoteCollectionManager } from '../core/quote-collection';
import { setShareCardState, generateShareCard } from './share-card';

import { t, DEFAULT_LOCALE } from '../shared/i18n';

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
let badgeManager: BadgeManager;
let moodCounts: Record<string, number> = { angry: 0, worried: 0, happy: 0, proud: 0 };
let previousMood: string | null = null;

function broadcastState(): void {
  if (!lastUsageInput) return;
  // Always read latest locale from store
  const locale = getStore().get('locale', DEFAULT_LOCALE) as import('../shared/types').Locale;
  lastUsageInput = { ...lastUsageInput, locale };
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
    resetsAt: state.resetsAt,
  };

  // Override message with contextual variant if applicable
  const isMamaMood = ['angry', 'worried', 'happy', 'proud'].includes(state.mood);
  if (isMamaMood && !state.rateLimited) {
    const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;
    const contextualMsg = getContextualMessage(
      state.mood as MamaMood,
      locale,
      ctx,
    );
    state.message = contextualMsg;
  }

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

  // Track mood transitions for badge triggers
  if (previousMood !== state.mood) {
    if (['angry', 'worried', 'happy', 'proud'].includes(state.mood)) {
      moodCounts[state.mood] = (moodCounts[state.mood] || 0) + 1;
      (getStore() as any).set('moodCounts', moodCounts);
    }
    previousMood = state.mood;
  }

  // Evaluate badge triggers (BEFORE firstApiCallSeen flip so badge_first_call can trigger)
  const badgeCtx: BadgeTriggerContext = {
    ...ctx,
    proudCount: moodCounts.proud || 0,
    angryCount: moodCounts.angry || 0,
  };
  const newBadges = badgeManager.processTriggered(evaluateBadgeTriggers(badgeCtx), now);
  if (newBadges.length > 0) {
    (getStore() as any).set('unlockedBadges', badgeManager.serialize());
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send(IPC_CHANNELS.BADGE_UNLOCKED, newBadges);
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
    dailyHistory[existingIdx].mood = state.mood;
  } else {
    dailyHistory.push({ date: today, percent: state.utilizationPercent, mood: state.mood });
  }
  dailyHistory = dailyHistory.slice(-30); // was -14, increased for badge_streak_30
  (getStore() as any).set('dailyUtilization', dailyHistory);

  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC_CHANNELS.MAMA_STATE_UPDATE, state);
    }
  }
}

function createWindow(): BrowserWindow {
  const winWidth = 200;
  const winHeight = 250;

  const store = getStore();
  const savedPos = (store as any).get('windowPosition', null) as { x: number; y: number } | null;

  let x: number, y: number;
  if (savedPos) {
    x = savedPos.x;
    y = savedPos.y;
  } else {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    x = width - winWidth - 16;
    y = height - winHeight - 16;
  }

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: store.get('alwaysOnTop', true),
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Start click-through; renderer hit-test will toggle off when cursor enters character
  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }

  // Send state updates to ALL windows on each poll result
  usageTracker.onUpdate((data) => {
    const locale = getStore().get('locale', DEFAULT_LOCALE) as import('../shared/types').Locale;
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
  const persistedBadges = (storeInstance as any).get('unlockedBadges', []) as any[];
  badgeManager = new BadgeManager(persistedBadges);
  moodCounts = (storeInstance as any).get('moodCounts', { angry: 0, worried: 0, happy: 0, proud: 0 }) as Record<string, number>;

  const win = createWindow();

  // Register IPC handlers with main window so position changes can be applied
  registerIpcHandlers(win, collectionManager, badgeManager);
  setOnSettingsChanged(() => broadcastState());

  // Dynamic mouse event switching (hit-test pattern)
  ipcMain.on(IPC_CHANNELS.SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    if (win && !win.isDestroyed()) {
      if (ignore) {
        win.setIgnoreMouseEvents(true, { forward: true });
      } else {
        win.setIgnoreMouseEvents(false);
      }
    }
  });

  // Save window position with multi-monitor bounds clamping
  ipcMain.on(IPC_CHANNELS.SAVE_POSITION, (_event, rawX: number, rawY: number) => {
    const display = screen.getDisplayNearestPoint({ x: rawX, y: rawY });
    const { x: areaX, y: areaY, width: areaW, height: areaH } = display.workArea;
    const [winW, winH] = [200, 250];
    const x = Math.max(areaX, Math.min(rawX, areaX + areaW - winW));
    const y = Math.max(areaY, Math.min(rawY, areaY + areaH - winH));

    const store = getStore();
    (store as any).set('windowPosition', { x, y });

    if (win && !win.isDestroyed() && (x !== rawX || y !== rawY)) {
      win.setPosition(x, y);
    }
  });

  // Move window (manual drag from renderer)
  ipcMain.on(IPC_CHANNELS.MOVE_WINDOW, (_event, x: number, y: number) => {
    if (win && !win.isDestroyed()) {
      win.setPosition(Math.round(x), Math.round(y));
    }
  });

  // Clamp window position after every drag move
  win.on('moved', () => {
    if (win.isDestroyed()) return;
    const [rawX, rawY] = win.getPosition();
    const display = screen.getDisplayNearestPoint({ x: rawX, y: rawY });
    const { x: areaX, y: areaY, width: areaW, height: areaH } = display.workArea;
    const [winW, winH] = [200, 250];
    const x = Math.max(areaX, Math.min(rawX, areaX + areaW - winW));
    const y = Math.max(areaY, Math.min(rawY, areaY + areaH - winH));

    if (x !== rawX || y !== rawY) {
      win.setPosition(x, y);
    }
    (getStore() as any).set('windowPosition', { x, y });
  });

  // Right-click context menu on character (mirrors tray menu)
  ipcMain.on(IPC_CHANNELS.SHOW_CONTEXT_MENU, () => {
    const locale = (getStore() as any).get('locale', DEFAULT_LOCALE) as Locale;
    const menu = Menu.buildFromTemplate([
      {
        label: win.isVisible() ? 'Hide Mama' : 'Show Mama',
        click: () => { if (win.isVisible()) win.hide(); else { win.show(); win.focus(); } },
      },
      { type: 'separator' },
      {
        label: t(locale, 'tray_share'),
        click: () => { void generateShareCard(); },
      },
      {
        label: 'Settings...',
        click: () => showSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: `v${app.isPackaged ? app.getVersion() : require(path.join(process.cwd(), 'package.json')).version}`,
        enabled: false,
      },
      {
        label: t(locale, 'tray_check_update'),
        click: () => { void checkForUpdatesManual(); },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
    menu.popup({ window: win });
  });

  // Return current state on demand (for settings window)
  ipcMain.handle(IPC_CHANNELS.MAMA_STATE_GET, () => lastMamaState);

  // Create system tray
  createTray(win);

  // Sync auto-launch on startup based on stored preference
  const settings = getStore().store;
  await syncAutoLaunch(settings.autoStart);

  // Check for updates
  initAutoUpdater();

  // Start polling — use did-finish-load when possible, but fall back to a
  // timeout so the tracker still starts even if the renderer fails to load.
  let trackerStarted = false;
  const startTracker = () => {
    if (trackerStarted) return;
    trackerStarted = true;
    usageTracker.start();
  };
  win.webContents.once('did-finish-load', startTracker);
  setTimeout(startTracker, 5000);

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
