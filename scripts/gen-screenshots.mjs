/**
 * Capturas para la ficha del App Store.
 *
 * Tamaño 1320×2868 (iPhone 6,9"), que es el que Apple pide hoy y del que
 * deriva el resto automáticamente.
 *
 * Son capturas DISEÑADAS: reproducen la interfaz real de la app (misma
 * paleta, misma estructura de pantallas y pestañas) sobre un fondo de marca
 * con un titular. Es el formato habitual en la App Store y está permitido
 * mientras represente lo que la app hace de verdad — que es el caso.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'store/screenshots');
mkdirSync(OUT, { recursive: true });

const W = 1320, H = 2868;
const C = {
  bg: '#0A0A0A', elev: '#141414', ink: '#FAFAFA', muted: '#A3A3A3',
  border: '#262626', accent: '#B6FF3C', accentFg: '#0A0A0A', success: '#4ADE80',
};

// Marco del teléfono dentro del lienzo
const PX = 110, PY = 760, PW = W - PX * 2, PH = H - PY - 150;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Cabecera de la captura: titular + subtítulo. */
function headline(title, sub) {
  const lines = title.split('\n');
  return `
    <text x="${W / 2}" y="330" text-anchor="middle" font-family="Helvetica" font-size="40" font-weight="700" fill="${C.accent}" letter-spacing="5">QUINIELABOX</text>
    ${lines.map((l, i) => `<text x="${W / 2}" y="${460 + i * 96}" text-anchor="middle" font-family="Helvetica" font-size="84" font-weight="800" fill="${C.ink}">${esc(l)}</text>`).join('')}
    <text x="${W / 2}" y="${470 + lines.length * 96}" text-anchor="middle" font-family="Helvetica" font-size="40" fill="${C.muted}">${esc(sub)}</text>`;
}

/** Barra de pestañas inferior, como la de la app. */
function tabbar(active) {
  const tabs = ['Inicio', 'Partidos', 'Ranking', 'Reglas', 'Perfil'];
  const y = PY + PH - 96;
  const w = PW / tabs.length;
  return `<rect x="${PX}" y="${y}" width="${PW}" height="96" fill="${C.elev}"/>
    <line x1="${PX}" y1="${y}" x2="${PX + PW}" y2="${y}" stroke="${C.border}" stroke-width="2"/>
    ${tabs.map((t, i) => {
      const cx = PX + w * i + w / 2;
      const on = t === active;
      return `<circle cx="${cx}" cy="${y + 34}" r="13" fill="none" stroke="${on ? C.accent : C.muted}" stroke-width="3"/>
        <text x="${cx}" y="${y + 74}" text-anchor="middle" font-family="Helvetica" font-size="22" font-weight="${on ? 700 : 400}" fill="${on ? C.accent : C.muted}">${t}</text>`;
    }).join('')}`;
}

function card(x, y, w, h, fill = C.elev) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${fill}" stroke="${C.border}" stroke-width="2"/>`;
}

function shell(inner, active) {
  return `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="58" fill="${C.bg}" stroke="${C.border}" stroke-width="3"/>
    ${inner}
    ${tabbar(active)}`;
}

/* ---------- Pantalla 1: Inicio con podio ---------- */
function screenPodium() {
  const x = PX + 40, w = PW - 80;
  const base = PY + 120;
  const steps = [
    { n: 2, h: 150, name: 'Ana R.', pts: '31' },
    { n: 1, h: 230, name: 'Carlos M.', pts: '34' },
    { n: 3, h: 110, name: 'Tú', pts: '28' },
  ];
  const colW = w / 3;
  const floor = base + 620;
  return shell(`
    <text x="${x}" y="${PY + 90}" font-family="Helvetica" font-size="30" font-weight="700" fill="${C.accent}" letter-spacing="4">QUINIELA</text>
    <text x="${x}" y="${PY + 150}" font-family="Helvetica" font-size="52" font-weight="800" fill="${C.ink}">Peña Los Amigos</text>
    <text x="${x}" y="${base + 160}" font-family="Helvetica" font-size="34" font-weight="700" fill="${C.ink}">El podio</text>
    ${steps.map((s, i) => {
      const cx = x + colW * i + colW / 2;
      const top = floor - s.h;
      const fill = s.n === 1 ? C.accent : C.elev;
      const txt = s.n === 1 ? C.accentFg : C.muted;
      return `<circle cx="${cx}" cy="${top - 120}" r="44" fill="${s.n === 1 ? C.accent : C.elev}" stroke="${C.border}" stroke-width="2"/>
        <text x="${cx}" y="${top - 106}" text-anchor="middle" font-family="Helvetica" font-size="40" font-weight="800" fill="${s.n === 1 ? C.accentFg : C.ink}">${s.name[0]}</text>
        <text x="${cx}" y="${top - 50}" text-anchor="middle" font-family="Helvetica" font-size="28" fill="${C.ink}">${s.name}</text>
        <text x="${cx}" y="${top - 16}" text-anchor="middle" font-family="Helvetica" font-size="26" fill="${C.muted}">${s.pts} pts</text>
        <rect x="${cx - colW / 2 + 16}" y="${top}" width="${colW - 32}" height="${s.h}" rx="14" fill="${fill}" stroke="${C.border}" stroke-width="2"/>
        <text x="${cx}" y="${top + s.h / 2 + 18}" text-anchor="middle" font-family="Helvetica" font-size="54" font-weight="800" fill="${txt}">${s.n}</text>`;
    }).join('')}
    ${card(x, floor + 60, w, 150)}
    <text x="${x + 40}" y="${floor + 125}" font-family="Helvetica" font-size="30" fill="${C.muted}">Tu posición</text>
    <text x="${x + 40}" y="${floor + 180}" font-family="Helvetica" font-size="44" font-weight="800" fill="${C.ink}">#3 · <tspan fill="${C.accent}">28</tspan> pts</text>
    <text x="${x}" y="${floor + 290}" font-family="Helvetica" font-size="34" font-weight="700" fill="${C.ink}">Próximos partidos</text>
    ${[['España', 'Italia', 'sáb 20:00'], ['Argentina', 'Brasil', 'dom 18:00']].map(([h, a, when], i) => {
      const yy = floor + 330 + i * 180;
      return `${card(x, yy, w, 150)}
        <text x="${x + 40}" y="${yy + 62}" font-family="Helvetica" font-size="34" font-weight="700" fill="${C.ink}">${h} <tspan fill="${C.muted}">vs</tspan> ${a}</text>
        <text x="${x + 40}" y="${yy + 110}" font-family="Helvetica" font-size="27" fill="${C.muted}">${when}</text>
        <rect x="${x + w - 210}" y="${yy + 40}" width="170" height="70" rx="16" fill="${C.accent}"/>
        <text x="${x + w - 125}" y="${yy + 86}" text-anchor="middle" font-family="Helvetica" font-size="30" font-weight="800" fill="${C.accentFg}">Jugar</text>`;
    }).join('')}
  `, 'Inicio');
}

/* ---------- Pantalla 2: Partidos con pronóstico ---------- */
function screenMatches() {
  const x = PX + 40, w = PW - 80;
  const rows = [
    ['España', 'Italia', 'sáb 20:00', true],
    ['Argentina', 'Brasil', 'dom 18:00', false],
    ['Francia', 'Portugal', 'dom 21:00', false],
  ];
  return shell(`
    <text x="${x}" y="${PY + 110}" font-family="Helvetica" font-size="52" font-weight="800" fill="${C.ink}">Partidos</text>
    ${rows.map(([h, a, when, open], i) => {
      const y = PY + 180 + i * 300;
      return `${card(x, y, w, 250)}
        <text x="${x + 40}" y="${y + 70}" font-family="Helvetica" font-size="36" font-weight="700" fill="${C.ink}">${h} <tspan fill="${C.muted}">vs</tspan> ${a}</text>
        <text x="${x + 40}" y="${y + 118}" font-family="Helvetica" font-size="28" fill="${C.muted}">${when}</text>
        <rect x="${x + 40}" y="${y + 150}" width="200" height="72" rx="16" fill="none" stroke="${C.border}" stroke-width="2"/>
        <text x="${x + 72}" y="${y + 198}" font-family="Helvetica" font-size="38" fill="${C.muted}">−</text>
        <text x="${x + 140}" y="${y + 198}" text-anchor="middle" font-family="Helvetica" font-size="38" font-weight="800" fill="${C.ink}">${open ? 2 : 1}</text>
        <text x="${x + 208}" y="${y + 198}" font-family="Helvetica" font-size="38" fill="${C.muted}">+</text>
        <text x="${x + 262}" y="${y + 198}" font-family="Helvetica" font-size="36" font-weight="800" fill="${C.muted}">–</text>
        <rect x="${x + 292}" y="${y + 150}" width="200" height="72" rx="16" fill="none" stroke="${C.border}" stroke-width="2"/>
        <text x="${x + 324}" y="${y + 198}" font-family="Helvetica" font-size="38" fill="${C.muted}">−</text>
        <text x="${x + 392}" y="${y + 198}" text-anchor="middle" font-family="Helvetica" font-size="38" font-weight="800" fill="${C.ink}">${open ? 1 : 0}</text>
        <text x="${x + 460}" y="${y + 198}" font-family="Helvetica" font-size="38" fill="${C.muted}">+</text>
        <rect x="${x + w - 230}" y="${y + 150}" width="190" height="72" rx="16" fill="${C.accent}"/>
        <text x="${x + w - 135}" y="${y + 198}" text-anchor="middle" font-family="Helvetica" font-size="32" font-weight="800" fill="${C.accentFg}">Guardar</text>`;
    }).join('')}
  `, 'Partidos');
}

/* ---------- Pantalla 3: Clasificación ---------- */
function screenRanking() {
  const x = PX + 40, w = PW - 80;
  const rows = [
    ['1', 'Carlos M.', '6', '34', false],
    ['2', 'Ana R.', '5', '31', false],
    ['3', 'Tú', '4', '28', true],
    ['4', 'Miguel P.', '3', '24', false],
    ['5', 'Lucía G.', '2', '21', false],
    ['6', 'Javier S.', '1', '17', false],
  ];
  return shell(`
    <text x="${x}" y="${PY + 110}" font-family="Helvetica" font-size="52" font-weight="800" fill="${C.ink}">Clasificación</text>
    ${card(x, PY + 160, w, rows.length * 110 + 20)}
    ${rows.map(([p, n, ex, pts, me], i) => {
      const y = PY + 190 + i * 110;
      return `${me ? `<rect x="${x + 4}" y="${y - 30}" width="${w - 8}" height="104" rx="18" fill="${C.accent}" fill-opacity="0.10"/>` : ''}
        <text x="${x + 40}" y="${y + 36}" font-family="Helvetica" font-size="32" fill="${C.muted}">${p}</text>
        <text x="${x + 110}" y="${y + 36}" font-family="Helvetica" font-size="34" fill="${me ? C.accent : C.ink}" font-weight="${me ? 700 : 400}">${n}</text>
        <text x="${x + w - 230}" y="${y + 36}" font-family="Helvetica" font-size="26" fill="${C.muted}">${ex} exactos</text>
        <text x="${x + w - 50}" y="${y + 36}" text-anchor="end" font-family="Helvetica" font-size="38" font-weight="800" fill="${C.ink}">${pts}</text>`;
    }).join('')}
  `, 'Ranking');
}

/* ---------- Pantalla 4: Mis quinielas ---------- */
function screenHub() {
  const x = PX + 40, w = PW - 80;
  const list = [
    ['P', 'Quiniela PADELBOX', 'Organizador', C.accent],
    ['L', 'Peña Los Amigos', 'Jugador', '#60A5FA'],
    ['O', 'Porra de la oficina', 'Jugador', '#FBBF24'],
  ];
  return shell(`
    <text x="${x}" y="${PY + 110}" font-family="Helvetica" font-size="52" font-weight="800" fill="${C.ink}">Tus quinielas</text>
    <text x="${x}" y="${PY + 165}" font-family="Helvetica" font-size="30" fill="${C.muted}">Elige a cuál quieres entrar.</text>
    ${list.map(([ini, name, role, col], i) => {
      const y = PY + 230 + i * 190;
      return `${card(x, y, w, 150)}
        <rect x="${x + 36}" y="${y + 36}" width="78" height="78" rx="20" fill="${col}" fill-opacity="0.18"/>
        <text x="${x + 75}" y="${y + 90}" text-anchor="middle" font-family="Helvetica" font-size="40" font-weight="800" fill="${col}">${ini}</text>
        <text x="${x + 140}" y="${y + 72}" font-family="Helvetica" font-size="36" font-weight="700" fill="${C.ink}">${name}</text>
        <text x="${x + 140}" y="${y + 115}" font-family="Helvetica" font-size="28" fill="${C.muted}">${role}</text>
        <text x="${x + w - 50}" y="${y + 92}" text-anchor="end" font-family="Helvetica" font-size="38" fill="${C.muted}">›</text>`;
    }).join('')}
    ${card(x, PY + 230 + list.length * 190 + 30, w, 130, C.bg)}
    <text x="${x + w / 2}" y="${PY + 230 + list.length * 190 + 110}" text-anchor="middle" font-family="Helvetica" font-size="36" font-weight="800" fill="${C.accent}">+ Crear una quiniela</text>
  `, 'Inicio');
}

/* ---------- Pantalla 5: Reglas ---------- */
function screenRules() {
  const x = PX + 40, w = PW - 80;
  const pts = [['Marcador exacto', '3'], ['Acertar el ganador', '1'], ['Acertar el campeón', '+25']];
  return shell(`
    <text x="${x}" y="${PY + 110}" font-family="Helvetica" font-size="52" font-weight="800" fill="${C.ink}">Reglas</text>
    ${card(x, PY + 160, w, 400)}
    <text x="${x + 40}" y="${PY + 230}" font-family="Helvetica" font-size="32" font-weight="700" fill="${C.ink}">Puntos</text>
    ${pts.map(([l, v], i) => `
      <text x="${x + 40}" y="${PY + 300 + i * 70}" font-family="Helvetica" font-size="32" fill="${C.muted}">${l}</text>
      <text x="${x + w - 50}" y="${PY + 300 + i * 70}" text-anchor="end" font-family="Helvetica" font-size="34" font-weight="800" fill="${C.accent}">${v}</text>`).join('')}
    ${card(x, PY + 600, w, 240)}
    <text x="${x + 40}" y="${PY + 670}" font-family="Helvetica" font-size="32" font-weight="700" fill="${C.ink}">Cuota</text>
    <text x="${x + 40}" y="${PY + 730}" font-family="Helvetica" font-size="44" font-weight="800" fill="${C.ink}">10 €</text>
    <text x="${x + 40}" y="${PY + 790}" font-family="Helvetica" font-size="26" fill="${C.muted}">La gestiona el organizador fuera de la app.</text>
    ${card(x, PY + 880, w, 260)}
    <text x="${x + 40}" y="${PY + 950}" font-family="Helvetica" font-size="32" font-weight="700" fill="${C.ink}">Premios</text>
    ${['1º — 60% del bote', '2º — 30%', '3º — 10%'].map((l, i) =>
      `<text x="${x + 40}" y="${PY + 1015 + i * 55}" font-family="Helvetica" font-size="30" fill="${C.muted}">${l}</text>`).join('')}
  `, 'Reglas');
}

const SHOTS = [
  ['01-podio', 'El podio de tu grupo', 'Clasificación en vivo, actualizada sola', screenPodium],
  ['02-partidos', 'Pronostica en\nsegundos', 'Los resultados y los puntos, automáticos', screenMatches],
  ['03-ranking', 'Quién va ganando', 'Desempate por marcadores exactos', screenRanking],
  ['04-quinielas', 'Todas tus\nquinielas', 'Club, peña y oficina en una sola app', screenHub],
  ['05-reglas', 'Tus reglas,\ntu bote', 'Tú decides cuánto vale cada acierto', screenRules],
];

for (const [name, title, sub, draw] of SHOTS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16210A"/><stop offset="45%" stop-color="${C.bg}"/><stop offset="100%" stop-color="#000"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    ${headline(title, sub)}
    ${draw()}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, `${name}.png`));
  console.log('✓', `${name}.png`);
}
console.log(`\n${SHOTS.length} capturas en store/screenshots (${W}×${H})`);
