import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL } from '@/lib/format';

type Data = Awaited<ReturnType<typeof api.userPredictions>>;

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await api.userPredictions(id!);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <View style={styles.loader}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { user, stats, predictions, hiddenCount, isMe } = data;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {(user.name?.[0] ?? user.email[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.name}>
            {user.name ?? 'Sin nombre'}
            {isMe && <Text style={styles.meTag}>  · tú</Text>}
          </Text>
          <Text style={styles.subtitle}>
            Miembro desde {formatDateTime(user.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Puntos" value={stats.points} highlight />
        <Stat label="Pronósticos" value={stats.total} />
        <Stat label="Exactos" value={stats.exact} />
      </View>

      <View>
        <Text style={styles.sectionTitle}>Su quiniela</Text>
        {hiddenCount > 0 && (
          <Text style={styles.hidden}>
            🔒 Se ocultan {hiddenCount} pronóstico{hiddenCount !== 1 && 's'} de partidos que aún no han cerrado.
          </Text>
        )}
        {predictions.length === 0 ? (
          <View style={[styles.list, { padding: spacing.lg }]}>
            <Text style={[styles.body, { textAlign: 'center' }]}>
              Aún no hay pronósticos públicos.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {predictions.map((p, i) => {
              const m = p.match;
              const stageLabel =
                m.group === 'LIGA' ? 'La Liga' : m.stage === 'GROUP' && m.group ? `Grupo ${m.group}` : STAGE_LABEL[m.stage] ?? m.stage;
              return (
                <Link key={p.id} href={`/partido/${m.id}`} asChild>
                  <Pressable style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowMeta}>{stageLabel} · {formatDateTime(m.kickoff)}</Text>
                      <Text style={styles.rowTeams} numberOfLines={1}>
                        {m.homeTeam} <Text style={{ color: colors.muted }}>vs</Text> {m.awayTeam}
                      </Text>
                    </View>
                    <Text style={styles.predScore}>{p.homeScore}–{p.awayScore}</Text>
                    <Text
                      style={[
                        styles.predPts,
                        {
                          color:
                            p.points === 3 ? colors.success :
                            p.points === 1 ? colors.warning :
                            colors.muted,
                        },
                      ]}
                    >
                      {p.points === null ? '—' : `+${p.points}`}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  meTag: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  statLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginTop: spacing.xs },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginBottom: spacing.sm },
  hidden: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.xs, marginBottom: spacing.sm },
  list: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  rowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  rowMeta: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted },
  rowTeams: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink, marginTop: 2 },
  predScore: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, width: 54, textAlign: 'center' },
  predPts: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, width: 40, textAlign: 'right' },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm },
});
