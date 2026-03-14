import path from 'path';
import { Tray, Menu, nativeImage, BrowserWindow, app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { showSettingsWindow } from './settings-window';
import { generateShareCard } from './share-card';
import { getStore } from './ipc-handlers';
import { t, DEFAULT_LOCALE } from '../shared/i18n';
import { Locale, MamaSettings } from '../shared/types';

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
  const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Mama' : 'Show Mama',
      click: () => toggleWindowVisibility(mainWindow),
    },
    {
      label: t(locale, 'always_on_top'),
      type: 'checkbox',
      checked: mainWindow.isAlwaysOnTop(),
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
        getStore().set('alwaysOnTop' as keyof MamaSettings, menuItem.checked);
      },
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
      click: async () => {
        if (!app.isPackaged) {
          dialog.showMessageBox({ type: 'info', title: 'Claude Mama', message: 'Auto-update is not available in dev mode.' });
          return;
        }
        try {
          const result = await autoUpdater.checkForUpdates();
          if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
            dialog.showMessageBox({ type: 'info', title: 'Claude Mama', message: t(locale, 'update_up_to_date') });
          }
        } catch (err: any) {
          dialog.showMessageBox({ type: 'error', title: 'Claude Mama', message: `Update check failed: ${err.message}` });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  trayInstance.setContextMenu(contextMenu);
}
