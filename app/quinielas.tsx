import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { api } from '@/lib/api';
import { saasApi, type SaasTenantSummary } from '@/lib/saas-api';
import { registerForPushAsync } from '@/lib/push';
import { Button } from '@/components/Button';

/**
 * Hub "Mis quinielas" — la HOME de la app. Saluda por su nombre, lista sus
 * quinielas (PADELBOX + SaaS), deja unirse con un código, crear otra,
 * activar notificaciones y entrar a su cuenta. La marca entra animada para
 * que la pantalla tenga vida.
 */
export default function QuinielasHub() {
  const [tenants, setTenants] = useState<SaasTenantSummary[] | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const insets = useSafeAreaInsets();

  // Entrada animada de la marca: sube y aparece con un muelle suave.
  const brandAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(brandAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 60,
    }).start();
  }, [brandAnim]);

  const load = useCallback(async () => {
    try {
      const [data, meRes] = await Promise.all([
        saasApi.tenants().catch(() => ({ tenants: [] as SaasTenantSummary[] })),
        api.me().catch(() => null),
      ]);
      setTenants(data.tenants);
      const name = meRes?.me.name?.trim();
      setFirstName(name ? name.split(/\s+/)[0] : null);
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

  async function enableNotifications() {
    const ok = await registerForPushAsync();
    Alert.alert(
      'Notificaciones',
      ok
        ? '✓ Activadas. Te avisaremos antes de que cierren los pronósticos.'
        : 'No se pudieron activar. Revisa los permisos de QuinielaBOX en Ajustes.',
    );
  }

  async function join() {
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    try {
      const res = await saasApi.join(code);
      setJoinOpen(false);
      setJoinCode('');
      await load();
      router.push({ pathname: '/q/[slug]', params: { slug: code.toLowerCase() } });
      void res;
    } catch (e) {
      Alert.alert(
        'No se pudo',
        e instanceof Error ? e.message : 'Revisa el código: es el nombre corto del link de invitación.',
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
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
      {/* Barra superior: campana + cuenta */}
      <View style={styles.topBar}>
        <Pressable onPress={enableNotifications} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={20} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => router.push('/cuenta')} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="person-circle-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <Animated.View
        style={{
          alignItems: 'center',
          opacity: brandAnim,
          transform: [
            {
              translateY: brandAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            },
            { scale: brandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        }}
      >
        <Text style={styles.brand}>
          Quiniela<Text style={{ color: colors.accent }}>BOX</Text>
        </Text>
        <Text style={styles.hello}>
          {firstName ? `¡Hola, ${firstName}! 👋` : '¡Hola! 👋'} Estas son tus quinielas
        </Text>
      </Animated.View>

      <View style={{ height: spacing.xl }} />

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
      <Button title="＋ Crear mi quiniela" onPress={() => router.push('/crear-quiniela')} />
      <View style={{ height: spacing.sm }} />

      {joinOpen ? (
        <View style={styles.joinBox}>
          <Text style={styles.joinLabel}>Código de la quiniela</Text>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="p. ej. bar-manolo"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={styles.joinInput}
            onSubmitEditing={join}
          />
          <Text style={styles.joinHint}>
            Es el nombre corto del link de invitación: quinielabox.com/saas/<Text style={{ color: colors.ink }}>código</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="secondary" onPress={() => setJoinOpen(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={joining ? 'Uniendo…' : 'Unirme'} loading={joining} onPress={join} />
            </View>
          </View>
        </View>
      ) : (
        <Button title="🎟 Unirme con un código" variant="secondary" onPress={() => setJoinOpen(true)} />
      )}

      <Pressable onPress={() => router.push('/planes')} style={{ paddingVertical: spacing.lg }}>
        <Text style={styles.plansLink}>Ver planes y precios</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  hello: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.xs,
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
  joinBox: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  joinLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  joinInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 46,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
  },
  joinHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  plansLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.accent,
    textAlign: 'center',
  },
});
