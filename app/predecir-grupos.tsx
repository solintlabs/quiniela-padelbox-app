import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, type ApiMatch } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

type Scores = Record<string, { homeScore: number; awayScore: number }>;

export default function PredecirGruposScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ saved: number; skipped: number } | null>(null);
  const [hasPaid, setHasPaid] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, u] = await Promise.all([api.matches(), api.me()]);
      const groupOnly = (m.matches ?? []).filter((x) => x.stage === 'GROUP');
      setMatches(groupOnly);
      setHasPaid(u.me.hasPaid);
      const init: Scores = {};
      for (const mm of groupOnly) {
        const mine = mm.predictions?.[0];
        if (mine) init[mm.id] = { homeScore: mine.homeScore, awayScore: mine.awayScore };
      }
      setScores(init);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, ApiMatch[]>();
    for (const m of matches) {
      const key = m.group ?? '?';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(m);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, items]) => ({
        group,
        items: items.sort((x, y) => new Date(x.kickoff).getTime() - new Date(y.kickoff).getTime()),
      }));
  }, [matches]);

  const filled = Object.keys(scores).length;

  function setScore(id: string, side: 'h' | 'a', val: string) {
    const n = Math.max(0, Math.min(20, parseInt(val || '0', 10) || 0));
    setScores((prev) => {
      const cur = prev[id] ?? { homeScore: 0, awayScore: 0 };
      return { ...prev, [id]: side === 'h' ? { ...cur, homeScore: n } : { ...cur, awayScore: n } };
    });
  }

  async function submit() {
    if (!hasPaid) return;
    const now = Date.now();
    const offsetMs = 15 * 60_000;
    const items = Object.entries(scores)
      .filter(([id]) => {
        const m = matches.find((x) => x.id === id);
        if (!m) return false;
        const lockedByTime = new Date(m.kickoff).getTime() - offsetMs <= now;
        return !m.lockedAt && m.status === 'SCHEDULED' && !lockedByTime;
      })
      .map(([matchId, s]) => ({ matchId, homeScore: s.homeScore, awayScore: s.awayScore }));
    if (items.length === 0) return;

    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.predictBatch(items);
      setResult({ saved: res.saved, skipped: res.skipped.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>Progreso</Text>
          <Text style={styles.stickyValue}>
            <Text style={{ color: colors.accent }}>{filled}</Text>
            <Text style={{ color: colors.muted }}> / {matches.length}</Text>
          </Text>
        </View>
        <Pressable
          onPress={submit}
          disabled={saving || filled === 0 || !hasPaid}
          style={[styles.cta, (saving || filled === 0 || !hasPaid) && { opacity: 0.5 }]}
        >
          <Text style={styles.ctaText}>{saving ? 'GUARDANDO…' : 'GUARDAR TODO'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Rellena tu quiniela</Text>
        <Text style={styles.subtitle}>
          Pronostica los {matches.length} partidos de fase de grupos. Puedes editar cada uno
          hasta 15 min antes de su kickoff.
        </Text>

        {!hasPaid && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠ Tu cuenta aún no está activa. No se podrán guardar pronósticos.
            </Text>
            <Pressable onPress={() => router.push('/inscripcion')}>
              <Text style={styles.warningCta}>Ver métodos de pago →</Text>
            </Pressable>
          </View>
        )}

        {result && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Guardados {result.saved} pronósticos.
              {result.skipped > 0 && ` (${result.skipped} cerrados durante la edición.)`}
            </Text>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        {grouped.map(({ group, items }) => (
          <View key={group} style={{ marginTop: spacing.xl }}>
            <Text style={styles.groupTitle}>Grupo {group}</Text>
            <View style={styles.groupCard}>
              {items.map((m, i) => {
                const lockedByTime = new Date(m.kickoff).getTime() - 15 * 60_000 <= Date.now();
                const isLocked = !!m.lockedAt || m.status !== 'SCHEDULED' || lockedByTime;
                const s = scores[m.id];
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.matchRow,
                      i > 0 && styles.matchRowBorder,
                      isLocked && { opacity: 0.4 },
                      s && !isLocked && { backgroundColor: '#B6FF3C0A' },
                    ]}
                  >
                    <View style={styles.teamLeft}>
                      {m.homeFlag && <Image source={{ uri: m.homeFlag }} style={styles.flag} />}
                      <Text style={styles.teamName} numberOfLines={1}>{m.homeTeam}</Text>
                    </View>
                    <TextInput
                      value={String(s?.homeScore ?? '')}
                      onChangeText={(v) => setScore(m.id, 'h', v)}
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isLocked}
                      selectTextOnFocus
                      style={[styles.scoreInput, s && !isLocked && styles.scoreInputFilled]}
                    />
                    <Text style={styles.dash}>–</Text>
                    <TextInput
                      value={String(s?.awayScore ?? '')}
                      onChangeText={(v) => setScore(m.id, 'a', v)}
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isLocked}
                      selectTextOnFocus
                      style={[styles.scoreInput, s && !isLocked && styles.scoreInputFilled]}
                    />
                    <View style={styles.teamRight}>
                      <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{m.awayTeam}</Text>
                      {m.awayFlag && <Image source={{ uri: m.awayFlag }} style={styles.flag} />}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  stickyBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: 1,
  },
  stickyLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  stickyValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, marginTop: 2 },
  cta: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  ctaText: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.accentFg, letterSpacing: 0.5 },
  scroll: { padding: spacing.lg, paddingTop: spacing.md },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.sm, lineHeight: 20 },
  warning: { marginTop: spacing.lg, backgroundColor: colors.warning + '20', borderColor: colors.warning + '80', borderWidth: 2, borderRadius: radius.lg, padding: spacing.lg },
  warningText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  warningCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.warning, marginTop: spacing.sm },
  successBox: { marginTop: spacing.lg, backgroundColor: colors.success + '20', borderColor: colors.success + '80', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  successText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.md, textAlign: 'center' },
  groupTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginBottom: spacing.sm },
  groupCard: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  matchRowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  teamLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  teamRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, minWidth: 0 },
  flag: { width: 18, height: 18, borderRadius: 3 },
  teamName: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.ink, flex: 1 },
  scoreInput: {
    width: 32, height: 32, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm,
    backgroundColor: colors.bg, color: colors.ink, textAlign: 'center',
    fontFamily: fontFamily.display, fontSize: 16,
  },
  scoreInputFilled: { borderColor: colors.accent + '66', backgroundColor: '#B6FF3C15' },
  dash: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },
});
