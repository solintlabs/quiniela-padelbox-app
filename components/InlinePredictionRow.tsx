import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime, STAGE_LABEL, timeLeft } from '@/lib/format';

interface Props {
  match: ApiMatch;
  canEdit: boolean;
  /** Controlado: el wrapper PartidosClient maneja valores. */
  homeValue: number;
  awayValue: number;
  onChange: (matchId: string, home: number, away: number) => void;
  dirty: boolean;
  /** Guardado en este cliente (aunque match.predictions aún no refrescó). */
  savedLocally?: boolean;
  saving: boolean;
  error: string | null;
  onSave: (matchId: string) => void;
}

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(20, Math.floor(n)));
}

export function InlinePredictionRow({
  match,
  canEdit,
  homeValue,
  awayValue,
  onChange,
  dirty,
  savedLocally,
  saving,
  error,
  onSave,
}: Props) {
  const initial = match.predictions?.[0];
  const hasInitial = !!initial || !!savedLocally;

  const isFinished = match.status === 'FINISHED';
  const isLockedByTime = new Date(match.kickoff).getTime() - 15 * 60_000 <= Date.now();
  const isLocked = !!match.lockedAt || match.status !== 'SCHEDULED' || isLockedByTime;

  const stageLabel =
    match.group === 'LIGA'
      ? 'La Liga'
      : match.stage === 'GROUP' && match.group
        ? `Grupo ${match.group}`
        : STAGE_LABEL[match.stage] ?? match.stage;

  return (
    <View
      style={[
        styles.card,
        !isLocked && dirty && styles.cardDirty,
        !isLocked && !dirty && hasInitial && styles.cardWithPred,
        !isLocked && !dirty && !hasInitial && styles.cardOpen,
      ]}
    >
      <Link href={`/partido/${match.id}`} asChild>
        <Pressable style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.meta} numberOfLines={1}>
              {stageLabel} · {formatDateTime(match.kickoff)}
            </Text>
            {match.venue && (
              <Text style={styles.venue} numberOfLines={1}>
                📍 {match.venue}
              </Text>
            )}
          </View>
          {isFinished ? (
            <PointsBadge points={initial?.points ?? null} />
          ) : isLocked ? (
            <Text style={styles.metaMuted}>Cerrado ›</Text>
          ) : (
            <Text style={styles.metaAccent}>{timeLeft(match.kickoff)} ›</Text>
          )}
        </Pressable>
      </Link>

      {/* Fila de equipos: bandera + nombre completo a cada lado.
          Los nombres tienen ancho propio (antes se truncaban a 1 letra
          porque los steppers en medio comian todo el espacio). */}
      <View style={styles.teamsRow}>
        <View style={styles.teamSide}>
          {match.homeFlag && <Image source={{ uri: match.homeFlag }} style={styles.flag} />}
          <Text style={styles.teamName} numberOfLines={1}>
            {match.homeTeam}
          </Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={[styles.teamSide, styles.teamSideRight]}>
          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam}
          </Text>
          {match.awayFlag && <Image source={{ uri: match.awayFlag }} style={styles.flag} />}
        </View>
      </View>

      {/* Fila de marcador / steppers centrada debajo de los nombres */}
      <View style={styles.scoreRow}>
        {isFinished ? (
          <Text style={styles.score}>
            {match.homeScore}–{match.awayScore}
          </Text>
        ) : isLocked ? (
          match.status === 'LIVE' && match.homeScore !== null && match.awayScore !== null ? (
            <View style={styles.liveRow}>
              <Text style={styles.score}>
                {match.homeScore}–{match.awayScore}
              </Text>
              <Text style={styles.liveBadge}>● EN VIVO</Text>
            </View>
          ) : (
            <Text style={styles.scoreMuted}>– vs –</Text>
          )
        ) : canEdit ? (
          <View style={styles.steppers}>
            <Stepper value={homeValue} onChange={(v) => onChange(match.id, clamp(v), awayValue)} disabled={saving} />
            <Text style={styles.scoreDash}>–</Text>
            <Stepper value={awayValue} onChange={(v) => onChange(match.id, homeValue, clamp(v))} disabled={saving} />
          </View>
        ) : (
          <Link href="/inscripcion" asChild>
            <Pressable style={styles.lockedCta}>
              <Text style={styles.lockedCtaText}>Inscríbete para predecir</Text>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.footer}>
        {(isFinished || isLocked) && initial ? (
          <Text style={styles.footerLeft}>
            Tu pronóstico:{' '}
            <Text style={styles.footerScore}>
              {initial.homeScore}–{initial.awayScore}
            </Text>
          </Text>
        ) : isLocked && !initial && canEdit ? (
          <Text style={styles.footerMuted}>No pronosticaste este partido</Text>
        ) : !isLocked && canEdit ? (
          <View style={styles.footerLeftRow}>
            {saving && <ActivityIndicator size="small" color={colors.muted} />}
            {!saving && dirty && <Text style={styles.footerDirty}>● Sin guardar</Text>}
            {!saving && !dirty && hasInitial && <Text style={styles.footerSaved}>✓ Guardado</Text>}
            {!saving && !dirty && !hasInitial && <Text style={styles.footerMuted}>Sin pronóstico</Text>}
            {!!error && <Text style={styles.footerError}>{error}</Text>}
          </View>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {/* Boton Guardar: visible si hay cambios (dirty) O si el partido aun
              no tiene pronostico guardado (asi se puede guardar el 0-0 por
              defecto directamente, sin tener que tocar los steppers). */}
          {!isLocked && canEdit && (dirty || !hasInitial) && (
            <Pressable
              onPress={() => onSave(match.id)}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            >
              <Text style={styles.saveBtnText}>{saving ? '…' : 'Guardar'}</Text>
            </Pressable>
          )}
          <Link href={`/partido/${match.id}`} asChild>
            <Pressable>
              <Text style={styles.footerLink}>
                {isLocked ? 'Ver →' : 'Detalle →'}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Tendencia agregada de predicciones (% local/empate/visitante).
          Sin marcadores individuales ni numero total. Solo si hay >=3 preds
          y el partido no ha finalizado. */}
      {match.distribution && !isFinished && (
        <DistributionBar
          dist={match.distribution}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
      )}
    </View>
  );
}

function DistributionBar({
  dist,
  homeTeam,
  awayTeam,
}: {
  dist: { homePct: number; drawPct: number; awayPct: number };
  homeTeam: string;
  awayTeam: string;
}) {
  const { homePct, drawPct, awayPct } = dist;
  return (
    <View style={styles.distWrap}>
      <Text style={styles.distLabel}>CÓMO PREDICEN</Text>
      <View style={styles.distBar}>
        {homePct > 0 && <View style={[styles.distSeg, { width: `${homePct}%`, backgroundColor: 'rgba(34,197,94,0.85)' }]} />}
        {drawPct > 0 && <View style={[styles.distSeg, { width: `${drawPct}%`, backgroundColor: 'rgba(245,158,11,0.85)' }]} />}
        {awayPct > 0 && <View style={[styles.distSeg, { width: `${awayPct}%`, backgroundColor: 'rgba(59,130,246,0.85)' }]} />}
      </View>
      <View style={styles.distLegend}>
        <Text style={[styles.distLegendText, { textAlign: 'left' }]}>● {homePct}%</Text>
        <Text style={[styles.distLegendText, { textAlign: 'center' }]}>{drawPct}% empate</Text>
        <Text style={[styles.distLegendText, { textAlign: 'right' }]}>{awayPct}% ●</Text>
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
  cardDirty: {
    borderColor: colors.warning + 'AA',
    backgroundColor: colors.warning + '12',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  venue: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, opacity: 0.85, marginTop: 1 },
  metaMuted: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  metaAccent: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  teamSideRight: { justifyContent: 'flex-end' },
  vs: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  teamName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink, flexShrink: 1 },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm, marginBottom: 2 },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  flag: { width: 24, height: 24, borderRadius: 4 },
  team: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink, flex: 1 },
  score: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, minWidth: 70, textAlign: 'center' },
  scoreMuted: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.muted, minWidth: 70, textAlign: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveBadge: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.success, letterSpacing: 1 },
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
  footerDirty: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.warning },
  footerMuted: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  saveBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm },
  saveBtnText: { fontFamily: fontFamily.display, fontSize: 11, color: colors.accentFg, letterSpacing: 0.3 },
  footerError: { fontFamily: fontFamily.body, fontSize: 11, color: colors.danger },
  footerLink: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  distWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  distLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.muted,
    marginBottom: 5,
  },
  distBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  distSeg: { height: '100%' },
  distLegend: { flexDirection: 'row', marginTop: 4 },
  distLegendText: { flex: 1, fontFamily: fontFamily.body, fontSize: 10, color: colors.muted },
});
