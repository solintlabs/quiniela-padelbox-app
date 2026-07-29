import sharp from 'sharp';

/**
 * Iconos QuinielaBOX — la Q (anillo con cola) con un balón de fútbol dentro,
 * lima sobre #0A0A0A. MISMO dibujo que app/icon.svg del repo web: una sola
 * marca para web y app.
 *
 *   node scripts/gen-icons.mjs
 */

// El dibujo (sin fondo): anillo Q + cola + balón blanco con pentágono/costuras.
const MARK = `
  <g transform="translate(0 -1)">
    <circle cx="50" cy="49" r="27" fill="none" stroke="#B6FF3C" stroke-width="10"/>
    <line x1="62" y1="61" x2="78" y2="77" stroke="#B6FF3C" stroke-width="10" stroke-linecap="round"/>
    <circle cx="50" cy="49" r="16" fill="#FAFAFA"/>
    <polygon points="50,41.20 57.41,46.58 54.58,55.30 45.42,55.30 42.59,46.58" fill="#0A0A0A"/>
    <g stroke="#0A0A0A" stroke-width="2" stroke-linecap="round">
      <line x1="50" y1="41.20" x2="50" y2="37.40"/>
      <line x1="57.41" y1="46.58" x2="61.02" y2="45.41"/>
      <line x1="54.58" y1="55.30" x2="56.81" y2="58.37"/>
      <line x1="45.42" y1="55.30" x2="43.19" y2="58.37"/>
      <line x1="42.59" y1="46.58" x2="38.98" y2="45.41"/>
    </g>
  </g>`;

function svg({ background, scale = 1 }) {
  const inner =
    scale === 1
      ? MARK
      : `<g transform="translate(${(100 * (1 - scale)) / 2} ${(100 * (1 - scale)) / 2}) scale(${scale})">${MARK}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${
    background ? `<rect width="100" height="100" fill="${background}"/>` : ''
  }${inner}</svg>`;
}

async function render(markup, file) {
  await sharp(Buffer.from(markup), { density: 1200 })
    .resize(1024, 1024)
    .png()
    .toFile(file);
  console.log('✓', file);
}

// Icono de app (iOS exige opaco; el sistema redondea las esquinas solo).
await render(svg({ background: '#0A0A0A', scale: 0.92 }), 'assets/icon.png');
// Android adaptive: primer plano transparente, marca dentro de la zona segura.
await render(svg({ background: null, scale: 0.62 }), 'assets/adaptive-icon.png');
// Splash: marca sobre transparente (el fondo lo pone app.json: #0A0A0A).
await render(svg({ background: null, scale: 0.9 }), 'assets/splash-icon.png');
