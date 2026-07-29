import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { saasApi, type SaasPlayerProfile } from '@/lib/saas-api';

/**
 * Perfil de un jugador de la quiniela: estadísticas y sus pronósticos de
 * partidos ya cerrados (los abiertos se ocultan, salvo que seas tú).
 */
export default function SaasPlayerScreen() {
  const { slug, membershipId } = useLocalSearchParams<{ slug: string; membershipId: string }>();
  const [data, setData] = useState<SaasPlayerProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug || !membershipId) return;
    try {
      setData(await saasApi.player(slug, membershipId));
    } catch {
      // se mantiene el estado anterior
    } finally {
      setRefreshing(false);
    }
  }, [slug, membershipId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Jugador' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <Stack.Screen options={{ title: data.player.name }} />

      <View style={styles.statsRow}>
        <StatBox label="Puntos" value={String(data.stats.points)} highlight />
        <StatBox label="Exactos" value={String(data.stats.exact)} />
        <StatBox label="Pronósticos" value={String(data.stats.total)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Sus pronósticos</Text>
        {data.predictions.map((p) => (
          <View key={p.id} style={styles.predRow}>
            <Text style={styles.predMatch} numberOfLines={1}>
              {p.home} — {p.away}
            </Text>
            <Text style={styles.predScore}>
              {p.homeScore}–{p.awayScore}
            </Text>
            <Text
              style={[
                styles.predPts,
                p.points !== null && p.points > 0 && { color: colors.accent },
              ]}
            >
              {p.points !== null ? `+${p.points}` : '·'}
            </Text>
          </View>
        ))}
        {data.predictions.length === 0 && (
          <Text style={styles.cardMeta}>Sin pronósticos visibles todavía.</Text>
        )}
        {data.hiddenCount > 0 && (
          <Text style={[styles.cardMeta, { marginTop: spacing.sm }]}>
            +{data.hiddenCount} pronóstico{data.hiddenCount === 1 ? '' : 's'} de partidos aún
            abiertos (ocultos).
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statBox, highlight && { borderColor: colors.accent }]}>
      <Text style={[styles.statValue, highlight && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.cardMeta}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  cardMeta: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predMatch: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  predScore: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.ink },
  predPts: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.muted,
    minWidth: 30,
    textAlign: 'right',
  },
});
