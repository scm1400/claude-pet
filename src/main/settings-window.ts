import { BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const rendererIndex = path.join(projectRoot, 'dist', 'renderer', 'index.html');
const isDev = !app.isPackaged && !fs.existsSync(rendererIndex);

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
      path.join(projectRoot, 'dist/renderer/index.html'),
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
