import { request } from './api';

/**
 * Cliente de /api/saas/* — las quinielas multi-tenant de QuinielaBOX.
 * Usa el MISMO JWT que el resto de la app (requireUserApi del backend acepta
 * el Bearer). Tipos espejo de los payloads del repo web.
 */

// ---- Config (planes + URLs hacia la web) ----

export type SaasPlanId = 'FREE' | 'PRO' | 'CUSTOM';
export type SaasRole = 'OWNER' | 'ADMIN' | 'PLAYER';

export interface SaasPlanLimits {
  /** null = sin límite. */
  maxPlayers: number | null;
  maxCompetitions: number | null;
  espnCatalog: boolean;
  removeBranding: boolean;
  showsAds: boolean;
}

export interface SaasPlan {
  id: SaasPlanId;
  name: string;
  priceUsd: number | null;
  period: 'mes' | 'torneo' | null;
  tagline: string;
  season: { priceUsd: number; months: number; label: string; note: string } | null;
  limits: SaasPlanLimits;
}

export interface SaasConfig {
  plans: SaasPlan[];
  upgrade: {
    /** Kill switch remoto: si Apple/Google objetan el link de pago se apaga sin build nuevo. */
    enabled: boolean;
    /** Panel del organizador en la web ({slug} se sustituye aquí). */
    urlTemplate: string;
  };
  /** Página pública con la cuota y cómo pagar el bote ({slug} se sustituye aquí). */
  inscriptionUrlTemplate: string;
}

/** Fallbacks por si /api/saas/config no responde: la app nunca se queda sin URLs. */
export const FALLBACK_SITE = 'https://www.quinielabox.com';
export const FALLBACK_CONFIG: SaasConfig = {
  plans: [],
  upgrade: { enabled: false, urlTemplate: `${FALLBACK_SITE}/saas/{slug}/panel` },
  inscriptionUrlTemplate: `${FALLBACK_SITE}/saas/{slug}/inscripcion`,
};

export function fillSlug(template: string, slug: string): string {
  return template.replace('{slug}', encodeURIComponent(slug));
}

// ---- Mis quinielas ----

export interface SaasTenantSummary {
  slug: string;
  name: string;
  accentColor: string | null;
  logoUrl: string | null;
  plan: SaasPlanId;
  role: SaasRole;
  hasPaid: boolean;
}

// ---- Payload de juego (una llamada = la pantalla entera) ----

export interface SaasFixtureVM {
  id: string;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  kickoff: string;
  round: string | null;
  closed: boolean;
  homeScore: number | null;
  awayScore: number | null;
  myHome: number | null;
  myAway: number | null;
  points: number | null;
}

export interface SaasRankingRow {
  membershipId: string;
  position: number;
  displayName: string;
  points: number;
  exact: number;
  isMe: boolean;
  champion: { name: string; logoUrl: string | null; correct: boolean } | null;
}

export interface SaasPaymentMethod {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  fields: Array<{ label: string; value: string }>;
}

export interface SaasPlayPayload {
  tenant: {
    slug: string;
    name: string;
    accentColor: string | null;
    logoUrl: string | null;
    plan: SaasPlanId;
    /** Presente desde el backend 2026-08-01. */
    description?: string | null;
    prizesText: string | null;
    rulesText: string | null;
    entryFee: string | null;
    paymentInfo: string | null;
  };
  me: {
    role: SaasRole;
    hasPaid: boolean;
    /** Presentes desde el backend 2026-07-29; opcionales por si el server es viejo. */
    membershipId?: string;
    displayName?: string | null;
  };
  canPredict: boolean;
  /** Se sigue recibiendo por compatibilidad, pero la app YA NO lo muestra:
   *  el bote se paga fuera, en la página pública de inscripción (regla Apple). */
  paymentMethods: SaasPaymentMethod[];
  competition: {
    id: string;
    name: string;
    status: 'OPEN' | 'LOCKED' | 'FINISHED';
    pointsSummary: string[];
    pointsBonus: number;
    /** Presentes desde el backend 2026-07-30 (pestaña Admin). */
    lockOffsetMin?: number;
    showTrendPreClose?: boolean;
    points?: {
      exact: number;
      winner: number;
      goalDiff: number;
      teamScore: number;
      drawBonus: number;
    };
  } | null;
  fixtures?: SaasFixtureVM[];
  ranking?: SaasRankingRow[];
  champion?: {
    bonus: number;
    teams: Array<{ id: string; name: string; logoUrl: string | null }>;
    myTeamId: string | null;
    locked: boolean;
    winnerTeamId: string | null;
  } | null;
}

// ---- Social ----

export interface SaasFixtureEntries {
  fixture: {
    id: string;
    home: string;
    away: string;
    homeLogo: string | null;
    awayLogo: string | null;
    kickoff: string;
    homeScore: number | null;
    awayScore: number | null;
    closed: boolean;
  };
  revealed: boolean;
  entries: Array<{
    id: string;
    membershipId: string;
    name: string;
    homeScore: number;
    awayScore: number;
    points: number | null;
    isMe: boolean;
  }>;
  trend: { home: number; draw: number; away: number } | null;
}

export interface SaasPlayerProfile {
  player: {
    membershipId: string;
    name: string;
    joinedAt: string;
    hasPaid: boolean;
    isMe: boolean;
  };
  stats: { points: number; total: number; exact: number };
  hiddenCount: number;
  predictions: Array<{
    id: string;
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
    points: number | null;
  }>;
}

// ---- Cliente ----

export const saasApi = {
  config: () => request<SaasConfig>('/api/saas/config'),
  tenants: () => request<{ tenants: SaasTenantSummary[] }>('/api/saas/tenants'),
  createTenant: (name: string, accentColor?: string, logoDataUrl?: string, description?: string) =>
    request<{ ok: true; tenant: { id: string; slug: string; name: string }; panelUrl: string }>(
      '/api/saas/tenants',
      { method: 'POST', body: JSON.stringify({ name, accentColor, logoDataUrl, description }) },
    ),
  /** Unirse a una quiniela con su código (el identificador del link). */
  join: (code: string) =>
    request<{ ok: true; role: SaasRole; hasPaid: boolean; url: string }>(
      `/api/saas/${encodeURIComponent(code.trim().toLowerCase())}/join`,
      { method: 'POST' },
    ),
  play: (slug: string) => request<SaasPlayPayload>(`/api/saas/${slug}/play`),
  submitEntry: (slug: string, fixtureId: string, homeScore: number, awayScore: number) =>
    request<{ ok: true }>(`/api/saas/${slug}/entries`, {
      method: 'POST',
      body: JSON.stringify({ fixtureId, homeScore, awayScore }),
    }),
  setChampion: (slug: string, competitionId: string, teamId: string) =>
    request<{ ok: true }>(`/api/saas/${slug}/competitions/${competitionId}/champion`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),
  rename: (slug: string, displayName: string) =>
    request<{ ok: true; displayName: string | null }>(`/api/saas/${slug}/me`, {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    }),
  fixtureEntries: (slug: string, fixtureId: string) =>
    request<SaasFixtureEntries>(`/api/saas/${slug}/fixtures/${fixtureId}/entries`),
  player: (slug: string, membershipId: string) =>
    request<SaasPlayerProfile>(`/api/saas/${slug}/players/${membershipId}`),

  // ---- Pestaña Admin (solo OWNER/ADMIN; el backend lo verifica) ----
  players: (slug: string) => request<{ players: SaasAdminPlayer[] }>(`/api/saas/${slug}/players`),
  patchPlayer: (slug: string, membershipId: string, patch: { hasPaid?: boolean; role?: 'ADMIN' | 'PLAYER' }) =>
    request<{ ok: true }>(`/api/saas/${slug}/players`, {
      method: 'PATCH',
      body: JSON.stringify({ membershipId, ...patch }),
    }),
  syncCompetition: (slug: string, competitionId: string) =>
    request<{ ok?: boolean }>(`/api/saas/${slug}/competitions/${competitionId}/sync`, {
      method: 'POST',
    }),
  recomputeCompetition: (slug: string, competitionId: string) =>
    request<{ entriesScored?: number }>(`/api/saas/${slug}/competitions/${competitionId}/recompute`, {
      method: 'POST',
    }),
  patchCompetition: (
    slug: string,
    competitionId: string,
    patch: {
      showTrendPreClose?: boolean;
      lockOffsetMin?: number;
      pointsExact?: number;
      pointsWinner?: number;
      pointsGoalDiff?: number;
      pointsTeamScore?: number;
      pointsDrawBonus?: number;
      pointsBonus?: number;
    },
  ) =>
    request<{ ok: true }>(`/api/saas/${slug}/competitions/${competitionId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  patchTenant: (
    slug: string,
    patch: {
      logoDataUrl?: string;
      description?: string | null;
      rulesText?: string | null;
      prizesText?: string | null;
      entryFee?: string | null;
      paymentInfo?: string | null;
    },
  ) =>
    request<{ tenant: { logoUrl: string | null } }>(`/api/saas/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  /** URL de un solo uso que abre el navegador YA logueado (puente app→web). */
  bridge: (next: string) =>
    request<{ url: string }>('/api/auth/bridge', {
      method: 'POST',
      body: JSON.stringify({ next }),
    }),
};

export interface SaasAdminPlayer {
  membershipId: string;
  role: SaasRole;
  hasPaid: boolean;
  paidAt: string | null;
  paidNote: string | null;
  joinedAt: string;
  email: string | null;
  name: string;
}
