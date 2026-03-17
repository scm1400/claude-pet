import { app, dialog, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { SkinConfig, SkinUploadResponse } from '../shared/types';
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

const VALID_MOODS = ['happy', 'playful', 'sleepy', 'worried', 'bored', 'confused', 'sleeping'];

export async function uploadSkinImage(mood?: string): Promise<SkinUploadResponse> {
  if (mood && !VALID_MOODS.includes(mood)) return { ok: false, error: 'invalid_format' };

  const result = await dialog.showOpenDialog({
    title: 'Select Character Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) return { ok: false, error: 'invalid_format' };

  const stat = fs.statSync(srcPath);
  if (stat.size > MAX_FILE_SIZE) return { ok: false, error: 'file_too_large' };

  ensureSkinsDir();
  const fileName = mood
    ? `skin-${mood}-${Date.now()}${ext}`
    : `skin-${Date.now()}${ext}`;
  const destPath = path.join(SKINS_DIR, fileName);
  fs.copyFileSync(srcPath, destPath);

  const image = nativeImage.createFromPath(destPath);
  const size = image.getSize();

  if (size.width === 0 || size.height === 0) {
    try { fs.unlinkSync(destPath); } catch { /* ignore */ }
    return { ok: false, error: 'invalid_format' };
  }

  return { ok: true, path: destPath, width: size.width, height: size.height };
}

export function resetSkin(): void {
  const store = getStore();
  (store as any).set('skin', { mode: 'default' });
  cleanupOldSkins([]);
}

export function getSkinConfig(): SkinConfig {
  const store = getStore();
  const config = (store as any).get('skin', { mode: 'default' }) as SkinConfig;

  // Normalize spritesheet config for backward compatibility
  if (config.spritesheet) {
    const ss = config.spritesheet;
    if (!ss.imageWidth && ss.frameWidth && ss.columns) {
      ss.imageWidth = ss.frameWidth * ss.columns;
    }
    if (!ss.imageHeight && ss.frameHeight && ss.rows) {
      ss.imageHeight = ss.frameHeight * ss.rows;
    }
    // Migrate old { col, row } moodMap to { startFrame, endFrame, fps }
    if (ss.moodMap) {
      for (const [key, val] of Object.entries(ss.moodMap)) {
        const v = val as any;
        if (v && typeof v.col === 'number' && typeof v.startFrame !== 'number') {
          (ss.moodMap as any)[key] = { startFrame: v.row * ss.columns + v.col, endFrame: v.row * ss.columns + v.col, fps: 8 };
        }
      }
    }
  }

  return config;
}

export function saveSkinConfig(config: SkinConfig): void {
  const store = getStore();

  // Validate spritesheet dimensions
  if (config.spritesheet) {
    config.spritesheet.columns = Math.max(1, Math.min(16, config.spritesheet.columns || 1));
    config.spritesheet.rows = Math.max(1, Math.min(16, config.spritesheet.rows || 1));
  }

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
