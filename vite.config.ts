import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy static assets that are loaded by main process (not bundled by Vite)
function copyMainProcessAssets() {
  return {
    name: 'copy-main-process-assets',
    closeBundle() {
      // Copy share card template
      const tmplSrc = path.resolve(__dirname, 'src/renderer/share-card-template');
      const tmplDest = path.resolve(__dirname, 'dist/renderer/share-card-template');
      fs.mkdirSync(tmplDest, { recursive: true });
      for (const file of fs.readdirSync(tmplSrc)) {
        fs.copyFileSync(path.join(tmplSrc, file), path.join(tmplDest, file));
      }

      // Copy character image with original name (main process reads it by exact name)
      const assetsDest = path.resolve(__dirname, 'dist/renderer/assets');
      fs.mkdirSync(assetsDest, { recursive: true });
      fs.copyFileSync(
        path.resolve(__dirname, 'src/renderer/assets/claude-pet.png'),
        path.join(assetsDest, 'claude-pet.png'),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMainProcessAssets()],
  // Set root to renderer dir so index.html is the entry and output is flat
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    assetsInlineLimit: 10240, // Inline small assets as base64 (fixes Electron ASAR + new URL() issue)
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
