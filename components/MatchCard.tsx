import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL, timeLeft } from '@/lib/format';

interface Props {
  match: ApiMatch;
}

export function MatchCard({ match }: Props) {
  const mine = match.predictions?.[0];
  const isFinished = match.status === 'FINISHED';
  const isLockedByTime = new Date(match.kickoff).getTime() - 15 * 60_000 <= Date.now();
  const isLocked = !!match.lockedAt || match.status !== 'SCHEDULED' || isLockedByTime;

  const stageLabel =
    match.stage === 'GROUP' && match.group ? `Grupo ${match.group}` : STAGE_LABEL[match.stage] ?? match.stage;

  return (
    <Link href={`/partido/${match.id}`} asChild>
      <Pressable
        style={[
          styles.card,
          !isLocked && styles.cardOpen,
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.meta}>
            {stageLabel} · {formatDateTime(match.kickoff)}
          </Text>
          {isFinished ? (
            <PointsBadge points={mine?.points ?? null} />
          ) : isLocked ? (
            <Text style={styles.metaMuted}>Cerrado</Text>
          ) : (
            <Text style={styles.metaAccent}>{timeLeft(match.kickoff)}</Text>
          )}
        </View>

        <View style={styles.teams}>
          <View style={styles.teamLeft}>
            {match.homeFlag && (
              <Image source={{ uri: match.homeFlag }} style={styles.flag} />
            )}
            <Text style={styles.team} numberOfLines={1}>
              {match.homeTeam}
            </Text>
          </View>
          <Text style={styles.score}>
            {isFinished ? `${match.homeScore} – ${match.awayScore}` : '– vs –'}
          </Text>
          <View style={styles.teamRight}>
            <Text style={[styles.team, { textAlign: 'right' }]} numberOfLines={1}>
              {match.awayTeam}
            </Text>
            {match.awayFlag && (
              <Image source={{ uri: match.awayFlag }} style={styles.flag} />
            )}
          </View>
        </View>

        {mine && (
          <Text style={styles.pred}>
            Tu pronóstico: <Text style={styles.predValue}>{mine.homeScore}–{mine.awayScore}</Text>
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return <Text style={styles.metaMuted}>Calculando…</Text>;
  if (points === 3) return <Text style={[styles.metaAccent, { color: colors.success }]}>+3 ✓</Text>;
  if (points === 1) return <Text style={[styles.metaAccent, { color: colors.warning }]}>+1</Text>;
  return <Text style={styles.metaMuted}>0 pts</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardOpen: {
    borderColor: colors.accent + '50',
    backgroundColor: '#B6FF3C0D',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  metaMuted: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  metaAccent: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  flag: { width: 24, height: 24, borderRadius: 4 },
  team: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink, flex: 1 },
  score: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, minWidth: 70, textAlign: 'center' },
  pred: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.xs },
  predValue: { color: colors.ink, fontFamily: fontFamily.semibold },
});
