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
const KNOCKOUT_SET = new Set<string>(KNOCKOUT_STAGES);

// Equipos placeholder de eliminatorias (bracket sin definir). No mostrar
// hasta que ESPN ponga los equipos reales.
const isPlaceholder = (s: string) =>
  /group\s|round of|third place|\bwinner\b|\brunner\b|\bwin\b|\bplace\b|\b\d(st|nd|rd|th)\b/i.test(s);
const isMundialMatch = (m: { group: string | null; stage: string; homeTeam: string; awayTeam: string }) => {
  if (m.group && MUNDIAL_GROUPS.has(m.group)) return true;
  // Eliminatoria con equipos reales
  if (KNOCKOUT_SET.has(m.stage) && !isPlaceholder(m.homeTeam) && !isPlaceholder(m.awayTeam)) return true;
  return false;
};

type Tab = 'mundial' | 'liga';
type Section = { title: string; data: ApiMatch[] };

type PendingState = { home: number; away: number };

// Cómo organizar la lista del Mundial: por grupo (default), por jornada
// (J1/J2/J3 de fase de grupos) o por fecha (cronológico, un día por sección).
type ViewMode = 'grupo' | 'jornada' | 'fecha';
const VIEW_MODES: Array<{ key: ViewMode; label: string }> = [
  { key: 'grupo', label: 'Por grupo' },
  { key: 'jornada', label: 'Por jornada' },
  { key: 'fecha', label: 'Por fecha' },
];

const dayFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Caracas',
});

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
  // Secciones (Grupo A, B…) plegadas. Tap en el header de seccion alterna.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Matches que el usuario ha tocado (permite guardar 0-0 explicito).
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Matches guardados en este cliente (para mostrar "guardado" al instante).
  const [savedNew, setSavedNew] = useState<Set<string>>(new Set());
  // Mensaje de éxito temporal.
  const [okMsg, setOkMsg] = useState<string | null>(null);
  function flashOk(msg: string) {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(null), 2600);
  }

  function toggleCollapsed(title: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

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
    if (base) {
      // Ya hay predicción guardada: dirty si difiere.
      return v.home !== base.home || v.away !== base.away;
    }
    // Sin predicción guardada: dirty SOLO si el usuario tocó la fila. Asi se
    // permite guardar un 0-0 explicito (antes 0-0 == "sin tocar").
    return touched.has(id);
  }

  function onPredictionChange(id: string, home: number, away: number) {
    setValues((prev) => ({ ...prev, [id]: { home, away } }));
    setTouched((prev) => {
      if (prev.has(id)) return prev;
      const n = new Set(prev);
      n.add(id);
      return n;
    });
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
      setSavedNew((s) => new Set(s).add(id));
      setTouched((t) => {
        const n = new Set(t);
        n.delete(id);
        return n;
      });
      flashOk('✓ Pronóstico guardado');
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

  // ¿Se puede aún predecir este partido? (mismo criterio que el server)
  function isEditableMatch(m: ApiMatch): boolean {
    if (m.status !== 'SCHEDULED' || m.lockedAt) return false;
    return new Date(m.kickoff).getTime() - 15 * 60_000 > Date.now();
  }

  async function saveAll() {
    // Solo partidos aún editables (los bloqueados serían rechazados igual).
    const editable = new Set(matches.filter(isEditableMatch).map((m) => m.id));
    const dirtyIds = Object.keys(values).filter((id) => editable.has(id) && isDirty(id));
    if (dirtyIds.length === 0) return;
    // Snapshot AHORA: si el user toca un stepper mientras el batch está en
    // vuelo, el baseline queda con lo enviado, no con el valor nuevo.
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
        for (const p of payload) n[p.matchId] = { home: p.homeScore, away: p.awayScore };
        return n;
      });
      setSavedNew((s) => {
        const n = new Set(s);
        dirtyIds.forEach((id) => n.add(id));
        return n;
      });
      setTouched((t) => {
        const n = new Set(t);
        dirtyIds.forEach((id) => n.delete(id));
        return n;
      });
      setErrors({});
      flashOk(`✓ ${dirtyIds.length} pronóstico${dirtyIds.length !== 1 ? 's' : ''} guardado${dirtyIds.length !== 1 ? 's' : ''}`);
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

  const dirtyCount = useMemo(() => {
    const editable = new Set(matches.filter(isEditableMatch).map((m) => m.id));
    return Object.keys(values).filter((id) => editable.has(id) && isDirty(id)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, values, initial, touched]);

  const counts = useMemo(() => {
    let mundial = 0, liga = 0;
    for (const m of matches) {
      if (m.group === 'LIGA') liga++;
      else if (isMundialMatch(m)) mundial++;
    }
    return { mundial, liga };
  }, [matches]);

  const filtered = useMemo(
    () => matches.filter((m) => (tab === 'liga' ? m.group === 'LIGA' : isMundialMatch(m))),
    [matches, tab],
  );

  const [viewMode, setViewMode] = useState<ViewMode>('grupo');

  type SectionWithKind = Section & { kind: 'inline' | 'card' };
  const sections: SectionWithKind[] = useMemo(() => {
    if (tab === 'mundial') {
      // Todos como 'inline' (editable si esta abierto, read-only si cerrado).
      const groupStage = filtered.filter((m) => m.group && MUNDIAL_GROUPS.has(m.group));
      const knockoutSections: SectionWithKind[] = [];
      for (const stage of KNOCKOUT_STAGES) {
        const stageMatches = filtered.filter((m) => m.stage === stage);
        if (stageMatches.length > 0) {
          knockoutSections.push({ kind: 'inline', title: STAGE_LABEL[stage] ?? stage, data: stageMatches });
        }
      }

      if (viewMode === 'jornada') {
        // Dentro de cada grupo, sus partidos por kickoff se reparten de 2 en 2
        // → Jornada 1 / 2 / 3.
        const byJornada = new Map<number, ApiMatch[]>();
        for (const g of MUNDIAL_GROUPS_ARR) {
          const gm = groupStage
            .filter((m) => m.group === g)
            .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
          gm.forEach((m, i) => {
            const j = Math.min(3, Math.floor(i / 2) + 1);
            const arr = byJornada.get(j) ?? [];
            arr.push(m);
            byJornada.set(j, arr);
          });
        }
        const out: SectionWithKind[] = [...byJornada.keys()].sort((a, b) => a - b).map((j) => ({
          kind: 'inline' as const,
          title: `Jornada ${j}`,
          data: byJornada
            .get(j)!
            .slice()
            .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
        }));
        return [...out, ...knockoutSections];
      }

      if (viewMode === 'fecha') {
        // Cronológico: una sección por día (hora de Caracas).
        const chrono = filtered
          .slice()
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
        const out: SectionWithKind[] = [];
        for (const m of chrono) {
          const raw = dayFmt.format(new Date(m.kickoff));
          const title = raw.charAt(0).toUpperCase() + raw.slice(1);
          const last = out[out.length - 1];
          if (last && last.title === title) last.data.push(m);
          else out.push({ kind: 'inline', title, data: [m] });
        }
        return out;
      }

      // Por grupo (default): A-L + rondas eliminatorias.
      const out: SectionWithKind[] = [];
      for (const g of MUNDIAL_GROUPS_ARR) {
        const groupMatches = groupStage.filter((m) => m.group === g);
        if (groupMatches.length > 0) {
          out.push({ kind: 'inline', title: `Grupo ${g}`, data: groupMatches });
        }
      }
      return [...out, ...knockoutSections];
    }
    // La Liga: estilo clasico (proximos / cerrados / finalizados)
    return [
      { kind: 'inline' as const, title: 'Próximos · puedes predecir', data: filtered.filter((m) => m.status === 'SCHEDULED' && !m.lockedAt) },
      { kind: 'card' as const, title: 'En juego o cerrados', data: filtered.filter((m) => m.status !== 'FINISHED' && (m.status !== 'SCHEDULED' || m.lockedAt)) },
      { kind: 'card' as const, title: 'Finalizados', data: filtered.filter((m) => m.status === 'FINISHED') },
    ].filter((s) => s.data.length > 0);
  }, [filtered, tab, viewMode]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>Partidos</Text>
            <Text style={styles.subtitle}>
              {tab === 'mundial' ? `Torneo 2026 · ${filtered.length} partidos` : `La Liga · ${filtered.length} partidos`}
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
              label={`🌍 Torneo`}
              count={counts.mundial}
              active={tab === 'mundial'}
              onPress={() => setTab('mundial')}
            />
            {counts.liga > 0 && (
              <TabButton
                label={`🇪🇸 La Liga`}
                count={counts.liga}
                active={tab === 'liga'}
                onPress={() => setTab('liga')}
              />
            )}
          </View>

          {/* Selector de vista — solo tab Mundial */}
          {tab === 'mundial' && (
            <View style={styles.viewModes}>
              {VIEW_MODES.map((vm) => (
                <Pressable
                  key={vm.key}
                  onPress={() => setViewMode(vm.key)}
                  style={[styles.viewModeBtn, viewMode === vm.key && styles.viewModeBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === vm.key }}
                >
                  <Text style={[styles.viewModeText, viewMode === vm.key && styles.viewModeTextActive]}>
                    {vm.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

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
      renderItem={({ item }) => {
        const isCollapsed = collapsed.has(item.title);
        const filled = item.data.filter((m) => {
          const v = values[m.id];
          const ini = initial[m.id];
          return !!ini || (v && (v.home !== 0 || v.away !== 0));
        }).length;
        return (
        <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          <Pressable
            onPress={() => toggleCollapsed(item.title)}
            style={styles.sectionHeader}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${isCollapsed ? 'plegado' : 'desplegado'}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <Text style={styles.sectionArrow}>{isCollapsed ? '▶' : '▼'}</Text>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.sectionCount}>{filled}/{item.data.length}</Text>
          </Pressable>
          {!isCollapsed && item.data.map((m) =>
            item.kind === 'inline' ? (
              <InlinePredictionRow
                key={m.id}
                match={m}
                canEdit={hasPaid}
                homeValue={values[m.id]?.home ?? 0}
                awayValue={values[m.id]?.away ?? 0}
                onChange={onPredictionChange}
                dirty={isDirty(m.id)}
                savedLocally={savedNew.has(m.id)}
                saving={savingIds.has(m.id) || bulkSaving}
                error={errors[m.id] ?? null}
                onSave={saveOne}
              />
            ) : (
              <MatchCard key={m.id} match={m} />
            ),
          )}
        </View>
        );
      }}
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
    {okMsg && (
      <View style={styles.toast} pointerEvents="none">
        <Text style={styles.toastText}>{okMsg}</Text>
      </View>
    )}
    </View>
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
  viewModes: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.bgElev,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  viewModeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  viewModeBtnActive: { backgroundColor: colors.accent },
  viewModeText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.muted },
  viewModeTextActive: { color: colors.accentFg },
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
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  toastText: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: '#fff' },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionArrow: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.muted,
    width: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  sectionCount: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.muted,
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
