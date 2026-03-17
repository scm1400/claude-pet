import { BrowserWindow, dialog, Notification, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getStore } from './ipc-handlers';
import { t, DEFAULT_LOCALE } from '../shared/i18n';
import { PetState, Locale } from '../shared/types';
import { getQuoteById } from '../core/quote-registry';

const projectRoot = path.resolve(__dirname, '..', '..', '..');

let offscreenWin: BrowserWindow | null = null;
let isGenerating = false;

let currentPetState: PetState | null = null;

export function setShareCardState(state: PetState): void {
  currentPetState = state;
}

const MOOD_COLORS: Record<string, string> = {
  happy: '#22c55e',
  playful: '#f59e0b',
  sleepy: '#6b7280',
  worried: '#eab308',
  bored: '#9ca3af',
  confused: '#8b5cf6',
  sleeping: '#6b7280',
};

function getOffscreenWindow(): BrowserWindow {
  if (offscreenWin && !offscreenWin.isDestroyed()) {
    return offscreenWin;
  }

  const templatePath = app.isPackaged
    ? path.join(projectRoot, 'dist/renderer/share-card-template/card.html')
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

  const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;

  try {
    if (!currentPetState) {
      new Notification({ title: 'Claude Pet', body: t(locale, 'share_no_data') }).show();
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
      ? path.join(projectRoot, 'dist/renderer/assets/claude-pet.png')
      : path.join(process.cwd(), 'src/renderer/assets/claude-pet.png');

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
    const moodKey = `mood_${currentPetState.mood}` as Parameters<typeof t>[1];
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
      mood: currentPetState.mood,
      moodName,
      moodColor: MOOD_COLORS[currentPetState.mood] || '#ec4899',
      message: currentPetState.message,
      weeklyPercent: currentPetState.utilizationPercent,
      fiveHourPercent: currentPetState.fiveHourPercent,
      resetsAt: currentPetState.resetsAt,
      fiveHourResetsAt: currentPetState.fiveHourResetsAt,
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
      defaultPath: path.join(app.getPath('desktop'), `claude-pet-${timestamp}.png`),
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
