import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { api, type ApiUser } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { registerForPushAsync, unregisterPushAsync } from '@/lib/push';
import { useI18n, type Locale } from '@/lib/i18n';
import { Button } from '@/components/Button';

/**
 * Tu cuenta QuinielaBOX (global, no de una quiniela concreta): tus datos,
 * notificaciones, cierre de sesión y eliminación de cuenta (requisito de las
 * stores). El perfil DENTRO de cada quiniela vive en su pestaña Perfil.
 */
export default function CuentaScreen() {
  const [me, setMe] = useState<ApiUser | null>(null);
  const { t, locale, setLocale } = useI18n();

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
      <Stack.Screen options={{ title: t('account.title') }} />

      <View style={styles.card}>
        <Text style={styles.avatar}>{(me?.name ?? me?.email ?? '?').slice(0, 1).toUpperCase()}</Text>
        <Text style={styles.name}>{me?.name ?? '—'}</Text>
        <Text style={styles.email}>{me?.email ?? '…'}</Text>
      </View>

      <Row
        icon="notifications-outline"
        label={t('account.notifications')}
        onPress={enableNotifications}
      />
      <Row
        icon="trophy-outline"
        label={t('account.myPools')}
        onPress={() => router.navigate('/quinielas')}
      />
      <Row
        icon="chatbubble-ellipses-outline"
        label={t('account.support')}
        external
        onPress={() => Linking.openURL('https://www.quinielabox.com/soporte')}
      />

      {/* Idioma de la app (el contenido de cada quiniela lo escribe su organizador). */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons name="globe-outline" size={19} color={colors.ink} />
          <Text style={styles.rowLabel}>{t('account.language')}</Text>
        </View>
        <View style={styles.langChips}>
          {(['es', 'en'] as Locale[]).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLocale(l)}
              style={[styles.langChip, locale === l && styles.langChipOn]}
            >
              <Text style={[styles.langChipText, locale === l && { color: colors.accentFg }]}>
                {l.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ height: spacing.xl }} />
      <Button title={t('account.logout')} variant="secondary" onPress={logout} />

      <Pressable onPress={confirmDelete} style={{ marginTop: spacing.xl }}>
        <Text style={styles.deleteLink}>{t('account.delete')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  external,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  external?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={19} color={colors.ink} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={16}
        color={colors.muted}
      />
    </Pressable>
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  langChips: { flexDirection: 'row', gap: 6 },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  langChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  langChipText: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.ink },
  deleteLink: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
