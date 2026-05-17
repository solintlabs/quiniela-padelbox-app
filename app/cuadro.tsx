import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { api, type ApiMatch, type ApiUser } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { computeGroupStandings, type TeamStanding } from '@/lib/groupStandings';

export default function CuadroScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ms, m] = await Promise.all([api.matches(), api.me()]);
      setMatches(ms.matches);
      setMe(m.me);
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

  const groups = computeGroupStandings(matches);
  const totalPredicted = groups.reduce((s, g) => s + g.matchesPredicted, 0);
  const totalMatches = groups.reduce((s, g) => s + g.matchesTotal, 0);
  const completePct = totalMatches > 0 ? Math.round((totalPredicted / totalMatches) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Mi Cuadro', headerBackTitle: 'Atrás' }} />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {!loaded ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl * 2 }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.muted, { marginTop: spacing.md }]}>Cargando…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>MUNDIAL 2026</Text>
              <Text style={styles.title}>Mi Cuadro</Text>
              <Text style={styles.subtitle}>
                Así quedan los grupos según tus predicciones.
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${completePct}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {totalPredicted}/{totalMatches}
                </Text>
              </View>
              {completePct < 100 && (
                <Link href="/predecir-grupos" asChild>
                  <Pressable style={styles.completeBtn}>
                    <Text style={styles.completeBtnText}>
                      {completePct === 0 ? 'EMPEZAR PREDICCIONES →' : 'COMPLETAR PREDICCIONES →'}
                    </Text>
                  </Pressable>
                </Link>
              )}
            </View>

            <ChampionCard champion={me?.championPick ?? null} locked={!!me?.championLockedAt} />

            <Text style={styles.sectionTitle}>FASE DE GRUPOS</Text>
            <View style={styles.groupsGrid}>
              {groups.map((g) => (
                <GroupCard key={g.group} group={g.group} standings={g.standings} predicted={g.matchesPredicted} total={g.matchesTotal} />
              ))}
            </View>

            <Text style={styles.legendTitle}>LEYENDA</Text>
            <View style={styles.legend}>
              <LegendItem color={colors.accent} label="1º · clasifica" />
              <LegendItem color="#3B82F6" label="2º · clasifica" />
              <LegendItem color="#F59E0B" label="3º · posible" />
              <LegendItem color={colors.muted} label="4º · fuera" />
            </View>
            <Text style={styles.legendNote}>
              Los 8 mejores 3ros también pasan a R32. El bracket completo se calcula automático cuando termine la fase de grupos.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

function ChampionCard({ champion, locked }: { champion: string | null; locked: boolean }) {
  return (
    <View style={styles.championCard}>
      <Text style={styles.championEyebrow}>MI CAMPEÓN</Text>
      {champion ? (
        <>
          <Text style={styles.championName}>{champion.toUpperCase()}</Text>
          <Text style={styles.championNote}>
            {locked ? '🔒 Pick congelado al inicio del torneo' : 'Aún puedes cambiarlo antes del 11 jun'}
          </Text>
          {!locked && (
            <Link href="/elegir-campeon" asChild>
              <Pressable>
                <Text style={styles.championCta}>Cambiar →</Text>
              </Pressable>
            </Link>
          )}
        </>
      ) : (
        <>
          <Text style={[styles.championName, { color: colors.muted }]}>Sin elegir</Text>
          <Link href="/elegir-campeon" asChild>
            <Pressable>
              <Text style={styles.championCta}>Elegir campeón →</Text>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}

function GroupCard({ group, standings, predicted, total }: { group: string; standings: TeamStanding[]; predicted: number; total: number }) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>GRUPO {group}</Text>
        <Text style={styles.groupProgress}>
          {predicted}/{total}
        </Text>
      </View>
      {standings.map((s, i) => (
        <TeamRow key={s.team} position={i + 1} standing={s} />
      ))}
    </View>
  );
}

function TeamRow({ position, standing }: { position: number; standing: TeamStanding }) {
  const color =
    position === 1 ? colors.accent
    : position === 2 ? '#3B82F6'
    : position === 3 ? '#F59E0B'
    : colors.muted;

  return (
    <View style={styles.teamRow}>
      <Text style={[styles.position, { color }]}>{position}</Text>
      {standing.flag ? (
        <Image source={{ uri: standing.flag }} style={styles.flag} />
      ) : (
        <View style={[styles.flag, { backgroundColor: colors.border }]} />
      )}
      <Text style={styles.teamName} numberOfLines={1}>{standing.team}</Text>
      <Text style={[styles.points, { color }]}>{standing.pts}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xl },
  muted: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },

  header: { alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 3 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink, marginTop: 2 },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.bgElev, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.accent },
  progressLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.muted, minWidth: 50, textAlign: 'right' },
  completeBtn: { marginTop: spacing.sm, backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  completeBtnText: { fontFamily: fontFamily.display, fontSize: fontSize.xs, color: colors.accentFg, letterSpacing: 0.5 },

  championCard: {
    borderWidth: 2,
    borderColor: colors.accent + 'AA',
    backgroundColor: colors.accent + '12',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  championEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 3 },
  championName: { fontFamily: fontFamily.display, fontSize: 28, color: colors.ink, marginTop: 2 },
  championNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  championCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.accent, marginTop: spacing.sm, textDecorationLine: 'underline' },

  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: spacing.md },
  groupsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  groupCard: {
    width: '48%',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  groupTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.ink, letterSpacing: 1.5 },
  groupProgress: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  position: { fontFamily: fontFamily.display, fontSize: 14, width: 16, textAlign: 'center' },
  flag: { width: 18, height: 18, borderRadius: 3 },
  teamName: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 12, color: colors.ink },
  points: { fontFamily: fontFamily.display, fontSize: 14, minWidth: 18, textAlign: 'right' },

  legendTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  legendNote: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 4 },
});
