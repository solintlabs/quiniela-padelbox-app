import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MatchCard } from '@/components/MatchCard';
import { InlinePredictionRow } from '@/components/InlinePredictionRow';
import { api, type ApiMatch, type ApiRules, type ApiUser } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { STAGE_LABEL } from '@/lib/format';

const MUNDIAL_GROUPS_ARR = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const MUNDIAL_GROUPS = new Set(MUNDIAL_GROUPS_ARR);
const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'] as const;

type Tab = 'mundial' | 'liga';
type Section = { title: string; data: ApiMatch[] };

type PendingState = { home: number; away: number };

export default function PartidosScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [rules, setRules] = useState<ApiRules | null>(null);
  const [hasPaid, setHasPaid] = useState<boolean>(false);
  const [tab, setTab] = useState<Tab>('mundial');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado controlado de predicciones (no autosave)
  const [values, setValues] = useState<Record<string, PendingState>>({});
  const [initial, setInitial] = useState<Record<string, PendingState | null>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, m, r] = await Promise.all([api.matches(), api.me(), api.rules()]);
      setMatches(data.matches);
      setHasPaid(m.me.hasPaid);
      setMe(m.me);
      setRules(r.rules);
      // Inicializa values y initial baseline desde las predictions ya guardadas
      const v: Record<string, PendingState> = {};
      const ini: Record<string, PendingState | null> = {};
      for (const mt of data.matches) {
        const p = mt.predictions?.[0];
        if (p) {
          v[mt.id] = { home: p.homeScore, away: p.awayScore };
          ini[mt.id] = { home: p.homeScore, away: p.awayScore };
        } else {
          v[mt.id] = { home: 0, away: 0 };
          ini[mt.id] = null;
        }
      }
      setValues(v);
      setInitial(ini);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function isDirty(id: string): boolean {
    const v = values[id];
    const base = initial[id];
    if (!v) return false;
    if (!base) return v.home !== 0 || v.away !== 0;
    return v.home !== base.home || v.away !== base.away;
  }

  function onPredictionChange(id: string, home: number, away: number) {
    setValues((prev) => ({ ...prev, [id]: { home, away } }));
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  async function saveOne(id: string) {
    const v = values[id];
    if (!v) return;
    setSavingIds((s) => new Set(s).add(id));
    setErrors((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
    try {
      await api.predict(id, v.home, v.away);
      setInitial((ini) => ({ ...ini, [id]: { home: v.home, away: v.away } }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      setErrors((errs) => ({ ...errs, [id]: msg }));
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function saveAll() {
    const dirtyIds = Object.keys(values).filter(isDirty);
    if (dirtyIds.length === 0) return;
    const payload = dirtyIds.map((id) => ({
      matchId: id,
      homeScore: values[id].home,
      awayScore: values[id].away,
    }));
    setBulkSaving(true);
    try {
      await api.predictBatch(payload);
      setInitial((ini) => {
        const n = { ...ini };
        for (const id of dirtyIds) n[id] = { home: values[id].home, away: values[id].away };
        return n;
      });
      setErrors({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      setErrors((errs) => {
        const n = { ...errs };
        for (const id of dirtyIds) n[id] = msg;
        return n;
      });
    } finally {
      setBulkSaving(false);
    }
  }

  const dirtyCount = Object.keys(values).filter(isDirty).length;

  const counts = useMemo(() => {
    let mundial = 0, liga = 0;
    for (const m of matches) {
      if (m.group === 'LIGA') liga++;
      else if (m.group && MUNDIAL_GROUPS.has(m.group)) mundial++;
    }
    return { mundial, liga };
  }, [matches]);

  const filtered = useMemo(
    () => matches.filter((m) => (tab === 'liga' ? m.group === 'LIGA' : m.group && MUNDIAL_GROUPS.has(m.group))),
    [matches, tab],
  );

  type SectionWithKind = Section & { kind: 'inline' | 'card' };
  const sections: SectionWithKind[] = useMemo(() => {
    if (tab === 'mundial') {
      // Por grupo A-L + rondas eliminatorias. Todos como 'inline' (editable
      // si esta abierto, read-only si esta cerrado / finalizado).
      const out: SectionWithKind[] = [];
      for (const g of MUNDIAL_GROUPS_ARR) {
        const groupMatches = filtered.filter((m) => m.group === g);
        if (groupMatches.length > 0) {
          out.push({ kind: 'inline', title: `Grupo ${g}`, data: groupMatches });
        }
      }
      for (const stage of KNOCKOUT_STAGES) {
        const stageMatches = filtered.filter((m) => m.stage === stage);
        if (stageMatches.length > 0) {
          out.push({ kind: 'inline', title: STAGE_LABEL[stage] ?? stage, data: stageMatches });
        }
      }
      return out;
    }
    // La Liga: estilo clasico (proximos / cerrados / finalizados)
    return [
      { kind: 'inline' as const, title: 'Próximos · puedes predecir', data: filtered.filter((m) => m.status === 'SCHEDULED' && !m.lockedAt) },
      { kind: 'card' as const, title: 'En juego o cerrados', data: filtered.filter((m) => m.status !== 'FINISHED' && (m.status !== 'SCHEDULED' || m.lockedAt)) },
      { kind: 'card' as const, title: 'Finalizados', data: filtered.filter((m) => m.status === 'FINISHED') },
    ].filter((s) => s.data.length > 0);
  }, [filtered, tab]);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>Partidos</Text>
            <Text style={styles.subtitle}>
              {tab === 'mundial' ? `Mundial 2026 · ${filtered.length} partidos` : `La Liga · ${filtered.length} partidos`}
            </Text>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>No se pudieron cargar los partidos</Text>
                <Text style={styles.errorBody}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.tabs}>
            <TabButton
              label={`🌍 Mundial`}
              count={counts.mundial}
              active={tab === 'mundial'}
              onPress={() => setTab('mundial')}
            />
            <TabButton
              label={`🇪🇸 La Liga`}
              count={counts.liga}
              active={tab === 'liga'}
              onPress={() => setTab('liga')}
            />
          </View>

          {hasPaid && dirtyCount > 0 && (
            <View style={styles.dirtyBar}>
              <Text style={styles.dirtyBarText}>
                ● {dirtyCount} sin guardar
              </Text>
              <Pressable onPress={saveAll} disabled={bulkSaving} style={[styles.saveAllBtn, bulkSaving && { opacity: 0.5 }]}>
                <Text style={styles.saveAllBtnText}>
                  {bulkSaving ? 'Guardando…' : `Guardar todo (${dirtyCount})`}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Mi Campeón — solo tab Mundial */}
          {tab === 'mundial' && (
            <View style={styles.championCard}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.championEyebrow}>MI CAMPEÓN</Text>
                {me?.championPick ? (
                  <>
                    <Text style={styles.championValue}>{me.championPick.toUpperCase()}</Text>
                    <Text style={styles.championNote}>
                      {me.championLockedAt ? '🔒 Pick congelado' : 'Cambiable hasta 11 jun'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.championNote}>
                    Sin elegir · +25 pts si aciertas
                  </Text>
                )}
              </View>
              {!me?.championLockedAt && (
                <Link href="/elegir-campeon" asChild>
                  <Pressable style={styles.championBtn}>
                    <Text style={styles.championBtnText}>
                      {me?.championPick ? 'Cambiar' : 'Elegir →'}
                    </Text>
                  </Pressable>
                </Link>
              )}
            </View>
          )}

          {/* Premios de esta semana — solo tab Mundial */}
          {tab === 'mundial' && rules?.weeklyPrizesText && (
            <View style={styles.weeklyPrizes}>
              <Text style={styles.weeklyEyebrow}>🍔 PREMIOS DE ESTA SEMANA</Text>
              <Text style={styles.weeklyBody}>{rules.weeklyPrizesText}</Text>
            </View>
          )}
        </View>
      }
      data={sections}
      keyExtractor={(s) => s.title}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.data.map((m) =>
            item.kind === 'inline' ? (
              <InlinePredictionRow
                key={m.id}
                match={m}
                canEdit={hasPaid}
                homeValue={values[m.id]?.home ?? 0}
                awayValue={values[m.id]?.away ?? 0}
                onChange={onPredictionChange}
                dirty={isDirty(m.id)}
                saving={savingIds.has(m.id) || bulkSaving}
                error={errors[m.id] ?? null}
                onSave={saveOne}
              />
            ) : (
              <MatchCard key={m.id} match={m} />
            ),
          )}
        </View>
      )}
      ListEmptyComponent={
        error ? null : !loaded ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.empty, { marginTop: spacing.md }]}>Cargando partidos…</Text>
          </View>
        ) : (
          <Text style={styles.empty}>No hay partidos en esta competición.</Text>
        )
      }
    />
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label} <Text style={styles.tabCount}>({count})</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: colors.accent },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  tabLabelActive: { color: colors.ink },
  tabCount: { color: colors.muted, fontFamily: fontFamily.body },
  dirtyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning + '60',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  dirtyBarText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.warning },
  saveAllBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  saveAllBtnText: { fontFamily: fontFamily.display, fontSize: fontSize.xs, color: colors.accentFg, letterSpacing: 0.3 },
  championCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent + 'AA',
    backgroundColor: colors.accent + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  championEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 2 },
  championValue: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.ink, marginTop: 2 },
  championNote: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  championBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  championBtnText: { fontFamily: fontFamily.display, fontSize: fontSize.xs, color: colors.accentFg, letterSpacing: 0.3 },
  weeklyPrizes: {
    borderWidth: 2,
    borderColor: '#f14826' + '70',
    backgroundColor: '#f14826' + '12',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weeklyEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: '#f14826', letterSpacing: 2 },
  weeklyBody: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink, marginTop: spacing.sm, lineHeight: 20 },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  empty: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger + '80',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  errorTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: fontSize.sm },
  errorBody: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 4 },
});
