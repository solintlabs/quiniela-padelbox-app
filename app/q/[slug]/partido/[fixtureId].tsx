import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { saasApi, type SaasFixtureEntries } from '@/lib/saas-api';

/**
 * Detalle social de un partido: tendencia 1X2 y el pronóstico de todos.
 * El backend solo lo revela con el partido CERRADO (antes sería copiar).
 */
export default function SaasFixtureDetail() {
  const { slug, fixtureId } = useLocalSearchParams<{ slug: string; fixtureId: string }>();
  const [data, setData] = useState<SaasFixtureEntries | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug || !fixtureId) return;
    try {
      setData(await saasApi.fixtureEntries(slug, fixtureId));
    } catch {
      // se deja el spinner/estado anterior
    } finally {
      setRefreshing(false);
    }
  }, [slug, fixtureId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Partido' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const f = data.fixture;

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
      <Stack.Screen options={{ title: `${f.home} — ${f.away}` }} />

      <View style={styles.scoreCard}>
        <TeamSide name={f.home} logo={f.homeLogo} />
        <Text style={styles.bigScore}>
          {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore}–${f.awayScore}` : 'vs'}
        </Text>
        <TeamSide name={f.away} logo={f.awayLogo} />
      </View>

      {/* La tendencia puede venir también ANTES del cierre si el organizador
          activó los porcentajes (solo %, nunca marcadores individuales). */}
      {data.trend && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tendencia</Text>
          <TrendBar label={`Gana ${f.home}`} pct={data.trend.home} />
          <TrendBar label="Empate" pct={data.trend.draw} />
          <TrendBar label={`Gana ${f.away}`} pct={data.trend.away} />
          {!data.revealed && (
            <Text style={[styles.cardMeta, { marginTop: spacing.xs, fontSize: 11 }]}>
              Porcentajes en vivo — los marcadores de cada jugador se revelan al cierre.
            </Text>
          )}
        </View>
      )}

      {!data.revealed ? (
        <View style={styles.card}>
          <Text style={styles.cardMeta}>
            Los pronósticos de todos se revelan cuando el partido cierra. Así nadie copia. 😉
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pronósticos ({data.entries.length})</Text>
            {data.entries.map((e) => (
              <Pressable
                key={e.id}
                onPress={() =>
                  router.push({
                    pathname: '/q/[slug]/jugador/[membershipId]',
                    params: { slug: slug!, membershipId: e.membershipId },
                  })
                }
                style={styles.entryRow}
              >
                <Text
                  style={[styles.entryName, e.isMe && { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {e.name}
                  {e.isMe ? ' (tú)' : ''}
                </Text>
                <Text style={styles.entryScore}>
                  {e.homeScore}–{e.awayScore}
                </Text>
                <Text
                  style={[
                    styles.entryPts,
                    e.points !== null && e.points > 0 && { color: colors.accent },
                  ]}
                >
                  {e.points !== null ? `+${e.points}` : '·'}
                </Text>
              </Pressable>
            ))}
            {data.entries.length === 0 && (
              <Text style={styles.cardMeta}>Nadie pronosticó este partido.</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function TeamSide({ name, logo }: { name: string; logo: string | null }) {
  return (
    <View style={styles.teamSide}>
      {logo ? <Image source={{ uri: logo }} style={styles.teamLogo} contentFit="contain" /> : null}
      <Text style={styles.teamName} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}

function TrendBar({ label, pct }: { label: string; pct: number }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={styles.trendHead}>
        <Text style={styles.cardMeta}>{label}</Text>
        <Text style={[styles.cardMeta, { color: colors.ink }]}>{pct}%</Text>
      </View>
      <View style={styles.trendTrack}>
        <View style={[styles.trendFill, { width: `${Math.max(2, pct)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  teamSide: { flex: 1, alignItems: 'center', gap: spacing.sm },
  teamLogo: { width: 40, height: 40 },
  teamName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'center',
  },
  bigScore: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    color: colors.ink,
    minWidth: 84,
    textAlign: 'center',
  },
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
  trendHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  trendTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  trendFill: { height: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryName: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink },
  entryScore: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  entryPts: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.muted,
    minWidth: 32,
    textAlign: 'right',
  },
});
