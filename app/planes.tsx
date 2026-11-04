import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import {
  FALLBACK_CONFIG,
  FALLBACK_SITE,
  fillSlug,
  saasApi,
  type SaasConfig,
  type SaasDisplayPlan,
} from '@/lib/saas-api';
import { getToken } from '@/lib/auth';
import { openWebLoggedIn } from '@/lib/web-bridge';
import {
  ClaimFailed,
  PurchaseCancelled,
  buyForTenant,
  claimPurchase,
  iapAvailable,
  loadStorePrices,
  restorablePurchases,
  type StorePrice,
} from '@/lib/iap';
import { Button } from '@/components/Button';

/**
 * Planes de QuinielaBOX. Los datos vienen de /api/saas/config (la misma
 * verdad que la landing web).
 *
 * El pago se hace DENTRO de la app con la hoja nativa de App Store / Google
 * Play (RevenueCat): Apple lo exige para bienes digitales. El plan se aplica
 * a UNA quiniela concreta, así que el camino hasta el pago puede tener un
 * paso previo (entrar, o crear la quiniela), pero los botones de los planes
 * están SIEMPRE visibles: una pantalla de precios sin nada que pulsar no vende.
 *
 * Si la compra integrada no está disponible (kill switch remoto `iap.enabled`,
 * sin clave para la plataforma, o web) se vuelve al checkout web de siempre.
 */
export default function PlanesScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug?: string }>();
  const [config, setConfig] = useState<SaasConfig | null>(null);
  // Quinielas que ADMINISTRA el usuario y aún son FREE: candidatas a mejorar.
  const [owned, setOwned] = useState<Array<{ slug: string; name: string; plan: string }>>([]);
  // Administra alguna, aunque ya sea Pro. Sirve para no decirle "crea tu
  // quiniela" a quien ya las tiene todas mejoradas.
  const [ownsAny, setOwnsAny] = useState(false);
  const [hasSession, setHasSession] = useState(true);
  // Precios reales de la tienda, en la moneda del usuario. Si no llegan se
  // enseñan los del backend (en USD).
  const [prices, setPrices] = useState<Record<string, StorePrice>>({});
  // Producto que se está comprando ahora mismo (bloquea el resto de botones).
  const [busy, setBusy] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      saasApi
        .config()
        .then(setConfig)
        .catch(() => setConfig(FALLBACK_CONFIG));
      if (iapAvailable()) loadStorePrices().then(setPrices);
      // /api/saas/tenants requiere sesión: esta pantalla también vive en la
      // pestaña pre-login, y pedirlo sin token acababa en 401.
      getToken()
        .catch(() => null)
        .then((token) => {
          setHasSession(!!token);
          if (!token) {
            setOwned([]);
            setOwnsAny(false);
            return;
          }
          saasApi
            .tenants()
            .then((r) => {
              const mine = r.tenants.filter((t) => t.role === 'OWNER');
              setOwnsAny(mine.length > 0);
              setOwned(
                mine
                  .filter((t) => t.plan === 'FREE')
                  .map((t) => ({ slug: t.slug, name: t.name, plan: t.plan })),
              );
            })
            .catch(() => {
              setOwned([]);
              setOwnsAny(false);
            });
        });
    }, []),
  );

  // Cuál quiniela se mejora: la de la ruta, la que eligió aquí, o la única
  // gratuita que administra (lo normal al entrar a Planes).
  const [chosen, setChosen] = useState<string | null>(null);
  const [pickHint, setPickHint] = useState(false);
  const slug = slugParam ?? chosen ?? (owned.length === 1 ? owned[0].slug : undefined);
  const mustChoose = !slugParam && !chosen && owned.length > 1;

  const useIap =
    Platform.OS !== 'web' && iapAvailable() && (config?.iap?.enabled ?? false);

  function priceOf(p: SaasDisplayPlan): string {
    return (p.iapProductId && prices[p.iapProductId]?.priceString) || p.priceBig;
  }

  /**
   * Un solo botón por plan, siempre visible: lleva al paso que falte para
   * poder pagar (entrar → crear la quiniela → hoja de pago).
   */
  function choosePlan(p: SaasDisplayPlan) {
    if (!hasSession) {
      // Vuelve a Planes después de entrar, en vez de dejarte en el hub.
      router.push({ pathname: '/(auth)/(tabs)/login', params: { next: 'planes' } });
      return;
    }
    if (!ownsAny) {
      // Crear la quiniela y pagar el plan elegido en el mismo gesto.
      router.push({
        pathname: '/crear-quiniela',
        params: useIap && p.iapProductId ? { plan: p.iapProductId } : {},
      });
      return;
    }
    if (!slug) {
      setPickHint(true);
      return;
    }
    if (useIap && p.iapProductId) {
      void buy(slug, p.iapProductId);
      return;
    }
    openWebLoggedIn(`/saas/${slug}/panel`, fillSlug(config!.upgrade.urlTemplate, slug));
  }

  async function buy(forSlug: string, productId: string) {
    if (busy) return;
    setBusy(productId);
    try {
      await buyForTenant(forSlug, productId, prices);
      const name = owned.find((t) => t.slug === forSlug)?.name ?? forSlug;
      Alert.alert('¡Ya eres Pro!', `${name} tiene todas las ventajas activadas.`, [
        {
          text: 'Abrir la quiniela',
          onPress: () => router.replace({ pathname: '/q/[slug]', params: { slug: forSlug } }),
        },
      ]);
    } catch (e) {
      if (e instanceof PurchaseCancelled) return;
      if (e instanceof ClaimFailed) {
        // El cobro ya se hizo: jamás pedir que vuelva a pagar.
        Alert.alert(
          'Pago recibido, falta activarlo',
          `${e.message}\n\nNo se te cobrará de nuevo: pulsa "Restaurar compras" y lo activamos.`,
        );
        return;
      }
      Alert.alert('No se pudo completar la compra', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  }

  /**
   * Compras pagadas que no llegaron a aplicarse (la app se cerró a mitad,
   * reinstalación, otro dispositivo). Se intentan aplicar a la quiniela en
   * contexto; lo que ya estaba aplicado el servidor lo ignora.
   */
  async function restore() {
    if (!config?.iap || restoring) return;
    if (!slug) {
      setPickHint(true);
      Alert.alert('Elige la quiniela', 'Primero indica a qué quiniela aplicar la compra.');
      return;
    }
    setRestoring(true);
    try {
      const pending = await restorablePurchases(config.iap.products);
      let applied = 0;
      for (const outcome of pending) {
        try {
          const r = await claimPurchase(slug, outcome);
          if (!r.alreadyApplied) applied++;
        } catch {
          // Ya usada en otra quiniela, caducada… se prueba con la siguiente.
        }
      }
      Alert.alert(
        applied ? '¡Compra restaurada!' : 'Nada que restaurar',
        applied
          ? 'El plan Pro ya está activo en tu quiniela.'
          : 'No encontramos compras pendientes de aplicar en esta cuenta.',
      );
    } catch (e) {
      Alert.alert('No se pudo restaurar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setRestoring(false);
    }
  }

  if (!config) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Planes' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const canBuy = config.upgrade.enabled || useIap;

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

      {/* Paso previo al pago, anunciado sin esconder los botones de los planes. */}
      {!slugParam && !ownsAny && canBuy && (
        <View style={[styles.card, { borderColor: colors.accent }]}>
          <Text style={[styles.planName, { color: colors.accent }]}>
            {hasSession ? 'Empieza por tu quiniela' : 'Entra para elegir tu plan'}
          </Text>
          <Text style={[styles.meta, { marginVertical: spacing.sm }]}>
            {hasSession
              ? 'El plan se aplica a una quiniela concreta. Elige un plan abajo: creas tu quiniela y pagas en el mismo paso.'
              : 'El plan se aplica a una quiniela concreta. Entra con tu email y volverás aquí para elegirlo.'}
          </Text>
          {!hasSession && <Button title="Entrar" onPress={() => choosePlan(config.displayPlans![0])} />}
        </View>
      )}

      {mustChoose && (
        <View style={[styles.card, pickHint && { borderColor: colors.accent, borderWidth: 2 }]}>
          <Text style={[styles.planName, { marginBottom: spacing.xs }]}>
            ¿Qué quiniela quieres mejorar?
          </Text>
          <Text style={[styles.meta, { marginBottom: spacing.sm }]}>
            Elige una y luego pulsa el plan que quieras.
          </Text>
          {owned.map((t) => (
            <View key={t.slug} style={{ marginBottom: spacing.sm }}>
              <Button
                title={t.name}
                variant="secondary"
                onPress={() => {
                  setChosen(t.slug);
                  setPickHint(false);
                }}
              />
            </View>
          ))}
        </View>
      )}

      {/* Cuál se va a mejorar, para que el pago no sea una sorpresa. */}
      {!!slug && owned.length > 1 && (
        <Text style={[styles.fine, { marginTop: 0, marginBottom: spacing.md }]}>
          Mejorarás: {owned.find((t) => t.slug === slug)?.name ?? slug}
        </Text>
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
              <Text style={styles.planPrice}>{priceOf(p)}</Text>
              <Text style={styles.priceSub}>{p.priceSub}</Text>
            </View>
          </View>
          <Text style={[styles.meta, { marginBottom: spacing.sm }]}>{p.tagline}</Text>
          {p.features.map((f) => (
            <Feature key={f} text={f} />
          ))}
          {p.upgradable && canBuy && (
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={
                  useIap && slug && hasSession && ownsAny
                    ? `Comprar ${p.name} · ${priceOf(p)}`
                    : `Elegir ${p.name}`
                }
                variant={p.recommended ? 'primary' : 'secondary'}
                loading={busy === p.iapProductId}
                disabled={!!busy && busy !== p.iapProductId}
                onPress={() => choosePlan(p)}
              />
            </View>
          )}
        </View>
      ))}

      {useIap && hasSession && ownsAny && (
        <Button
          title={restoring ? 'Restaurando…' : 'Restaurar compras'}
          variant="ghost"
          loading={restoring}
          onPress={restore}
        />
      )}

      <Text style={styles.fine}>
        {!canBuy
          ? 'Los planes se gestionan desde quinielabox.com con la cuenta del organizador.'
          : useIap
            ? hasSession
              ? 'El pago se hace con tu cuenta de App Store o Google Play. Las ventajas se activan al instante en la quiniela elegida.'
              : 'Entra con tu email para elegir tu plan. El pago se hace con tu cuenta de App Store o Google Play.'
            : slug
              ? 'El pago se completa de forma segura en quinielabox.com. Los beneficios se activan al instante en la app.'
              : hasSession
                ? ownsAny
                  ? 'Elige arriba la quiniela que quieres mejorar.'
                  : 'Crea tu quiniela —gratis— y podrás elegir plan.'
                : 'Entra con tu email para elegir tu plan. El pago se completa de forma segura en quinielabox.com.'}
      </Text>

      {/* Apple exige, para suscripciones auto-renovables, decir que se renueva
          sola, cómo se cancela y enlazar términos y privacidad. */}
      {useIap && (
        <Text style={styles.legal}>
          Pro Mensual se renueva automáticamente cada mes al precio indicado hasta que lo canceles,
          al menos 24 h antes del fin del periodo, en los ajustes de suscripciones de tu cuenta de{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. Pro Temporada es un pago único.
          Al comprar aceptas los{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(`${FALLBACK_SITE}/terms`)}>
            Términos
          </Text>{' '}
          y la{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(`${FALLBACK_SITE}/privacy`)}>
            Política de privacidad
          </Text>
          .
        </Text>
      )}
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
  legal: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 15,
    opacity: 0.8,
  },
  link: { color: colors.ink, textDecorationLine: 'underline' },
});
