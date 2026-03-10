import path from 'path';
import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import { showSettingsWindow } from './settings-window';
import { generateShareCard } from './share-card';
import { getStore } from './ipc-handlers';
import { t } from '../shared/i18n';
import { Locale } from '../shared/types';

let trayInstance: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = buildTrayIcon();

  trayInstance = new Tray(icon);
  trayInstance.setToolTip('Claude Mama');

  updateContextMenu(mainWindow);

  trayInstance.on('double-click', () => {
    toggleWindowVisibility(mainWindow);
  });

  // Re-build menu when window visibility changes so label stays in sync
  mainWindow.on('show', () => updateContextMenu(mainWindow));
  mainWindow.on('hide', () => updateContextMenu(mainWindow));

  return trayInstance;
}

function buildTrayIcon(): Electron.NativeImage {
  const iconName = 'tray-icon.png';
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, iconName)
    : path.join(process.cwd(), 'build', iconName);
  return nativeImage.createFromPath(iconPath);
}

function toggleWindowVisibility(win: BrowserWindow): void {
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

function updateContextMenu(mainWindow: BrowserWindow): void {
  if (!trayInstance) return;

  const isVisible = mainWindow.isVisible();
  const locale = getStore().get('locale', 'ko') as Locale;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Mama' : 'Show Mama',
      click: () => toggleWindowVisibility(mainWindow),
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
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  trayInstance.setContextMenu(contextMenu);
}
