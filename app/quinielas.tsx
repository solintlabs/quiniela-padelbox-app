import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { saasApi, type SaasTenantSummary } from '@/lib/saas-api';
import { Button } from '@/components/Button';

/**
 * Hub "Mis quinielas" — la pantalla de INICIO de la app (marca QuinielaBOX).
 * PADELBOX es una quiniela más de la lista; las SaaS vienen del backend.
 * Si el SaaS está apagado (404) la lista queda solo con PADELBOX.
 */
export default function QuinielasHub() {
  const [tenants, setTenants] = useState<SaasTenantSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await saasApi.tenants();
      setTenants(data.tenants);
    } catch {
      // SaaS apagado o sin red: el hub sigue funcionando con PADELBOX.
      setTenants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.brandRow}>
        <Text style={styles.brand}>
          Quiniela<Text style={{ color: colors.accent }}>BOX</Text>
        </Text>
      </View>
      <Text style={styles.subtitle}>Mis quinielas</Text>

      {/* PADELBOX: la quiniela original, en su sistema propio. */}
      <Pressable
        onPress={() => router.push('/(tabs)')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={[styles.logoBox, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoLetter}>P</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>PADELBOX</Text>
          <Text style={styles.cardMeta}>Mundial 2026 · Quiniela del club</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.xl }} />
      ) : (
        tenants?.map((t) => (
          <Pressable
            key={t.slug}
            onPress={() => router.push({ pathname: '/q/[slug]', params: { slug: t.slug } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {t.logoUrl ? (
              <Image source={{ uri: t.logoUrl }} style={styles.logoImg} contentFit="contain" />
            ) : (
              <View style={[styles.logoBox, { backgroundColor: t.accentColor ?? colors.accent }]}>
                <Text style={styles.logoLetter}>{t.name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.name}</Text>
              <Text style={styles.cardMeta}>
                {t.role === 'OWNER' ? 'Organizador' : t.role === 'ADMIN' ? 'Admin' : 'Jugador'}
                {t.plan === 'PRO' ? ' · PRO' : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <View style={{ height: spacing.lg }} />
      <Button
        title="＋ Crear mi quiniela"
        onPress={() => router.push('/crear-quiniela')}
      />
      <Pressable onPress={() => router.push('/planes')} style={{ paddingVertical: spacing.lg }}>
        <Text style={styles.plansLink}>Ver planes y precios</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: spacing.xxl },
  brandRow: { alignItems: 'center', marginBottom: spacing.xs },
  brand: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.8 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bg },
  logoLetter: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.accentFg },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.ink },
  cardMeta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: fontSize.xl },
  plansLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.accent,
    textAlign: 'center',
  },
});
