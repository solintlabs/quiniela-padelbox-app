import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { api, type ApiUser } from '@/lib/api';
import { FIFA_2026_GROUPS } from '@/lib/fifa2026';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const ALL_TEAMS: Array<{ team: string; group: string }> = Object.entries(FIFA_2026_GROUPS)
  .flatMap(([group, teams]) => teams.map((t) => ({ team: t, group })))
  .sort((a, b) => a.team.localeCompare(b.team));

export default function ElegirCampeonScreen() {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.me();
      setMe(r.me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_TEAMS;
    return ALL_TEAMS.filter((t) => t.team.toLowerCase().includes(q) || t.group.toLowerCase() === q);
  }, [query]);

  async function pick(team: string | null) {
    if (me?.championLockedAt) return;
    setSaving(team ?? '__clear');
    setError(null);
    try {
      const r = await api.setChampion(team);
      setMe(r.me);
      if (team) {
        setTimeout(() => router.back(), 300);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(null);
    }
  }

  const locked = !!me?.championLockedAt;

  return (
    <>
      <Stack.Screen options={{ title: 'Elegir campeón', headerBackTitle: 'Atrás' }} />
      <View style={styles.container}>
        {/* Estado actual */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>TU CAMPEÓN ACTUAL</Text>
          <Text style={styles.statusValue}>{me?.championPick ?? 'Sin elegir'}</Text>
          {locked ? (
            <Text style={styles.statusHint}>🔒 Congelado al inicio del torneo</Text>
          ) : me?.championPick ? (
            <Pressable onPress={() => pick(null)} disabled={saving !== null} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>{saving === '__clear' ? 'Quitando…' : 'Quitar selección'}</Text>
            </Pressable>
          ) : null}
        </View>

        {!locked && (
          <TextInput
            placeholder="Buscar equipo o letra de grupo (A-L)…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.search}
            autoCapitalize="none"
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList
          data={filtered}
          keyExtractor={(t) => t.team}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => {
            const selected = me?.championPick === item.team;
            const isSaving = saving === item.team;
            return (
              <Pressable
                onPress={() => !locked && !selected && pick(item.team)}
                disabled={locked || selected || saving !== null}
                style={[styles.row, selected && styles.rowSelected]}
              >
                <View style={styles.groupChip}>
                  <Text style={styles.groupChipText}>{item.group}</Text>
                </View>
                <Text style={[styles.teamName, selected && { color: colors.accent }]}>{item.team}</Text>
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : selected ? (
                  <Text style={styles.check}>✓</Text>
                ) : locked ? null : (
                  <Text style={styles.pickArrow}>→</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Sin resultados para &quot;{query}&quot;.</Text>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.md },
  statusCard: {
    borderWidth: 2,
    borderColor: colors.accent + 'AA',
    backgroundColor: colors.accent + '12',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statusLabel: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 3 },
  statusValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginTop: 4 },
  statusHint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 4 },
  clearBtn: { marginTop: spacing.sm, paddingVertical: 6, paddingHorizontal: 14 },
  clearBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.danger, textDecorationLine: 'underline' },
  search: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 44,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  groupChip: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  groupChipText: { fontFamily: fontFamily.display, fontSize: 12, color: colors.muted },
  teamName: { flex: 1, fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  check: { fontFamily: fontFamily.display, fontSize: 18, color: colors.accent },
  pickArrow: { fontFamily: fontFamily.body, fontSize: 16, color: colors.muted },
  empty: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
});
