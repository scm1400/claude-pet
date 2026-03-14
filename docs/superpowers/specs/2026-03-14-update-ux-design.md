# Update UX Flow Improvement

## Problem

When the user clicks "Check for Updates":
1. If an update exists: **no feedback at all** until download completes (could be minutes)
2. No download progress indication
3. "You are up to date!" message lacks version info
4. Update check logic is **duplicated** between `tray.ts` and `main.ts`
5. Existing `update-downloaded` handler strings are hardcoded English (not localized)

## Solution

Event-driven dialog chain providing feedback at every stage of the update lifecycle, with explicit download control to avoid race conditions.

## Architecture

### Key design decision: `autoDownload = false` for manual checks

The existing `initAutoUpdater()` sets `autoDownload = true` for background auto-updates. For manual checks, we temporarily disable `autoDownload` and call `downloadUpdate()` explicitly after showing the "update found" dialog. This prevents the race condition where download starts before the user sees any feedback.

### New: `checkForUpdatesManual()` in `auto-updater.ts`

Single exported function that handles the entire manual update check flow. Both `tray.ts` and `main.ts` call this instead of implementing their own logic.

**Flow:**

```
User clicks "Check for Updates"
  → Guard: if already checking, return (concurrency guard)
  → Guard: if !app.isPackaged, show dev mode message, return
  → Set autoDownload = false (prevent race)
  → result = autoUpdater.checkForUpdates()
  → Branch:
    A) No update → Dialog: "최신 버전입니다! (v1.1.0)" → restore autoDownload = true
    B) Update found → Dialog: "v1.2.0 업데이트를 다운로드합니다" [OK / Cancel]
      → User clicks OK → autoUpdater.downloadUpdate()
      → Download completes → update-downloaded handler shows restart prompt
      → restore autoDownload = true
    C) Error → Dialog: "업데이트 확인 실패: {error}" → restore autoDownload = true
```

### Localized `update-downloaded` handler

The existing `update-downloaded` handler in `initAutoUpdater()` uses hardcoded English strings. It will be updated to read the current locale from the store and use translation keys.

## Changes

### 1. `src/main/auto-updater.ts`

**Modify `initAutoUpdater()`:**
- Localize the `update-downloaded` dialog using `t()` and `getStore().get('locale')`
- Use `update_ready_title` and a new `update_ready_message` key

**Add `checkForUpdatesManual()`:**

```typescript
import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog } from 'electron';
import { getStore } from './ipc-handlers';
import { t, DEFAULT_LOCALE } from '../shared/i18n';
import { Locale } from '../shared/types';

let isManualChecking = false;

export async function checkForUpdatesManual(): Promise<void> {
  if (isManualChecking) return;
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', title: 'Claude Mama', message: 'Auto-update is not available in dev mode.' });
    return;
  }

  isManualChecking = true;
  const locale = getStore().get('locale', DEFAULT_LOCALE) as Locale;

  // Temporarily disable autoDownload to control timing
  autoUpdater.autoDownload = false;

  try {
    const result = await autoUpdater.checkForUpdates();

    if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Claude Mama',
        message: t(locale, 'update_up_to_date'),
        detail: `v${app.getVersion()}`,
      });
      return;
    }

    // Update found — ask user to download
    const newVersion = result.updateInfo.version;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Claude Mama',
      message: t(locale, 'update_downloading'),
      detail: `v${app.getVersion()} → v${newVersion}`,
      buttons: ['OK', 'Cancel'],
      defaultId: 0,
    });

    if (response === 0) {
      // User confirmed — start download
      // update-downloaded handler (in initAutoUpdater) will show restart prompt
      await autoUpdater.downloadUpdate();
    }
  } catch (err: any) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Claude Mama',
      message: t(locale, 'update_check_failed'),
      detail: err.message,
    });
  } finally {
    autoUpdater.autoDownload = true; // restore for background updates
    isManualChecking = false;
  }
}
```

### 2. `src/main/tray.ts` (lines 83-98)

Replace inline update logic with:
```typescript
click: () => { void checkForUpdatesManual(); },
```

Remove `autoUpdater` import (no longer needed directly).

### 3. `src/main/main.ts` (lines 291-306)

Replace inline update logic with:
```typescript
click: () => { void checkForUpdatesManual(); },
```

Remove `autoUpdater` import from main.ts (no longer needed directly).

### 4. `src/shared/i18n.ts`

Add new translation keys (all 4 locales):

| Key | EN | KO | JA | ZH |
|-----|----|----|----|----|
| `update_downloading` | Downloading update... | 업데이트 다운로드 중... | アップデートをダウンロード中... | 正在下载更新... |
| `update_check_failed` | Update check failed | 업데이트 확인 실패 | アップデートの確認に失敗しました | 检查更新失败 |
| `update_ready_title` | Update Ready | 업데이트 준비 완료 | アップデート準備完了 | 更新已准备就绪 |
| `update_ready_message` | v{version} is ready to install. Restart now? | v{version} 설치 준비 완료. 지금 재시작할까요? | v{version}のインストール準備ができました。今すぐ再起動しますか？ | v{version}已准备好安装。现在重启吗？ |

Existing keys kept: `update_up_to_date`, `tray_check_update`

## Non-Goals

- Custom progress bar window (over-engineering for this use case)
- In-app toast notifications (widget is transparent, complex to implement)
- Auto-update settings UI (not requested)
- Linux deb-specific update handling (electron-updater handles AppImage only on Linux)

## Acceptance Criteria

- [ ] Clicking "Check for Updates" immediately begins check (no stale UI)
- [ ] When up to date, dialog shows current version number
- [ ] When update found, user sees download confirmation with version transition info
- [ ] User can cancel the download at the confirmation dialog
- [ ] When download completes, localized restart prompt appears
- [ ] Error case shows localized error dialog
- [ ] All update-related strings translated in EN/KO/JA/ZH
- [ ] No duplicate update logic in tray.ts or main.ts
- [ ] Dev mode guard preserved (no update check in dev)
- [ ] Concurrent manual checks are prevented (isManualChecking guard)
- [ ] autoDownload restored to true after manual check completes
