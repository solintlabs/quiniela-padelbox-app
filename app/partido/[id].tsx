import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL, timeLeft } from '@/lib/format';

const MIN = 0;
const MAX = 20;

type AllPred = {
  id: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  user: { id: string; name: string | null; email: string };
  isMe: boolean;
};

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasPaid, setHasPaid] = useState(true);
  const [allPredictions, setAllPredictions] = useState<AllPred[] | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, u] = await Promise.all([api.match(id!), api.me()]);
      setMatch(m.match);
      setHasPaid(u.me.hasPaid);
      const mine = m.match.predictions?.[0];
      if (mine) {
        setHome(mine.homeScore);
        setAway(mine.awayScore);
      }
      setLoaded(true);

      // Si el partido está cerrado, intentar cargar los pronósticos de todos
      const lockedByTime = new Date(m.match.kickoff).getTime() - 15 * 60_000 <= Date.now();
      const isLocked = !!m.match.lockedAt || m.match.status !== 'SCHEDULED' || lockedByTime;
      if (isLocked) {
        try {
          const all = await api.matchPredictions(id!);
          setAllPredictions(all.predictions);
        } catch {
          // 403 esperable si justo se cierra; ignorar
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!match) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.predict(match.id, home, away);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded || !match) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  const isFinished = match.status === 'FINISHED';
  const isLockedByTime = new Date(match.kickoff).getTime() - 15 * 60_000 <= Date.now();
  const isLocked = !!match.lockedAt || match.status !== 'SCHEDULED' || isLockedByTime;
  const disabled = isLocked || !hasPaid;
  const stageLabel =
    match.stage === 'GROUP' && match.group ? `Grupo ${match.group}` : STAGE_LABEL[match.stage] ?? match.stage;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Partidos</Text>
      </Pressable>

      <View style={styles.heroHeader}>
        <Text style={styles.meta}>
          {stageLabel} · {formatDateTime(match.kickoff)}
        </Text>
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            {match.homeFlag && <Image source={{ uri: match.homeFlag }} style={styles.bigFlag} />}
            <Text style={styles.teamName}>{match.homeTeam}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.teamCol}>
            {match.awayFlag && <Image source={{ uri: match.awayFlag }} style={styles.bigFlag} />}
            <Text style={styles.teamName}>{match.awayTeam}</Text>
          </View>
        </View>
        {!isLocked && (
          <Text style={styles.countdown}>Cierra en {timeLeft(match.kickoff)}</Text>
        )}
        {isFinished && (
          <Text style={styles.finalScore}>
            {match.homeScore} – {match.awayScore}
          </Text>
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>
          Pronósticos de los demás{isLocked && allPredictions ? ` (${allPredictions.length})` : ''}
        </Text>
        {!isLocked ? (
          <View style={[styles.allList, { padding: spacing.lg, gap: spacing.sm }]}>
            <Text style={{ color: colors.ink, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' }}>
              🔒 Se desbloquean <Text style={{ fontFamily: fontFamily.bold }}>15 min antes del kickoff</Text>.
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.xs, textAlign: 'center' }}>
              Vuelve aquí cuando el partido se cierre.
            </Text>
          </View>
        ) : !allPredictions || allPredictions.length === 0 ? (
          <View style={[styles.allList, { padding: spacing.lg }]}>
            <Text style={{ color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' }}>
              Nadie hizo pronóstico para este partido.
            </Text>
          </View>
        ) : (
          <View style={styles.allList}>
            {allPredictions.map((p, i) => {
              const label =
                p.points === 3 ? '+3 exacto' : p.points === 1 ? '+1 ganador' : p.points === 0 ? '0' : '—';
              const labelColor =
                p.points === 3 ? colors.success : p.points === 1 ? colors.warning : colors.muted;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.allRow,
                    i > 0 && styles.allRowBorder,
                    p.isMe && { backgroundColor: '#B6FF3C0F' },
                  ]}
                >
                  <Text style={styles.allUser} numberOfLines={1}>
                    {p.user.name ?? p.user.email}
                    {p.isMe && <Text style={{ color: colors.muted }}>  · tú</Text>}
                  </Text>
                  <Text style={styles.allScore}>{p.homeScore}–{p.awayScore}</Text>
                  <Text style={[styles.allPoints, { color: labelColor }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.formCard}>
        <View style={styles.scoreRow}>
          <ScoreInput label={match.homeTeam} value={home} onChange={setHome} disabled={disabled} />
          <Text style={styles.dash}>–</Text>
          <ScoreInput label={match.awayTeam} value={away} onChange={setAway} disabled={disabled} />
        </View>

        {disabled ? (
          <Text style={styles.disabledMsg}>
            {!hasPaid
              ? 'Tu cuenta aún no está activada. Contacta con PADELBOX.'
              : isFinished
                ? 'Este partido ha terminado.'
                : 'Este partido ya no admite cambios.'}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Button title={saving ? 'GUARDANDO…' : saved ? 'GUARDADO ✓' : 'GUARDAR PRONÓSTICO'} onPress={submit} loading={saving} />
            {error && <Text style={styles.error}>{error}</Text>}
            {saved && !error && (
              <Text style={styles.success}>Pronóstico guardado.</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  function clamp(n: number) {
    if (Number.isNaN(n)) return 0;
    return Math.max(MIN, Math.min(MAX, Math.floor(n)));
  }
  return (
    <View style={styles.scoreInputCol}>
      <Text style={styles.scoreLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.scoreRowInner}>
        <Pressable
          onPress={() => onChange(clamp(value - 1))}
          disabled={disabled || value <= MIN}
          style={[styles.scoreBtn, (disabled || value <= MIN) && { opacity: 0.3 }]}
        >
          <Text style={styles.scoreBtnText}>−</Text>
        </Pressable>
        <TextInput
          value={String(value)}
          onChangeText={(t) => onChange(clamp(parseInt(t || '0', 10)))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          editable={!disabled}
          style={[styles.scoreInput, disabled && { opacity: 0.6 }]}
        />
        <Pressable
          onPress={() => onChange(clamp(value + 1))}
          disabled={disabled || value >= MAX}
          style={[styles.scoreBtn, (disabled || value >= MAX) && { opacity: 0.3 }]}
        >
          <Text style={styles.scoreBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },
  heroHeader: { alignItems: 'center', gap: spacing.md },
  meta: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' },
  teamCol: { alignItems: 'center', flex: 1 },
  bigFlag: { width: 56, height: 56, borderRadius: 28, marginBottom: spacing.sm },
  teamName: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, textAlign: 'center' },
  vs: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.muted },
  countdown: { color: colors.accent, fontFamily: fontFamily.semibold, fontSize: fontSize.sm },
  finalScore: { fontFamily: fontFamily.display, fontSize: fontSize.hero, color: colors.ink },
  formCard: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  dash: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.muted, marginBottom: spacing.md },
  scoreInputCol: { alignItems: 'center', flex: 1, gap: spacing.sm },
  scoreLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', maxWidth: '100%' },
  scoreRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    borderColor: colors.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreBtnText: { color: colors.ink, fontSize: 20 },
  scoreInput: {
    width: 56, height: 56,
    backgroundColor: '#B6FF3C10',
    borderColor: colors.accent + '66',
    borderWidth: 1,
    borderRadius: radius.lg,
    textAlign: 'center',
    color: colors.ink,
    fontFamily: fontFamily.display,
    fontSize: 28,
  },
  disabledMsg: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' },
  success: { color: colors.success, fontFamily: fontFamily.body, fontSize: fontSize.sm },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.ink, marginBottom: spacing.sm },
  allList: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  allRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  allRowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  allUser: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  allScore: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, width: 60, textAlign: 'center' },
  allPoints: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, width: 80, textAlign: 'right' },
});
