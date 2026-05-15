import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MatchCard } from '@/components/MatchCard';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, spacing } from '@/lib/theme';

type Section = { title: string; data: ApiMatch[] };

export default function PartidosScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
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

  const sections: Section[] = [
    {
      title: 'Próximos · puedes predecir',
      data: matches.filter((m) => m.status === 'SCHEDULED' && !m.lockedAt),
    },
    {
      title: 'En juego o cerrados',
      data: matches.filter((m) => m.status !== 'FINISHED' && (m.status !== 'SCHEDULED' || m.lockedAt)),
    },
    {
      title: 'Finalizados',
      data: matches.filter((m) => m.status === 'FINISHED'),
    },
  ].filter((s) => s.data.length > 0);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Partidos</Text>
          <Text style={styles.subtitle}>Mundial 2026 · {matches.length} partidos en total</Text>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>No se pudieron cargar los partidos</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Text style={styles.errorHint}>Tira hacia abajo para reintentar.</Text>
            </View>
          )}
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
          <Text style={styles.empty}>Aún no hay partidos cargados.</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
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
    borderRadius: 12,
    padding: spacing.lg,
  },
  errorTitle: { color: colors.ink, fontFamily: fontFamily.semibold, fontSize: fontSize.sm },
  errorBody: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 4 },
  errorHint: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.xs, marginTop: spacing.sm },
});
