const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'docs', 'images', 'character.png');
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

  // NSIS installer sidebar: 164x314 BMP
  // Pink gradient background with character centered in lower portion
  const sidebarW = 164, sidebarH = 314;
  const charSize = 120;
  const charBuf = await sharp(src)
    .resize(charSize, charSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create gradient background (top: #fce7f3, bottom: #fff1f2)
  const sidebarSvg = `<svg width="${sidebarW}" height="${sidebarH}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fce7f3"/>
        <stop offset="100%" stop-color="#fff1f2"/>
      </linearGradient>
    </defs>
    <rect width="${sidebarW}" height="${sidebarH}" fill="url(#bg)"/>
    <text x="${sidebarW / 2}" y="40" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9ca3af">CLAUDE</text>
    <text x="${sidebarW / 2}" y="58" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#9ca3af">MAMA</text>
  </svg>`;

  await sharp(Buffer.from(sidebarSvg))
    .composite([{
      input: charBuf,
      left: Math.round((sidebarW - charSize) / 2),
      top: Math.round(sidebarH / 2 - charSize / 2 + 20),
    }])
    .removeAlpha()
    .toFile(path.join(outDir, 'installerSidebar.bmp'));
  console.log('Written: build/installerSidebar.bmp');

  // NSIS installer header: 150x57 BMP
  const headerW = 150, headerH = 57;
  const headerCharSize = 40;
  const headerCharBuf = await sharp(src)
    .resize(headerCharSize, headerCharSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const headerSvg = `<svg width="${headerW}" height="${headerH}">
    <rect width="${headerW}" height="${headerH}" fill="#fce7f3"/>
  </svg>`;

  await sharp(Buffer.from(headerSvg))
    .composite([{
      input: headerCharBuf,
      left: Math.round(headerW - headerCharSize - 8),
      top: Math.round((headerH - headerCharSize) / 2),
    }])
    .removeAlpha()
    .toFile(path.join(outDir, 'installerHeader.bmp'));
  console.log('Written: build/installerHeader.bmp');

  // macOS DMG background: 540x380
  const dmgW = 540, dmgH = 380;
  const dmgCharSize = 140;
  const dmgCharBuf = await sharp(src)
    .resize(dmgCharSize, dmgCharSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const dmgSvg = `<svg width="${dmgW}" height="${dmgH}">
    <defs>
      <linearGradient id="dmgbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fce7f3"/>
        <stop offset="50%" stop-color="#fdf2f8"/>
        <stop offset="100%" stop-color="#fff1f2"/>
      </linearGradient>
    </defs>
    <rect width="${dmgW}" height="${dmgH}" fill="url(#dmgbg)"/>
    <text x="${dmgW / 2}" y="46" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#9ca3af" letter-spacing="0.1em">CLAUDE MAMA</text>
  </svg>`;

  await sharp(Buffer.from(dmgSvg))
    .composite([{
      input: dmgCharBuf,
      left: Math.round((dmgW - dmgCharSize) / 2),
      top: Math.round(dmgH / 2 - dmgCharSize / 2 + 10),
    }])
    .png()
    .toFile(path.join(outDir, 'dmg-background.png'));
  console.log('Written: build/dmg-background.png');
}

main().catch(e => { console.error(e); process.exit(1); });
