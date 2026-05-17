import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { api, type ApiMatch, type ApiRanking } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, timeLeft } from '@/lib/format';
import { registerForPushAsync } from '@/lib/push';
import { AliadosStrip } from '@/components/AliadosStrip';

export default function HomeScreen() {
  const [ranking, setRanking] = useState<ApiRanking | null>(null);
  const [nextMatch, setNextMatch] = useState<ApiMatch | null>(null);
  const [hasPaid, setHasPaid] = useState<boolean>(true);
  const [groupStats, setGroupStats] = useState<{ total: number; filled: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [r, ms, m] = await Promise.all([
        api.ranking(),
        api.matches(),
        api.me(),
      ]);
      setRanking(r);
      setHasPaid(m.me.hasPaid);
      const open = (ms.matches || []).find(
        (x) => x.status === 'SCHEDULED' && !x.lockedAt,
      );
      setNextMatch(open ?? null);

      const offsetMs = 15 * 60_000;
      const now = Date.now();
      // Solo grupos del Mundial (A-L), no La Liga (group='LIGA')
      const groupMatches = (ms.matches || []).filter(
        (x) =>
          x.stage === 'GROUP' &&
          x.group !== 'LIGA' &&
          x.group !== null &&
          x.status === 'SCHEDULED' &&
          !x.lockedAt &&
          new Date(x.kickoff).getTime() - offsetMs > now,
      );
      const filled = groupMatches.filter((g) => (g.predictions?.length ?? 0) > 0).length;
      setGroupStats({ total: groupMatches.length, filled });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, []);

  useEffect(() => {
    load();
    // Registrar push token (idempotente — el backend hace upsert).
    // Pide permisos al usuario la primera vez.
    registerForPushAsync().catch(() => {});
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const top3 = ranking?.ranking.slice(0, 3) ?? [];
  const meIdx = ranking ? ranking.ranking.findIndex((r) => r.userId === ranking.meId) : -1;
  const me = meIdx >= 0 ? ranking!.ranking[meIdx] : null;
  const podiumPoints = ranking?.ranking[2]?.points ?? 0;
  const toPodium = me ? Math.max(0, podiumPoints - me.points + 1) : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {!hasPaid && (
        <Link href="/inscripcion" asChild>
          <Pressable style={styles.banner}>
            <Text style={styles.bannerTitle}>⚠ Tu cuenta aún no está activa</Text>
            <Text style={styles.bannerBody}>
              Puedes mirar partidos y ranking, pero no podrás enviar pronósticos hasta que confirmemos
              tu pago.
            </Text>
            <Text style={styles.bannerCta}>Ver métodos de pago →</Text>
          </Pressable>
        </Link>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.podium}>
        <PodiumStep place={2} row={top3[1]} />
        <PodiumStep place={1} row={top3[0]} crown />
        <PodiumStep place={3} row={top3[2]} />
      </View>

      {me && (
        <View style={styles.mePill}>
          <View>
            <Text style={styles.mePillLabel}>Tu posición</Text>
            <Text style={styles.mePillValue}>
              #{meIdx + 1} · <Text style={{ color: colors.accent }}>{me.points}</Text> pts
            </Text>
          </View>
          {toPodium > 0 ? (
            <Text style={styles.mePillHint}>
              A <Text style={{ color: colors.ink }}>{toPodium} pts</Text> del podio
            </Text>
          ) : (
            <Text style={[styles.mePillHint, { color: colors.success }]}>¡En el podio!</Text>
          )}
        </View>
      )}

      {groupStats && groupStats.total > 0 && groupStats.filled < groupStats.total && (
        <Link href={{ pathname: '/(tabs)/partidos' }} asChild>
          <Pressable style={styles.fillCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={{ fontSize: 22 }}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fillTitle}>Rellena tu quiniela</Text>
                <Text style={styles.fillSubtitle}>
                  <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>{groupStats.filled}</Text>
                  <Text style={{ color: colors.muted }}> / {groupStats.total} </Text>
                  <Text style={{ color: colors.muted }}>partidos de fase de grupos</Text>
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${(groupStats.filled / groupStats.total) * 100}%` }]} />
                </View>
              </View>
              <Text style={styles.fillCta}>{groupStats.filled === 0 ? 'EMPEZAR' : 'CONTINUAR'} →</Text>
            </View>
          </Pressable>
        </Link>
      )}

      {nextMatch && (
        <View style={styles.nextCard}>
          <View style={styles.nextHeader}>
            <Text style={styles.nextEyebrow}>SIGUIENTE PARTIDO</Text>
            <Text style={styles.nextTime}>Cierra en {timeLeft(nextMatch.kickoff)}</Text>
          </View>
          <View style={styles.nextTeams}>
            <View style={styles.nextTeam}>
              {nextMatch.homeFlag && <Image source={{ uri: nextMatch.homeFlag }} style={styles.bigFlag} />}
              <Text style={styles.teamName} numberOfLines={1}>{nextMatch.homeTeam}</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.nextTeam}>
              {nextMatch.awayFlag && <Image source={{ uri: nextMatch.awayFlag }} style={styles.bigFlag} />}
              <Text style={styles.teamName} numberOfLines={1}>{nextMatch.awayTeam}</Text>
            </View>
          </View>
          <Text style={styles.kickoff}>{formatDateTime(nextMatch.kickoff)}</Text>
          {nextMatch.predictions?.[0] && (
            <Text style={styles.myPrediction}>
              Tu pronóstico:{' '}
              <Text style={styles.myPredictionScore}>
                {nextMatch.predictions[0].homeScore}–{nextMatch.predictions[0].awayScore}
              </Text>
            </Text>
          )}
          <Link href={`/partido/${nextMatch.id}`} asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>
                {nextMatch.predictions?.[0] ? 'EDITAR PRONÓSTICO →' : 'PREDECIR →'}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      {/* Aliados comerciales — premios semanales cortesía de */}
      <AliadosStrip />

      <View style={styles.prizesCard}>
        <Text style={styles.prizesEyebrow}>PREMIOS DEL CAMPEONATO</Text>
        <Text style={styles.prizesTitle}>🏆 ¿Qué se llevan los ganadores?</Text>
        <View style={{ marginTop: spacing.md }}>
          {[
            { place: '🥇 1er lugar', amount: '$1.500', highlight: true },
            { place: '🥈 2º lugar', amount: '$500' },
            { place: '🥉 3er lugar', amount: '$300' },
          ].map((p, i) => (
            <View key={p.place} style={[styles.prizeRow, i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <Text style={styles.prizePlace}>{p.place}</Text>
              <Text style={[styles.prizeAmount, p.highlight && { color: colors.accent }]}>{p.amount}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hub de accesos: Cuadro, Reglas, Inscripcion */}
      <View style={styles.hubGrid}>
        <Link href="/cuadro" asChild>
          <Pressable style={styles.hubCardWrap}>
            <View style={[styles.hubCard, styles.hubCardAccent]}>
              <Text style={styles.hubIcon}>🎯</Text>
              <Text style={styles.hubCardTitle}>Mi Cuadro</Text>
              <Text style={styles.hubCardSub}>Grupos + campeón</Text>
            </View>
          </Pressable>
        </Link>
        <Link href="/reglas" asChild>
          <Pressable style={styles.hubCardWrap}>
            <View style={styles.hubCard}>
              <Text style={styles.hubIcon}>📖</Text>
              <Text style={styles.hubCardTitle}>Reglas</Text>
              <Text style={styles.hubCardSub}>3-1-0 · cierre</Text>
            </View>
          </Pressable>
        </Link>
        <Link href="/inscripcion" asChild>
          <Pressable style={styles.hubCardWrap}>
            <View style={styles.hubCard}>
              <Text style={styles.hubIcon}>💳</Text>
              <Text style={styles.hubCardTitle}>Inscripción</Text>
              <Text style={styles.hubCardSub}>Pago + activar</Text>
            </View>
          </Pressable>
        </Link>
      </View>

      <Pressable onPress={() => Linking.openURL('https://solint.cloud')} style={{ marginTop: spacing.xl }}>
        <Text style={styles.footer}>
          Desarrollado por{' '}
          <Text style={{ color: colors.accent, textDecorationLine: 'underline' }}>Solintlabs · S.Baldini</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function PodiumStep({
  place,
  row,
  crown,
}: {
  place: 1 | 2 | 3;
  row?: ApiRanking['ranking'][number];
  crown?: boolean;
}) {
  const heights = { 1: 110, 2: 80, 3: 56 } as const;
  const initial = row ? (row.name?.[0] ?? row.email[0] ?? '?').toUpperCase() : '—';

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      {crown && <Text style={{ fontSize: 20 }}>🥇</Text>}
      <View
        style={[
          styles.avatar,
          place === 1
            ? { width: 56, height: 56, backgroundColor: colors.accent }
            : { width: 48, height: 48, backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.avatarLetter,
            place === 1 ? { color: colors.accentFg } : { color: colors.ink },
          ]}
        >
          {initial}
        </Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{row?.name ?? row?.email ?? '—'}</Text>
      <Text style={styles.podiumPts}>{row?.points ?? 0} pts</Text>
      <View
        style={[
          styles.podiumStep,
          { height: heights[place] },
          place === 1 && { backgroundColor: '#B6FF3C20', borderColor: colors.accent + '88' },
        ]}
      >
        <Text
          style={[
            styles.podiumNumber,
            place === 1 && { color: colors.accent, fontSize: 32 },
          ]}
        >
          {place}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: spacing.xl },
  banner: {
    backgroundColor: '#FBBF2418',
    borderColor: colors.warning + '80',
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bannerTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  bannerBody: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  bannerCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.warning, marginTop: spacing.xs },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  avatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  avatarLetter: { fontFamily: fontFamily.display, fontSize: 20 },
  podiumName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink, marginTop: spacing.xs, textAlign: 'center' },
  podiumPts: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  podiumStep: {
    width: '100%',
    marginTop: spacing.sm,
    backgroundColor: colors.bgElev,
    borderTopWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xs,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  podiumNumber: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.muted },
  mePill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  mePillLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  mePillValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginTop: 2 },
  mePillHint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  nextCard: {
    backgroundColor: '#B6FF3C0D',
    borderColor: colors.accent + '50',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  nextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextEyebrow: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6 },
  nextTime: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent },
  nextTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  nextTeam: { alignItems: 'center', flex: 1 },
  bigFlag: { width: 48, height: 48, borderRadius: 24, marginBottom: spacing.sm },
  teamName: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, textAlign: 'center' },
  vs: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.muted },
  kickoff: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, textAlign: 'center' },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.accentFg, letterSpacing: 0.5 },
  footer: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  fillCard: {
    backgroundColor: '#B6FF3C0D',
    borderColor: colors.accent + '50',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  fillTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  fillSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, marginTop: 2 },
  fillCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent, letterSpacing: 0.5 },
  progressTrack: { height: 4, backgroundColor: colors.bg, borderRadius: 2, marginTop: spacing.sm, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.accent },
  hubGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  hubCardWrap: { flex: 1 },
  hubCard: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  hubCardAccent: { backgroundColor: colors.accent + '15', borderColor: colors.accent + '70' },
  hubIcon: { fontSize: 24 },
  hubCardTitle: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.ink, textAlign: 'center' },
  hubCardSub: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, textAlign: 'center' },
  myPrediction: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  myPredictionScore: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  prizesCard: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  prizesEyebrow: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textAlign: 'center' },
  prizesTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.ink, textAlign: 'center', marginTop: spacing.xs },
  prizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  prizePlace: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink },
  prizeAmount: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
});
