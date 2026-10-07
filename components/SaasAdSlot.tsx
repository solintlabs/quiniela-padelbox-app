import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE } from '@/lib/saas-api';

/**
 * Espacio promocional de las quinielas FREE (paridad con el AdSlot de la web).
 *
 * Es inventario PROPIO, no una red de anuncios: JS puro, sin SDK ni permiso de
 * rastreo, así que no añade fricción a la revisión de Apple. Y monetiza mejor
 * que un banner de terceros, porque empuja al Pro ($29 la temporada) en vez de
 * pagar céntimos por impresión.
 *
 * El mensaje cambia según quién mira:
 *  - organizador → qué gana al pasar a Pro (es quien puede pagar)
 *  - jugador     → crear la suya (capta organizadores nuevos)
 *
 * Si `onUpgrade` no llega (porque el interruptor remoto de pagos está
 * apagado), nunca se enseña precio ni enlace de compra: solo la autopromo.
 */
export function SaasAdSlot({
  variant = 'player',
  priceLabel,
  onUpgrade,
}: {
  variant?: 'owner' | 'player';
  /** Ej. "$29 por temporada". Solo se muestra si hay onUpgrade. */
  priceLabel?: string;
  onUpgrade?: () => void;
}) {
  const isOwnerOffer = variant === 'owner' && !!onUpgrade;

  if (isOwnerOffer) {
    return (
      <Pressable
        onPress={onUpgrade}
        style={({ pressed }) => [styles.box, styles.boxPro, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.tag}>Publicidad</Text>
        <Text style={styles.title}>
          Quita los anuncios de tu quiniela con <Text style={{ color: colors.accent }}>Pro</Text>
        </Text>
        <View style={styles.perks}>
          {['Tu portada y tu lema', 'Sin anuncios para tus jugadores', 'Hasta 500 jugadores'].map(
            (p) => (
              <Text key={p} style={styles.perk}>
                ·  {p}
              </Text>
            ),
          )}
        </View>
        <Text style={[styles.cta, { color: colors.accent }]}>
          {priceLabel ? `${priceLabel} →` : 'Ver planes →'}
        </Text>
      </Pressable>
    );
  }

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
      {variant === 'owner' && (
        <Text style={styles.proNote}>El plan Pro quita los anuncios de tu quiniela.</Text>
      )}
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
  boxPro: { borderStyle: 'solid', borderColor: colors.accent },
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
  perks: { marginTop: spacing.xs, gap: 2 },
  perk: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  cta: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, marginTop: spacing.sm },
  proNote: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: colors.accent,
    marginTop: 6,
  },
});
