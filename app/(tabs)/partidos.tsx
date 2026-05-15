import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MatchCard } from '@/components/MatchCard';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const MUNDIAL_GROUPS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

type Tab = 'mundial' | 'liga';
type Section = { title: string; data: ApiMatch[] };

export default function PartidosScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [tab, setTab] = useState<Tab>('mundial');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.matches();
      setMatches(data.matches);
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

  const sections: Section[] = useMemo(() => [
    { title: 'Próximos · puedes predecir', data: filtered.filter((m) => m.status === 'SCHEDULED' && !m.lockedAt) },
    { title: 'En juego o cerrados', data: filtered.filter((m) => m.status !== 'FINISHED' && (m.status !== 'SCHEDULED' || m.lockedAt)) },
    { title: 'Finalizados', data: filtered.filter((m) => m.status === 'FINISHED') },
  ].filter((s) => s.data.length > 0), [filtered]);

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
        </View>
      }
      data={sections}
      keyExtractor={(s) => s.title}
      renderItem={({ item }) => (
        <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.data.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
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
