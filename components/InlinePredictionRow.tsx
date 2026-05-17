import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL, timeLeft } from '@/lib/format';

interface Props {
  match: ApiMatch;
  canEdit: boolean;
  onSaved?: () => void;
}

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(20, Math.floor(n)));
}

export function InlinePredictionRow({ match, canEdit, onSaved }: Props) {
  const initial = match.predictions?.[0];
  const [home, setHome] = useState<number>(initial?.homeScore ?? 0);
  const [away, setAway] = useState<number>(initial?.awayScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);

  const isFinished = match.status === 'FINISHED';
  const isLockedByTime = new Date(match.kickoff).getTime() - 15 * 60_000 <= Date.now();
  const isLocked = !!match.lockedAt || match.status !== 'SCHEDULED' || isLockedByTime;

  const stageLabel =
    match.group === 'LIGA'
      ? 'La Liga'
      : match.stage === 'GROUP' && match.group
        ? `Grupo ${match.group}`
        : STAGE_LABEL[match.stage] ?? match.stage;

  async function save(h: number, a: number) {
    if (!canEdit || isLocked) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.predict(match.id, h, a);
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  function update(h: number, a: number) {
    setHome(h);
    setAway(a);
    void save(h, a);
  }

  return (
    <View
      style={[
        styles.card,
        !isLocked && !!initial && styles.cardWithPred,
        !isLocked && !initial && styles.cardOpen,
      ]}
    >
      <Link href={`/partido/${match.id}`} asChild>
        <Pressable style={styles.headerRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {stageLabel} · {formatDateTime(match.kickoff)}
          </Text>
          {isFinished ? (
            <PointsBadge points={initial?.points ?? null} />
          ) : isLocked ? (
            <Text style={styles.metaMuted}>Cerrado ›</Text>
          ) : (
            <Text style={styles.metaAccent}>{timeLeft(match.kickoff)} ›</Text>
          )}
        </Pressable>
      </Link>

      <View style={styles.teams}>
        <View style={styles.teamLeft}>
          {match.homeFlag && <Image source={{ uri: match.homeFlag }} style={styles.flag} />}
          <Text style={styles.team} numberOfLines={1}>
            {match.homeTeam}
          </Text>
        </View>

        {isFinished ? (
          <Text style={styles.score}>
            {match.homeScore}–{match.awayScore}
          </Text>
        ) : isLocked ? (
          <Text style={styles.scoreMuted}>– vs –</Text>
        ) : canEdit ? (
          <View style={styles.steppers}>
            <Stepper value={home} onChange={(v) => update(clamp(v), away)} disabled={saving} />
            <Text style={styles.scoreDash}>–</Text>
            <Stepper value={away} onChange={(v) => update(home, clamp(v))} disabled={saving} />
          </View>
        ) : (
          <Link href="/inscripcion" asChild>
            <Pressable style={styles.lockedCta}>
              <Text style={styles.lockedCtaText}>Inscríbete{'\n'}para predecir</Text>
            </Pressable>
          </Link>
        )}

        <View style={styles.teamRight}>
          <Text style={[styles.team, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam}
          </Text>
          {match.awayFlag && <Image source={{ uri: match.awayFlag }} style={styles.flag} />}
        </View>
      </View>

      <View style={styles.footer}>
        {isFinished && initial ? (
          <Text style={styles.footerLeft}>
            Tu pronóstico:{' '}
            <Text style={styles.footerScore}>
              {initial.homeScore}–{initial.awayScore}
            </Text>
          </Text>
        ) : !isLocked && canEdit ? (
          <View style={styles.footerLeftRow}>
            {saving && <ActivityIndicator size="small" color={colors.muted} />}
            {!saving && saved && <Text style={styles.footerSaved}>✓ Guardado</Text>}
            {!!error && <Text style={styles.footerError}>{error}</Text>}
          </View>
        ) : (
          <View />
        )}
        <Link href={`/partido/${match.id}`} asChild>
          <Pressable>
            <Text style={styles.footerLink}>
              {isLocked ? 'Ver pronósticos de todos →' : 'Ver detalle →'}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepperBox}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
        style={[styles.stepperBtn, (disabled || value <= 0) && styles.stepperBtnDisabled]}
        hitSlop={6}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <View style={styles.stepperValue}>
        <Text style={styles.stepperValueText}>{value}</Text>
      </View>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={disabled || value >= 20}
        style={[styles.stepperBtn, (disabled || value >= 20) && styles.stepperBtnDisabled]}
        hitSlop={6}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
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
    borderColor: colors.accent + '40',
    backgroundColor: '#B6FF3C08',
  },
  cardWithPred: {
    borderColor: colors.accent + '70',
    backgroundColor: '#B6FF3C12',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, flex: 1 },
  metaMuted: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  metaAccent: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  flag: { width: 24, height: 24, borderRadius: 4 },
  team: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink, flex: 1 },
  score: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, minWidth: 70, textAlign: 'center' },
  scoreMuted: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.muted, minWidth: 70, textAlign: 'center' },
  scoreDash: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  steppers: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepperBtn: {
    width: 28,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontFamily: fontFamily.semibold, fontSize: 18, color: colors.ink, lineHeight: 20 },
  stepperValue: {
    minWidth: 34,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent + '60',
    backgroundColor: colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  stepperValueText: { fontFamily: fontFamily.display, fontSize: 16, color: colors.ink },
  lockedCta: {
    paddingHorizontal: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  lockedCtaText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: colors.warning,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  footerLeft: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  footerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerScore: { color: colors.ink, fontFamily: fontFamily.semibold },
  footerSaved: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.success },
  footerError: { fontFamily: fontFamily.body, fontSize: 11, color: colors.danger },
  footerLink: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
});
