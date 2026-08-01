import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { api, type ApiUser } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { registerForPushAsync, unregisterPushAsync } from '@/lib/push';
import { Button } from '@/components/Button';

/**
 * Tu cuenta QuinielaBOX (global, no de una quiniela concreta): tus datos,
 * notificaciones, cierre de sesión y eliminación de cuenta (requisito de las
 * stores). El perfil DENTRO de cada quiniela vive en su pestaña Perfil.
 */
export default function CuentaScreen() {
  const [me, setMe] = useState<ApiUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .me()
        .then((r) => setMe(r.me))
        .catch(() => {});
    }, []),
  );

  async function enableNotifications() {
    const ok = await registerForPushAsync();
    Alert.alert(
      'Notificaciones',
      ok
        ? '✓ Activadas. Te avisaremos antes de que cierren los pronósticos.'
        : 'No se pudieron activar. Revisa los permisos de QuinielaBOX en Ajustes.',
    );
  }

  function logout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await unregisterPushAsync();
          } catch {}
          await clearToken();
          router.replace('/(auth)/(tabs)/login');
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu perfil, pronósticos e historial en TODAS tus quinielas. Es permanente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await unregisterPushAsync();
              } catch {}
              await api.deleteAccount();
              await clearToken();
              Alert.alert('Cuenta eliminada', 'Tus datos han sido borrados.', [
                { text: 'OK', onPress: () => router.replace('/(auth)/(tabs)/login') },
              ]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
    >
      <Stack.Screen options={{ title: 'Mi cuenta' }} />

      <View style={styles.card}>
        <Text style={styles.avatar}>{(me?.name ?? me?.email ?? '?').slice(0, 1).toUpperCase()}</Text>
        <Text style={styles.name}>{me?.name ?? 'Sin nombre'}</Text>
        <Text style={styles.email}>{me?.email ?? '…'}</Text>
      </View>

      <Pressable onPress={enableNotifications} style={styles.row}>
        <Text style={styles.rowLabel}>🔔 Activar notificaciones</Text>
        <Text style={styles.rowArrow}>→</Text>
      </Pressable>
      <Pressable onPress={() => router.navigate('/quinielas')} style={styles.row}>
        <Text style={styles.rowLabel}>🏆 Mis quinielas</Text>
        <Text style={styles.rowArrow}>→</Text>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL('https://www.quinielabox.com/soporte')}
        style={styles.row}
      >
        <Text style={styles.rowLabel}>💬 Soporte</Text>
        <Text style={styles.rowArrow}>↗</Text>
      </Pressable>

      <View style={{ height: spacing.xl }} />
      <Button title="Cerrar sesión" variant="secondary" onPress={logout} />

      <Pressable onPress={confirmDelete} style={{ marginTop: spacing.xl }}>
        <Text style={styles.deleteLink}>Eliminar mi cuenta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    color: colors.accentFg,
    fontFamily: fontFamily.display,
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 62,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  email: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  rowArrow: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.muted },
  deleteLink: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
