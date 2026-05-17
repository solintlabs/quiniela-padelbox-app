/**
 * Draw oficial del Mundial 2026 (12 grupos x 4 equipos).
 * Fuente: FIFA Final Draw (5 dic 2025, Kennedy Center, Washington DC).
 *
 * ESPN no expone el grupo (A..L) en su scoreboard, asi que lo derivamos
 * desde el nombre del equipo via lookupGroupForTeam().
 *
 * Si una seleccion no aparece en este mapping, lookupGroupForTeam() devuelve
 * null y la match queda sin grupo (se podra editar a mano desde admin).
 */

export const FIFA_2026_GROUPS: Record<string, readonly string[]> = {
  A: ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curacao', "Côte d'Ivoire", 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
} as const;

/** Normaliza un nombre de seleccion: minusculas, sin acentos, sin puntuacion. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Alias para acomodar variaciones de ESPN vs FIFA. Clave = forma normalizada
// que puede devolver ESPN; valor = forma canonica que aparece en FIFA_2026_GROUPS.
const ALIASES: Record<string, string> = {
  // Korea
  southkorea: 'Korea Republic',
  korea: 'Korea Republic',
  republicofkorea: 'Korea Republic',
  korearepublic: 'Korea Republic',
  // Czechia
  czechrepublic: 'Czechia',
  czech: 'Czechia',
  // USA
  usa: 'United States',
  unitedstatesofamerica: 'United States',
  us: 'United States',
  // Türkiye
  turkey: 'Türkiye',
  turkiye: 'Türkiye',
  // Bosnia
  bosniaherzegovina: 'Bosnia and Herzegovina',
  bosnia: 'Bosnia and Herzegovina',
  bosniaandherzegovina: 'Bosnia and Herzegovina',
  // Côte d'Ivoire
  cotedivoire: "Côte d'Ivoire",
  ivorycoast: "Côte d'Ivoire",
  // Iran
  irislamicrepublicofiran: 'Iran',
  islamicrepublicofiran: 'Iran',
  iriniran: 'Iran',
  // DR Congo
  drcongo: 'DR Congo',
  democraticrepublicofthecongo: 'DR Congo',
  congodr: 'DR Congo',
  congo: 'DR Congo',
  // Cape Verde
  capeverdeislands: 'Cape Verde',
  // Curacao
  curacao: 'Curacao',
  // Saudi Arabia
  ksa: 'Saudi Arabia',
};

// Indice precomputado: nombre normalizado -> letra de grupo (A..L)
const TEAM_TO_GROUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [group, teams] of Object.entries(FIFA_2026_GROUPS)) {
    for (const team of teams) {
      map.set(normalize(team), group);
    }
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const group = map.get(normalize(canonical));
    if (group) map.set(alias, group);
  }
  return map;
})();

/** Devuelve la letra de grupo (A..L) para un nombre de seleccion, o null. */
export function lookupGroupForTeam(teamName: string): string | null {
  if (!teamName) return null;
  return TEAM_TO_GROUP.get(normalize(teamName)) ?? null;
}

/**
 * Para una match con dos equipos, devuelve la letra de grupo si ambos pertenecen
 * al mismo grupo. Si solo uno se encuentra, usa ese. Si discrepa, devuelve null.
 */
export function inferGroupFromMatch(homeTeam: string, awayTeam: string): string | null {
  const a = lookupGroupForTeam(homeTeam);
  const b = lookupGroupForTeam(awayTeam);
  if (a && b) return a === b ? a : null;
  return a ?? b ?? null;
}
