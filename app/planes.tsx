import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_CONFIG, fillSlug, saasApi, type SaasConfig } from '@/lib/saas-api';
import { openWebLoggedIn } from '@/lib/web-bridge';
import { Button } from '@/components/Button';

/**
 * Planes de QuinielaBOX. Los datos vienen de /api/saas/config (la misma
 * verdad que la landing web). El botón "Subir a Pro" abre el checkout web en
 * el navegador y obedece el kill switch remoto (upgrade.enabled): si un
 * revisor lo objeta, la pantalla queda solo informativa sin build nuevo.
 */
export default function PlanesScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [config, setConfig] = useState<SaasConfig | null>(null);

  useFocusEffect(
    useCallback(() => {
      saasApi
        .config()
        .then(setConfig)
        .catch(() => setConfig(FALLBACK_CONFIG));
    }, []),
  );

  if (!config) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Planes' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <Stack.Screen options={{ title: 'Planes' }} />

      {(config.displayPlans ?? []).length === 0 && config.plans.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.meta}>
            No se pudieron cargar los planes. Encuéntralos en quinielabox.com.
          </Text>
        </View>
      )}

      {(config.displayPlans ?? []).map((p) => (
        <View
          key={p.id}
          style={[styles.card, p.recommended && { borderColor: colors.accent, borderWidth: 2 }]}
        >
          {p.recommended && <Text style={styles.proTag}>RECOMENDADO</Text>}
          <View style={styles.planHead}>
            <Text style={[styles.planName, p.recommended && { color: colors.accent }]}>
              {p.name}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>{p.priceBig}</Text>
              <Text style={styles.priceSub}>{p.priceSub}</Text>
            </View>
          </View>
          <Text style={[styles.meta, { marginBottom: spacing.sm }]}>{p.tagline}</Text>
          {p.features.map((f) => (
            <Feature key={f} text={f} />
          ))}
          {p.upgradable && slug && config.upgrade.enabled && (
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={`Elegir ${p.name}`}
                variant={p.recommended ? 'primary' : 'secondary'}
                onPress={() =>
                  openWebLoggedIn(
                    `/saas/${slug}/panel`,
                    fillSlug(config.upgrade.urlTemplate, slug),
                  )
                }
              />
            </View>
          )}
        </View>
      ))}

      <Text style={styles.fine}>
        {config.upgrade.enabled && slug
          ? 'El pago se completa de forma segura en quinielabox.com. Los beneficios se activan al instante en la app.'
          : 'Los planes se gestionan desde quinielabox.com con la cuenta del organizador.'}
      </Text>
    </ScrollView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={{ color: colors.accent }}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  proTag: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  planName: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  planPrice: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.ink },
  priceSub: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, marginTop: 1 },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: 3,
  },
  featureText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  fine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
