/**
 * Genera los iconos para iOS, Android y splash desde el logo PADELBOX.
 *
 * Outputs:
 *   assets/icon.png          1024x1024 sin transparencia (App Store)
 *   assets/adaptive-icon.png 1024x1024 con padding (Android adaptive)
 *   assets/splash-icon.png   400x400 transparente (splash centrado)
 *
 * Uso: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'logo-blanco.png');
const OUT = path.join(ROOT, 'assets');

const BG = '#0A0A0A';

async function buildIcon(size, outName, padding) {
  // Calcula tamaño del logo centrado con padding
  const logoSize = Math.round(size * (1 - padding * 2));
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, outName));
  console.log(`✓ ${outName} (${size}x${size})`);
}

async function buildAdaptiveIcon() {
  // Para Android: el foreground debe tener safe-zone (66% del centro)
  // Solo el logo, sin fondo (Android añade el adaptiveIcon.backgroundColor)
  const size = 1024;
  const logoSize = Math.round(size * 0.55);
  const logo = await sharp(SOURCE).resize(logoSize, logoSize, { fit: 'inside' }).toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'adaptive-icon.png'));
  console.log(`✓ adaptive-icon.png (${size}x${size} transparente)`);
}

async function buildSplash() {
  const size = 600;
  const logoSize = Math.round(size * 0.85);
  const logo = await sharp(SOURCE).resize(logoSize, null, { fit: 'inside' }).toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));
  console.log(`✓ splash-icon.png (${size}x${size} transparente)`);
}

async function main() {
  await buildIcon(1024, 'icon.png', 0.18);
  await buildAdaptiveIcon();
  await buildSplash();
  console.log('Iconos generados en assets/');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
