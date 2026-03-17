// eslint-disable-next-line @typescript-eslint/no-require-imports
const AutoLaunch = require('auto-launch') as new (opts: { name: string; path?: string }) => {
  enable(): Promise<void>;
  disable(): Promise<void>;
  isEnabled(): Promise<boolean>;
};

let petAutoLaunch: InstanceType<typeof AutoLaunch> | null = null;

function getAutoLaunch(): InstanceType<typeof AutoLaunch> | null {
  if (petAutoLaunch) return petAutoLaunch;
  try {
    petAutoLaunch = new AutoLaunch({ name: 'Claude Pet' });
    return petAutoLaunch;
  } catch {
    // Fails in dev/non-packaged mode — no Electron app path available
    return null;
  }
}

export async function updateAutoLaunch(enabled: boolean): Promise<void> {
  try {
    const al = getAutoLaunch();
    if (!al) return;
    const isEnabled = await al.isEnabled();
    if (enabled && !isEnabled) {
      await al.enable();
    } else if (!enabled && isEnabled) {
      await al.disable();
    }
  } catch (err) {
    console.warn('[auto-launch] failed to update:', err);
  }
}

export async function syncAutoLaunch(autoStart: boolean): Promise<void> {
  await updateAutoLaunch(autoStart);
}
