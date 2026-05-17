// Generate app icons from the Quiniela Club "Q" mark.
// Usage: node scripts/generate-icons.mjs
//
// Renders 3 PNGs into ./assets:
//   - icon.png            (1024x1024 full-bleed, dark bg + Q)        iOS app icon
//   - adaptive-icon.png   (1024x1024 transparent, Q centered)        Android foreground
//   - splash-icon.png     (1024x1024 transparent, Q centered)        Splash mark
//
// Existing files are backed up to ./assets/.backup/ on first run.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../assets');
const backup = path.resolve(assets, '.backup');

const LIME = '#b2e030';

// iOS app icon: full-bleed square. iOS rounds corners itself.
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.42" r="0.95">
      <stop offset="0%" stop-color="#171717"/>
      <stop offset="100%" stop-color="#060606"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${LIME}" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="${LIME}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${LIME}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="500" r="400" fill="url(#glow)"/>
  <g stroke="${LIME}" stroke-width="100" stroke-linecap="round" fill="none">
    <circle cx="490" cy="480" r="240"/>
    <line x1="620" y1="610" x2="830" y2="820"/>
  </g>
</svg>`;

// Android adaptive foreground: transparent. Content must fit Android's safe zone (~66% of canvas).
// Extra viewBox padding shrinks the Q within the 1024x1024 output.
const adaptiveSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 1384 1384">
  <g stroke="${LIME}" stroke-width="100" stroke-linecap="round" fill="none">
    <circle cx="490" cy="480" r="240"/>
    <line x1="620" y1="610" x2="830" y2="820"/>
  </g>
</svg>`;

// Splash mark: transparent Q on whatever splash bg Expo uses.
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 1184 1184">
  <g stroke="${LIME}" stroke-width="100" stroke-linecap="round" fill="none">
    <circle cx="490" cy="480" r="240"/>
    <line x1="620" y1="610" x2="830" y2="820"/>
  </g>
</svg>`;

async function render(svg, outName) {
  const out = path.join(assets, outName);
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${outName}`);
}

async function main() {
  fs.mkdirSync(backup, { recursive: true });

  for (const f of ['icon.png', 'adaptive-icon.png', 'splash-icon.png']) {
    const src = path.join(assets, f);
    const dst = path.join(backup, f);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      console.log(`↪ backup → assets/.backup/${f}`);
    }
  }

  await render(iconSvg, 'icon.png');
  await render(adaptiveSvg, 'adaptive-icon.png');
  await render(splashSvg, 'splash-icon.png');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
