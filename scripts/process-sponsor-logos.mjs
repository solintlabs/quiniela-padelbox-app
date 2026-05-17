import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = '../quiniela-padelbox/public/partners';
fs.mkdirSync(outDir, { recursive: true });

async function processFromSvg(srcSvg, dest) {
  const svg = fs.readFileSync(srcSvg);
  await sharp(svg, { density: 600 })
    .resize({ width: 1000, withoutEnlargement: false })
    .trim()
    .png()
    .toFile(path.join(outDir, dest));
  console.log('OK (svg)', dest);
}

async function processPng(src, dest, opts = {}) {
  let pipe = sharp(src).resize({ width: 1000, withoutEnlargement: false });
  if (opts.trim) pipe = pipe.trim();
  await pipe.png().toFile(path.join(outDir, dest));
  console.log('OK (png)', dest);
}

// Vinny's: fondo rojo solido, el trim no detecta bien — uso PNG tal cual.
await processPng('../Logos/logo_vinnys.png', 'vinnys.png');

// Tacoberto: SVG viene con viewBox cortado en el lado derecho. Expandimos.
{
  const src = fs.readFileSync('../Logos/LOGO_TACOBERTO_1-01.svg', 'utf8');
  const expanded = src
    .replace(/width="816"/, 'width="2000"')
    .replace(/viewBox="0 0 816 1056"/, 'viewBox="-100 -100 2000 1300"');
  await sharp(Buffer.from(expanded), { density: 600 })
    .resize({ width: 1200, withoutEnlargement: false })
    .trim()
    .png()
    .toFile(path.join(outDir, 'tacoberto.png'));
  console.log('OK (svg-expanded) tacoberto.png');
}

// Solint: ya tiene transparencia, solo trim.
await processPng('../Logos/Solint_logotipo_transparent_for_dark_1x.png', 'solint.png', { trim: true });
