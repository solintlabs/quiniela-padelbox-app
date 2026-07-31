import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  FALLBACK_CONFIG,
  saasApi,
  type SaasConfig,
  type SaasPlayPayload,
} from '@/lib/saas-api';
import { colors } from '@/lib/theme';

/**
 * Estado compartido de UNA quiniela SaaS para todas sus pestañas (tab bar).
 * Una sola llamada a /play alimenta Inicio/Partidos/Ranking/Reglas/Perfil/
 * Admin; cada pestaña puede pedir reload() (guardar pronóstico, pull to
 * refresh…) y todas ven el dato nuevo.
 */
interface TenantState {
  slug: string;
  data: SaasPlayPayload | null;
  config: SaasConfig;
  error: string | null;
  refreshing: boolean;
  /** Color de acento del tenant (o el lima por defecto mientras carga). */
  accent: string;
  isOrganizer: boolean;
  reload: () => Promise<void>;
  refresh: () => void;
}

const TenantContext = createContext<TenantState | null>(null);

export function TenantProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [data, setData] = useState<SaasPlayPayload | null>(null);
  const [config, setConfig] = useState<SaasConfig>(FALLBACK_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [play, cfg] = await Promise.all([
        saasApi.play(slug),
        saasApi.config().catch(() => FALLBACK_CONFIG),
      ]);
      setData(play);
      setConfig(cfg);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la quiniela');
    } finally {
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<TenantState>(
    () => ({
      slug,
      data,
      config,
      error,
      refreshing,
      accent: data?.tenant.accentColor ?? colors.accent,
      isOrganizer: data?.me.role === 'OWNER' || data?.me.role === 'ADMIN',
      reload,
      refresh: () => {
        setRefreshing(true);
        reload();
      },
    }),
    [slug, data, config, error, refreshing, reload],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant fuera de TenantProvider');
  return ctx;
}
