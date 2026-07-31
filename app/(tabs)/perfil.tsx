import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/Button';
import { api, type ApiUser, type ApiMatch } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { formatDateTime } from '@/lib/format';

type Prediction = {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  match: ApiMatch;
};

export default function PerfilScreen() {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, p] = await Promise.all([api.me(), api.myPredictions()]);
      setMe(m.me);
      setPredictions(p.predictions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
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

  async function logout() {
    // Desregistra el push token del backend antes de limpiar la sesión
    // (sino el device sigue recibiendo notificaciones del user anterior).
    try {
      const { unregisterPushAsync } = await import('@/lib/push');
      await unregisterPushAsync();
    } catch {}
    await clearToken();
    router.replace('/(auth)/(tabs)/login');
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Eliminar cuenta',
      '¿Seguro? Se borrarán tu perfil, pronósticos, historial y notificaciones. Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirmación final',
              'Esta es tu última oportunidad. ¿Eliminar tu cuenta definitivamente?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí, eliminar', style: 'destructive', onPress: deleteAccount },
              ],
            ),
        },
      ],
    );
  }

  async function deleteAccount() {
    try {
      // Desregistrar push antes de borrar para no dejar tokens huérfanos.
      try {
        const { unregisterPushAsync } = await import('@/lib/push');
        await unregisterPushAsync();
      } catch {}
      await api.deleteAccount();
      await clearToken();
      Alert.alert(
        'Cuenta eliminada',
        'Tu cuenta y todos tus datos han sido eliminados. Gracias por haber participado.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/(tabs)/login') }],
      );
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'No se pudo eliminar la cuenta. Intenta de nuevo.',
      );
    }
  }

  const totalPoints = predictions.reduce((acc, p) => acc + (p.points ?? 0), 0);
  const played = predictions.filter((p) => p.points !== null).length;
  const exact = predictions.filter((p) => p.points === 3).length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View>
        <Text style={styles.title}>Tu perfil</Text>
        <Text style={styles.subtitle}>{me?.email ?? '…'}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.statusCard}>
        {Platform.OS !== 'ios' && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado de inscripción</Text>
            {me?.hasPaid ? (
              <Text style={[styles.statusValue, { color: colors.success }]}>✓ Activado</Text>
            ) : (
              <Text style={[styles.statusValue, { color: colors.warning }]}>⚠ Pendiente</Text>
            )}
          </View>
        )}
        {me?.createdAt && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Miembro desde</Text>
            <Text style={styles.statusValueSm}>{formatDateTime(me.createdAt)}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Puntos" value={totalPoints} highlight />
        <Stat label="Jugados" value={played} />
        <Stat label="Exactos" value={exact} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Mis pronósticos</Text>
        {predictions.length === 0 ? (
          <Text style={styles.empty}>Aún no has hecho ningún pronóstico.</Text>
        ) : (
          <View style={styles.list}>
            {predictions.map((p, i) => {
              const m = p.match;
              const isFinished = m.status === 'FINISHED';
              const isLockedByTime = new Date(m.kickoff).getTime() - 15 * 60_000 <= Date.now();
              const isLocked = !!m.lockedAt || m.status !== 'SCHEDULED' || isLockedByTime;
              return (
                <View key={p.id} style={[styles.predRow, i > 0 && styles.predRowBorder]}>
                  {m.homeFlag && <Image source={{ uri: m.homeFlag }} style={styles.miniFlag} />}
                  <Text style={styles.predTeams} numberOfLines={1}>
                    {m.homeTeam} <Text style={{ color: colors.muted }}>vs</Text> {m.awayTeam}
                  </Text>
                  {m.awayFlag && <Image source={{ uri: m.awayFlag }} style={styles.miniFlag} />}
                  <Text style={styles.predScore}>{p.homeScore}–{p.awayScore}</Text>
                  <View style={{ width: 60, alignItems: 'flex-end' }}>
                    {isFinished && p.points !== null ? (
                      <Text style={[
                        styles.predBadge,
                        p.points === 3 ? { color: colors.success } : p.points === 1 ? { color: colors.warning } : { color: colors.muted },
                      ]}>
                        +{p.points} pts
                      </Text>
                    ) : isLocked ? (
                      <Text style={[styles.predBadge, { color: colors.muted }]}>Esperando</Text>
                    ) : (
                      <Text style={[styles.predBadge, { color: colors.accent }]}>Abierto</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Link href="/quinielas" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkLabel}>🏆  Mis quinielas</Text>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
        </Link>
        <Link href="/reglas" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkLabel}>📖  Reglas de la quiniela</Text>
            <Text style={styles.linkArrow}>→</Text>
          </Pressable>
        </Link>
        {Platform.OS !== 'ios' && (
          <Link href="/inscripcion" asChild>
            <Pressable style={styles.linkRow}>
              <Text style={styles.linkLabel}>💳  Inscripción y pago</Text>
              <Text style={styles.linkArrow}>→</Text>
            </Pressable>
          </Link>
        )}

        {/* En iOS abrimos la web en Safari: cumple guideline 3.1.3
            (Reader / external account flow) — sin mostrar precios ni
            metodos de pago dentro del binario. */}
        {Platform.OS === 'ios' && (
          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://www.quinielabox.com/inscripcion')}
            accessibilityRole="link"
            accessibilityLabel="Información de inscripción en quinielabox.com"
          >
            <Text style={styles.linkLabel}>💳  Inscripción</Text>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>
        )}

        {/* Panel admin solo para ADMIN — abre web en navegador */}
        {me?.role === 'ADMIN' && (
          <Pressable
            style={[styles.linkRow, { borderColor: colors.accent + '60', backgroundColor: colors.accent + '0D' }]}
            onPress={() => Linking.openURL('https://quiniela.solint.cloud/admin')}
          >
            <Text style={[styles.linkLabel, { color: colors.accent }]}>⚙️  Panel admin (web)</Text>
            <Text style={[styles.linkArrow, { color: colors.accent }]}>↗</Text>
          </Pressable>
        )}
      </View>

      <Button title="Cerrar sesión" variant="secondary" onPress={logout} />

      <Pressable
        onPress={confirmDeleteAccount}
        style={styles.deleteAccountRow}
        accessibilityRole="button"
        accessibilityLabel="Eliminar cuenta"
      >
        <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
      </Pressable>

      <Pressable onPress={() => Linking.openURL('https://solint.cloud')}>
        <Text style={styles.footer}>
          Desarrollado por{' '}
          <Text style={{ color: colors.accent, textDecorationLine: 'underline' }}>Solintlabs</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm },
  statusCard: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  statusValue: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm },
  statusValueSm: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  statLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginTop: spacing.xs },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  empty: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  list: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  predRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  predRowBorder: { borderTopWidth: 1, borderColor: colors.border },
  miniFlag: { width: 20, height: 20, borderRadius: 4 },
  predTeams: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  predScore: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink, width: 50, textAlign: 'center' },
  predBadge: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs },
  footer: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  linkLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  linkArrow: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.muted },
  deleteAccountRow: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteAccountText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
});
