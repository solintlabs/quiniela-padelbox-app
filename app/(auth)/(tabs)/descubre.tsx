import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE } from '@/lib/saas-api';
import { Button } from '@/components/Button';

/**
 * La pestaña que vende: qué es QuinielaBOX antes de pedir un email.
 * Bullets con el beneficio por delante, un podio de muestra y dos CTAs:
 * probar la demo (web) o ir directo a crear cuenta.
 */
const FEATURES: { icon: string; title: string; detail: string }[] = [
  {
    icon: '⚡',
    title: 'Resultados automáticos',
    detail: 'Los marcadores y los puntos entran solos al pitido final. Nadie copia tablas.',
  },
  {
    icon: '🏆',
    title: 'Ranking en vivo',
    detail: 'La tabla se mueve sola y todos ven quién manda. Podio, rachas y perfiles.',
  },
  {
    icon: '🎨',
    title: 'Tu marca',
    detail: 'Tu nombre, tu color y tu logo. La quiniela de TU club, no la de otro.',
  },
  {
    icon: '🔒',
    title: 'Nadie puede copiar',
    detail: 'Los pronósticos se cierran solos antes de cada partido y se revelan al cierre.',
  },
  {
    icon: '⚽',
    title: '221 ligas',
    detail: 'Mundial 2026, LaLiga, Liga MX, Libertadores… o tus partidos a mano.',
  },
  {
    icon: '💸',
    title: 'El bote es vuestro',
    detail: 'La app no toca el dinero: lleva los puntos y dice quién ganó.',
  },
];

const DEMO_PODIUM = [
  { pos: '🥈', name: 'Marta R.', pts: 19, h: 56 },
  { pos: '🥇', name: 'Tú', pts: 28, h: 78, first: true },
  { pos: '🥉', name: 'Javi', pts: 19, h: 44 },
];

export default function DescubreTab() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
    >
      <Text style={s.brand}>
        Quiniela<Text style={{ color: colors.accent }}>BOX</Text>
      </Text>
      <Text style={s.lede}>
        La quiniela de tu club, tu peña o tus amigos — sin Excel, sin discusiones y sin trabajo
        para el organizador.
      </Text>

      {/* Podio de muestra: enseña el producto, no lo cuenta. */}
      <View style={s.podioCard}>
        <Text style={s.podioLabel}>ASÍ SE VE TU QUINIELA</Text>
        <View style={s.podioRow}>
          {DEMO_PODIUM.map((p) => (
            <View key={p.name} style={s.podioCol}>
              <Text style={{ fontSize: 18 }}>{p.pos}</Text>
              <Text style={[s.podioName, p.first && { color: colors.accent }]}>{p.name}</Text>
              <Text style={s.podioPts}>{p.pts} pts</Text>
              <View
                style={[
                  s.podioBar,
                  { height: p.h },
                  p.first
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      {FEATURES.map((f) => (
        <View key={f.title} style={s.featRow}>
          <Text style={s.featIcon}>{f.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.featTitle}>{f.title}</Text>
            <Text style={s.featDetail}>{f.detail}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: spacing.xl }} />
      <Button title="Crear mi cuenta gratis" onPress={() => router.navigate('/(auth)/(tabs)/login')} />
      <Pressable
        onPress={() => Linking.openURL(`${FALLBACK_SITE}/demo?utm_source=app&utm_medium=descubre`)}
        style={{ paddingVertical: spacing.lg }}
      >
        <Text style={s.demoLink}>🎮 Probar la demo sin registrarme →</Text>
      </Pressable>
      <Text style={s.fine}>
        Gratis hasta 15 jugadores. Los clubes grandes usan Pro — míralo en la pestaña Planes.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  brand: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  lede: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  podioCard: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  podioLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  podioRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  podioCol: { flex: 1, alignItems: 'center' },
  podioName: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.ink },
  podioPts: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, marginBottom: 4 },
  podioBar: { alignSelf: 'stretch', borderRadius: radius.sm },
  featRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  featDetail: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 19,
  },
  demoLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.accent,
    textAlign: 'center',
  },
  fine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
