import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { SkinConfig } from '../shared/types';
import { getStore } from './ipc-handlers';

const SKINS_DIR = path.join(app.getPath('userData'), 'skins');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];

function ensureSkinsDir(): void {
  if (!fs.existsSync(SKINS_DIR)) {
    fs.mkdirSync(SKINS_DIR, { recursive: true });
  }
}

function cleanupOldSkins(keepPaths: string[]): void {
  ensureSkinsDir();
  const files = fs.readdirSync(SKINS_DIR);
  for (const file of files) {
    const fullPath = path.join(SKINS_DIR, file);
    if (!keepPaths.includes(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    }
  }
}

export async function uploadSkinImage(mood?: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Character Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) return null;

  const stat = fs.statSync(srcPath);
  if (stat.size > MAX_FILE_SIZE) return null;

  ensureSkinsDir();
  const fileName = mood
    ? `skin-${mood}-${Date.now()}${ext}`
    : `skin-${Date.now()}${ext}`;
  const destPath = path.join(SKINS_DIR, fileName);
  fs.copyFileSync(srcPath, destPath);

  return destPath;
}

export function resetSkin(): void {
  const store = getStore();
  (store as any).set('skin', { mode: 'default' });
  cleanupOldSkins([]);
}

export function getSkinConfig(): SkinConfig {
  const store = getStore();
  return (store as any).get('skin', { mode: 'default' }) as SkinConfig;
}

export function saveSkinConfig(config: SkinConfig): void {
  const store = getStore();

  // Collect paths to keep
  const keepPaths: string[] = [];
  if (config.singleImagePath) keepPaths.push(config.singleImagePath);
  if (config.moodImages) {
    Object.values(config.moodImages).forEach((p) => { if (p) keepPaths.push(p); });
  }
  if (config.spritesheet?.imagePath) keepPaths.push(config.spritesheet.imagePath);

  cleanupOldSkins(keepPaths);
  (store as any).set('skin', config);
}
