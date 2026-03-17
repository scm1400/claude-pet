import { BrowserWindow, app } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;

let settingsWin: BrowserWindow | null = null;

export function createSettingsWindow(): BrowserWindow {
  settingsWin = new BrowserWindow({
    width: 380,
    height: 560,
    transparent: false,
    frame: false,
    resizable: false,
    center: true,
    title: 'Claude Pet',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    settingsWin.loadURL('http://localhost:5173/#/settings');
  } else {
    settingsWin.loadFile(
      path.join(app.getAppPath(), 'dist/renderer/index.html'),
      { hash: '/settings' }
    );
  }

  settingsWin.on('closed', () => {
    settingsWin = null;
  });

  return settingsWin;
}

export function showSettingsWindow(): void {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
  } else {
    createSettingsWindow();
  }
}
