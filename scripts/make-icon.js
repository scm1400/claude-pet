const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'claude-mama.png');
const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  // macOS icon: 512x512
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, 'icon.png'));
  console.log('Written: build/icon.png');

  // Tray icon: 32x32 PNG (used at runtime for system tray)
  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, 'tray-icon.png'));
  console.log('Written: build/tray-icon.png');

  // Windows icon: ICO from 256x256 PNG
  const pngBuf = await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const ico = await pngToIco(pngBuf);
  fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
  console.log('Written: build/icon.ico');
}

main().catch(e => { console.error(e); process.exit(1); });
