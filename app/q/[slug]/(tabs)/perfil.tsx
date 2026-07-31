import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, spacing } from '@/lib/theme';
import { saasApi, type SaasPlayerProfile } from '@/lib/saas-api';
import { clearToken } from '@/lib/auth';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, ui } from '@/components/tenantUi';
import { Button } from '@/components/Button';

/**
 * Tú en esta quiniela: nombre (editable), estado de inscripción, stats y tus
 * pronósticos. Y SIEMPRE a mano: volver a Mis quinielas y cerrar sesión.
 */
export default function PerfilTab() {
  const { data, slug, accent } = useTenant();
  const membershipId = data?.me.membershipId;
  const [profile, setProfile] = useState<SaasPlayerProfile | null>(null);

  useEffect(() => {
    if (!membershipId) return;
    let alive = true;
    saasApi
      .player(slug, membershipId)
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug, membershipId]);

  function logout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (!data) return <TabScreen>{null}</TabScreen>;

  return (
    <TabScreen>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>Tú en esta quiniela</Text>
        <Text style={[s.name, { color: accent }]}>
          {profile?.player.name ?? data.me.displayName ?? 'Jugador'}
        </Text>
        <Text style={ui.cardMeta}>
          {data.me.role === 'OWNER'
            ? 'Organizador'
            : data.me.role === 'ADMIN'
              ? 'Admin'
              : data.me.hasPaid
                ? 'Inscripción confirmada ✓'
                : 'Inscripción pendiente de confirmar'}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Cambiar mi nombre"
            variant="secondary"
            onPress={() => {
              Alert.prompt?.(
                'Tu nombre',
                'Cómo te verán en esta quiniela',
                async (name) => {
                  if (!name?.trim()) return;
                  try {
                    await saasApi.rename(slug, name.trim());
                    Alert.alert('Listo', `Ahora eres "${name.trim()}" aquí.`);
                  } catch (e) {
                    Alert.alert('No se pudo', e instanceof Error ? e.message : 'Inténtalo de nuevo');
                  }
                },
                'plain-text',
              );
            }}
          />
        </View>
      </View>

      {profile && (
        <View style={s.statsRow}>
          <View style={[s.statBox, { borderColor: accent }]}>
            <Text style={[s.statValue, { color: accent }]}>{profile.stats.points}</Text>
            <Text style={ui.cardMeta}>Puntos</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{profile.stats.exact}</Text>
            <Text style={ui.cardMeta}>Exactos</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{profile.stats.total}</Text>
            <Text style={ui.cardMeta}>Pronósticos</Text>
          </View>
        </View>
      )}

      {profile && profile.predictions.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Mis pronósticos</Text>
          {profile.predictions.map((p) => (
            <View key={p.id} style={s.predRow}>
              <Text style={s.predMatch} numberOfLines={1}>
                {p.home} — {p.away}
              </Text>
              <Text style={s.predScore}>
                {p.homeScore}–{p.awayScore}
              </Text>
              <Text style={[s.predPts, p.points !== null && p.points > 0 && { color: accent }]}>
                {p.points !== null ? `+${p.points}` : '·'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Navegación global: siempre visible, como pidió el dueño. */}
      <Pressable onPress={() => router.navigate('/quinielas')} style={ui.linkRow}>
        <Text style={ui.linkLabel}>🏆 Mis quinielas</Text>
        <Text style={ui.linkArrow}>→</Text>
      </Pressable>

      <Button title="Cerrar sesión" variant="secondary" onPress={logout} />
    </TabScreen>
  );
}

const s = StyleSheet.create({
  name: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predMatch: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  predScore: { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.ink },
  predPts: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.muted,
    minWidth: 30,
    textAlign: 'right',
  },
});
