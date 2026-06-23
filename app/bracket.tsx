import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL } from '@/lib/format';

const KO_STAGES = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'] as const;

const isPlaceholder = (s: string) =>
  /group\s|round of|third place|\bwinner\b|\brunner\b|\bwin\b|\bplace\b|\b\d(st|nd|rd|th)\b/i.test(s);

/**
 * Cuadro de eliminatorias (solo lectura) en la app. Muestra todas las rondas
 * llenándose: "Por definir" mientras no se sepan los cruces, equipos reales +
 * bandera + resultado conforme avanza el torneo, y tu propio pronóstico.
 */
export default function BracketScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.matches();
      setMatches(data.matches.filter((m) => (KO_STAGES as readonly string[]).includes(m.stage)));
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

  const rounds = KO_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABEL[stage] ?? stage,
    items: matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
  })).filter((r) => r.items.length > 0);

  const definidos = matches.filter(
    (m) => !isPlaceholder(m.homeTeam) && !isPlaceholder(m.awayTeam),
  ).length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={styles.title}>Cuadro de eliminatorias</Text>
      <Text style={styles.subtitle}>
        {matches.length === 0
          ? 'Las eliminatorias aparecerán cuando termine la fase de grupos.'
          : `${definidos}/${matches.length} cruces definidos · se van rellenando conforme avanza el Mundial.`}
      </Text>
      <Text style={styles.hint}>
        💡 Cada cruce se abre para pronosticar en Partidos en cuanto se conocen sus dos equipos.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {!loaded ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      ) : rounds.length === 0 ? (
        <Text style={styles.empty}>Aún no hay partidos de eliminatorias.</Text>
      ) : (
        rounds.map((r) => (
          <View key={r.stage} style={styles.round}>
            <Text style={styles.roundLabel}>
              {r.label} <Text style={styles.roundCount}>({r.items.length})</Text>
            </Text>
            {r.items.map((m) => (
              <BracketMatch key={m.id} match={m} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function TeamSide({ team, flag, align }: { team: string; flag: string | null; align: 'left' | 'right' }) {
  const real = !isPlaceholder(team);
  const name = real ? team : 'Por definir';
  return (
    <View
      style={[
        styles.teamSide,
        align === 'right' && { justifyContent: 'flex-end' },
      ]}
    >
      {align === 'left' && real && flag && <Image source={{ uri: flag }} style={styles.flag} />}
      <Text
        style={[styles.teamName, !real && styles.teamNamePlaceholder, { textAlign: align }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {align === 'right' && real && flag && <Image source={{ uri: flag }} style={styles.flag} />}
    </View>
  );
}

function BracketMatch({ match: m }: { match: ApiMatch }) {
  const defined = !isPlaceholder(m.homeTeam) && !isPlaceholder(m.awayTeam);
  const finished = m.status === 'FINISHED' && m.homeScore !== null && m.awayScore !== null;
  const live = m.status === 'LIVE';
  const pred = m.predictions?.[0];

  return (
    <View
      style={[
        styles.match,
        finished ? styles.matchFinished : defined ? styles.matchDefined : styles.matchPending,
      ]}
    >
      <View style={styles.matchRow}>
        <TeamSide team={m.homeTeam} flag={m.homeFlag} align="left" />
        {finished && m.finalHomeScore != null &&
        (m.finalHomeScore !== m.homeScore || m.finalAwayScore !== m.awayScore) ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.score}>{m.finalHomeScore}–{m.finalAwayScore}</Text>
            <Text style={styles.reg90}>90&apos;: {m.homeScore}–{m.awayScore}</Text>
          </View>
        ) : (
          <Text style={styles.score}>
            {finished || live ? `${m.homeScore ?? 0}–${m.awayScore ?? 0}` : 'vs'}
          </Text>
        )}
        <TeamSide team={m.awayTeam} flag={m.awayFlag} align="right" />
      </View>
      <View style={styles.matchMeta}>
        <Text style={styles.metaText}>
          {live ? <Text style={styles.live}>● EN VIVO</Text> : formatDateTime(m.kickoff)}
        </Text>
        {pred ? (
          <Text style={styles.metaText}>
            Tu pron.: <Text style={{ color: colors.ink }}>{pred.homeScore}–{pred.awayScore}</Text>
            {pred.points !== null && (
              <Text style={{ color: pred.points > 0 ? colors.success : colors.muted }}> (+{pred.points})</Text>
            )}
          </Text>
        ) : finished ? (
          <Text style={styles.metaText}>No pronosticaste</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.sm },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.md },
  empty: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
  round: { marginTop: spacing.xl, gap: spacing.sm },
  roundLabel: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  roundCount: { color: colors.muted, fontFamily: fontFamily.body },
  match: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  matchFinished: { borderColor: colors.border, backgroundColor: colors.bgElev },
  matchDefined: { borderColor: colors.accent + '66', backgroundColor: colors.accent + '0D' },
  matchPending: { borderColor: colors.border, backgroundColor: colors.bgElev + '80' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  teamName: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink, flexShrink: 1 },
  teamNamePlaceholder: { color: colors.muted, fontStyle: 'italic' },
  flag: { width: 20, height: 20, borderRadius: 3 },
  score: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, paddingHorizontal: spacing.sm },
  reg90: { fontFamily: fontFamily.body, fontSize: 9, color: colors.muted },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  metaText: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  live: { color: colors.success, fontFamily: fontFamily.bold },
});
