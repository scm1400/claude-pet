import { BrowserWindow, dialog, Notification, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getStore } from './ipc-handlers';
import { t } from '../shared/i18n';
import { MamaState, Locale } from '../shared/types';
import { getQuoteById } from '../core/quote-registry';

let offscreenWin: BrowserWindow | null = null;
let isGenerating = false;

let currentMamaState: MamaState | null = null;

export function setShareCardState(state: MamaState): void {
  currentMamaState = state;
}

const MOOD_COLORS: Record<string, string> = {
  angry: '#ef4444',
  worried: '#eab308',
  happy: '#22c55e',
  proud: '#f59e0b',
  confused: '#8b5cf6',
  sleeping: '#6b7280',
};

function getOffscreenWindow(): BrowserWindow {
  if (offscreenWin && !offscreenWin.isDestroyed()) {
    return offscreenWin;
  }

  const templatePath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist/renderer/share-card-template/card.html')
    : path.join(process.cwd(), 'src/renderer/share-card-template/card.html');

  offscreenWin = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
      nodeIntegration: false,
    },
  });

  offscreenWin.loadFile(templatePath);
  offscreenWin.on('closed', () => { offscreenWin = null; });

  return offscreenWin;
}

export async function generateShareCard(quoteId?: string): Promise<boolean> {
  if (isGenerating) return false;
  isGenerating = true;

  const locale = getStore().get('locale', 'ko') as Locale;

  try {
    if (!currentMamaState) {
      new Notification({ title: 'Claude Mama', body: t(locale, 'share_no_data') }).show();
      return false;
    }

    const win = getOffscreenWindow();
    await new Promise<void>((resolve) => {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });

    const charImagePath = app.isPackaged
      ? path.join(app.getAppPath(), 'dist/renderer/assets/claude-mama.png')
      : path.join(process.cwd(), 'src/renderer/assets/claude-mama.png');

    let characterDataUrl = '';
    try {
      const buf = fs.readFileSync(charImagePath);
      characterDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    } catch { /* fallback: no image */ }

    let rarityBadge = '';
    if (quoteId) {
      const entry = getQuoteById(quoteId);
      if (entry && entry.rarity !== 'common') {
        const rarityKey = `rarity_${entry.rarity}` as Parameters<typeof t>[1];
        rarityBadge = t(locale, rarityKey);
      }
    }

    // Get locale-specific mood name
    const moodKey = `mood_${currentMamaState.mood}` as Parameters<typeof t>[1];
    const moodName = t(locale, moodKey);

    // Format generation time in UTC (e.g. "2026-03-10 12:34 UTC")
    const now = new Date();
    const generatedAt = now.getUTCFullYear()
      + '-' + String(now.getUTCMonth() + 1).padStart(2, '0')
      + '-' + String(now.getUTCDate()).padStart(2, '0')
      + ' ' + String(now.getUTCHours()).padStart(2, '0')
      + ':' + String(now.getUTCMinutes()).padStart(2, '0')
      + ' UTC';

    const cardData = {
      mood: currentMamaState.mood,
      moodName,
      moodColor: MOOD_COLORS[currentMamaState.mood] || '#ec4899',
      message: currentMamaState.message,
      weeklyPercent: currentMamaState.utilizationPercent,
      fiveHourPercent: currentMamaState.fiveHourPercent,
      resetsAt: currentMamaState.resetsAt,
      fiveHourResetsAt: currentMamaState.fiveHourResetsAt,
      characterDataUrl,
      rarityBadge,
      generatedAt,
    };

    await win.webContents.executeJavaScript(`window.populateCard(${JSON.stringify(cardData)})`);
    await new Promise((resolve) => setTimeout(resolve, 100));

    let image = await win.webContents.capturePage({ x: 0, y: 0, width: 600, height: 400 });

    if (image.isEmpty()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      image = await win.webContents.capturePage({ x: 0, y: 0, width: 600, height: 400 });
      if (image.isEmpty()) return false;
    }

    // Show save dialog instead of clipboard copy
    const timestamp = new Date().toISOString().slice(0, 10);
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: t(locale, 'tray_share'),
      defaultPath: path.join(app.getPath('desktop'), `claude-mama-${timestamp}.png`),
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (canceled || !filePath) return false;

    fs.writeFileSync(filePath, image.toPNG());

    return true;
  } catch (err) {
    console.error('[share-card] Error generating card:', err);
    return false;
  } finally {
    isGenerating = false;
  }
}
