import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE } from '@/lib/saas-api';

/**
 * Espacio de anuncio en quinielas FREE (paridad con el AdSlot de la web).
 * Fase 1: auto-promo de QuinielaBOX — JS puro, sin SDKs ni permisos, cero
 * fricción con la revisión de Apple. Fase 2: cuando la conversión esté
 * aprobada y exista cuenta de AdMob, este mismo hueco pasa a servir
 * anuncios reales (react-native-google-mobile-ads).
 */
export function SaasAdSlot() {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${FALLBACK_SITE}/?utm_source=app&utm_medium=house_ad`)}
      style={({ pressed }) => [styles.box, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.tag}>Publicidad</Text>
      <Text style={styles.title}>
        ¿Tu propia quiniela? Pruébalo gratis en Quiniela
        <Text style={{ color: colors.accent }}>BOX</Text>
      </Text>
      <Text style={styles.meta}>Crea la tuya en 1 minuto · quinielabox.com</Text>
      <Text style={styles.proNote}>El plan Pro quita los anuncios de tu quiniela.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  tag: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  proNote: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: colors.accent,
    marginTop: 6,
  },
});
