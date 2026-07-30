import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_CONFIG, fillSlug, saasApi, type SaasConfig } from '@/lib/saas-api';
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

      {config.plans.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.meta}>
            No se pudieron cargar los planes. Encuéntralos en quinielabox.com.
          </Text>
        </View>
      )}

      {config.plans.map((p) => {
        const isPro = p.id === 'PRO';
        return (
          <View
            key={p.id}
            style={[styles.card, isPro && { borderColor: colors.accent, borderWidth: 2 }]}
          >
            {isPro && <Text style={styles.proTag}>⭐ RECOMENDADO</Text>}
            <View style={styles.planHead}>
              <Text style={[styles.planName, isPro && { color: colors.accent }]}>{p.name}</Text>
              <Text style={styles.planPrice}>
                {p.priceUsd === null
                  ? 'A medida'
                  : p.priceUsd === 0
                    ? 'Gratis'
                    : `$${p.priceUsd}/${p.period ?? 'mes'}`}
              </Text>
            </View>
            {isPro && p.season && (
              <Text style={[styles.meta, { color: colors.accent, marginBottom: spacing.xs }]}>
                ⭐ Mejor precio: ${p.season.priceUsd}/temporada — pago único, cubre el torneo
              </Text>
            )}
            <Text style={[styles.meta, { marginBottom: spacing.sm }]}>{p.tagline}</Text>
            <Feature
              text={
                p.limits.maxPlayers === null
                  ? 'Jugadores ilimitados'
                  : `Hasta ${p.limits.maxPlayers} jugadores`
              }
            />
            <Feature
              text={
                p.limits.maxCompetitions === null
                  ? 'Competiciones ilimitadas'
                  : `${p.limits.maxCompetitions} competición${p.limits.maxCompetitions === 1 ? '' : 'es'} a la vez`
              }
            />
            <Feature text={p.limits.showsAds ? 'Con anuncios' : 'Sin anuncios'} />
            <Feature
              text={p.limits.removeBranding ? 'Tu marca, tu color y tu logo' : 'Marca QuinielaBOX'}
            />

            {isPro && slug && config.upgrade.enabled && (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="⭐ Subir a Pro"
                  onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
                />
              </View>
            )}
          </View>
        );
      })}

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
