import type { ApiMatch } from './api';

export interface TeamStanding {
  team: string;
  flag: string | null;
  pj: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface GroupStanding {
  group: string;
  matchesTotal: number;
  matchesPredicted: number;
  standings: TeamStanding[];
}

const MUNDIAL_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

/**
 * Calcula la tabla predicha de cada grupo del Mundial 2026
 * a partir de las predicciones del usuario en los partidos de fase de grupos.
 * Partidos sin predicción no cuentan (PJ no aumenta para esos equipos).
 */
export function computeGroupStandings(matches: ApiMatch[]): GroupStanding[] {
  const byGroup = new Map<string, ApiMatch[]>();
  for (const m of matches) {
    if (m.stage !== 'GROUP' || !m.group || !MUNDIAL_GROUPS.includes(m.group)) continue;
    if (!byGroup.has(m.group)) byGroup.set(m.group, []);
    byGroup.get(m.group)!.push(m);
  }

  const result: GroupStanding[] = [];
  for (const group of MUNDIAL_GROUPS) {
    const list = byGroup.get(group) ?? [];
    if (list.length === 0) continue;

    const teams = new Map<string, TeamStanding>();
    const ensure = (name: string, flag: string | null) => {
      if (!teams.has(name)) {
        teams.set(name, { team: name, flag, pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
      }
    };

    let predicted = 0;
    for (const m of list) {
      ensure(m.homeTeam, m.homeFlag);
      ensure(m.awayTeam, m.awayFlag);

      const pred = m.predictions?.[0];
      if (!pred) continue;
      predicted++;

      const h = teams.get(m.homeTeam)!;
      const a = teams.get(m.awayTeam)!;
      h.pj++; a.pj++;
      h.gf += pred.homeScore; h.ga += pred.awayScore;
      a.gf += pred.awayScore; a.ga += pred.homeScore;

      if (pred.homeScore > pred.awayScore) {
        h.w++; h.pts += 3; a.l++;
      } else if (pred.homeScore < pred.awayScore) {
        a.w++; a.pts += 3; h.l++;
      } else {
        h.d++; a.d++;
        h.pts++; a.pts++;
      }
    }

    for (const t of teams.values()) t.gd = t.gf - t.ga;

    const standings = [...teams.values()].sort((x, y) => {
      if (y.pts !== x.pts) return y.pts - x.pts;
      if (y.gd !== x.gd) return y.gd - x.gd;
      if (y.gf !== x.gf) return y.gf - x.gf;
      return x.team.localeCompare(y.team);
    });

    result.push({
      group,
      matchesTotal: list.length,
      matchesPredicted: predicted,
      standings,
    });
  }

  return result;
}
