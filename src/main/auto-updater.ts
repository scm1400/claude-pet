import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app, dialog } from 'electron';
import { getStore } from './ipc-handlers';
import { t, DEFAULT_LOCALE } from '../shared/i18n';
import { Locale } from '../shared/types';

let isManualChecking = false;

export function initAutoUpdater(): void {
  // Don't check for updates in development
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[auto-updater] Update available: v${info.version}`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[auto-updater] Update downloaded: v${info.version}`);

    const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;
    const win = BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(win ?? ({} as BrowserWindow), {
      type: 'info',
      title: t(locale, 'update_ready_title'),
      message: t(locale, 'update_ready_message').replace('{version}', info.version),
      buttons: [t(locale, 'update_btn_restart'), t(locale, 'update_btn_later')],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.log(`[auto-updater] Error: ${err.message}`);
  });

  // Check for updates after a short delay to avoid slowing startup
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log(`[auto-updater] Check failed: ${err.message}`);
    });
  }, 10_000);
}

export async function checkForUpdatesManual(): Promise<void> {
  if (isManualChecking) return;
  if (!app.isPackaged) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Claude Pet',
      message: 'Auto-update is not available in dev mode.',
    });
    return;
  }

  isManualChecking = true;
  const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;

  // Temporarily disable autoDownload to prevent race condition
  autoUpdater.autoDownload = false;

  try {
    const result = await autoUpdater.checkForUpdates();

    if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Claude Pet',
        message: t(locale, 'update_up_to_date'),
        detail: `v${app.getVersion()}`,
      });
      return;
    }

    // Update found — ask user to confirm download
    const newVersion = result.updateInfo.version;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Claude Pet',
      message: t(locale, 'update_found'),
      detail: `v${app.getVersion()} → v${newVersion}`,
      buttons: [t(locale, 'update_btn_download'), t(locale, 'update_btn_cancel')],
      defaultId: 0,
    });

    if (response === 0) {
      await autoUpdater.downloadUpdate();
      // update-downloaded handler will show restart prompt
    }
  } catch (err: any) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Claude Pet',
      message: t(locale, 'update_check_failed'),
      detail: err.message,
    });
  } finally {
    autoUpdater.autoDownload = true;
    isManualChecking = false;
  }
}
