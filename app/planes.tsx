import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_CONFIG, fillSlug, saasApi, type SaasConfig } from '@/lib/saas-api';
import { getToken } from '@/lib/auth';
import { openWebLoggedIn } from '@/lib/web-bridge';
import { Button } from '@/components/Button';

/**
 * Planes de QuinielaBOX. Los datos vienen de /api/saas/config (la misma
 * verdad que la landing web). El botón "Subir a Pro" abre el checkout web en
 * el navegador y obedece el kill switch remoto (upgrade.enabled): si un
 * revisor lo objeta, la pantalla queda solo informativa sin build nuevo.
 */
export default function PlanesScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug?: string }>();
  const [config, setConfig] = useState<SaasConfig | null>(null);
  // Quinielas que ADMINISTRA el usuario. Hacen falta cuando se entra a Planes
  // desde el menú general (sin quiniela en contexto): sin esto la pantalla
  // enseñaba los precios pero ningún botón para pagar, que es justo donde se
  // perdía la venta.
  const [owned, setOwned] = useState<Array<{ slug: string; name: string; plan: string }>>([]);
  // Administra alguna, aunque ya sea Pro. Sirve para no decirle "crea tu
  // quiniela" a quien ya las tiene todas mejoradas.
  const [ownsAny, setOwnsAny] = useState(false);
  const [hasSession, setHasSession] = useState(true);

  useFocusEffect(
    useCallback(() => {
      saasApi
        .config()
        .then(setConfig)
        .catch(() => setConfig(FALLBACK_CONFIG));
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

  /**
   * Un solo botón por plan, siempre visible: lleva al paso que falte para
   * poder pagar. Antes la pantalla escondía el botón cuando no había slug
   * (sin sesión o entrando desde el menú general) y el escaparate de precios
   * se quedaba sin nada que pulsar — justo donde se perdía la venta.
   */
  function choosePlan() {
    if (!hasSession) {
      // Vuelve a Planes después de entrar, en vez de dejarte en el hub.
      router.push({ pathname: '/(auth)/(tabs)/login', params: { next: 'planes' } });
      return;
    }
    if (!ownsAny) {
      router.push('/crear-quiniela');
      return;
    }
    if (!slug) {
      setPickHint(true);
      return;
    }
    openWebLoggedIn(`/saas/${slug}/panel`, fillSlug(config!.upgrade.urlTemplate, slug));
  }

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

      {/* El plan se aplica a UNA quiniela concreta, así que el camino hasta el
          pago puede tener un paso previo (entrar, o crear la quiniela). Se
          anuncia aquí, pero sin esconder los botones de los planes: desde
          cualquiera de ellos se llega al mismo sitio. */}
      {!slugParam && !ownsAny && config.upgrade.enabled && (
        <View style={[styles.card, { borderColor: colors.accent }]}>
          <Text style={[styles.planName, { color: colors.accent }]}>
            {hasSession ? 'Empieza por tu quiniela' : 'Entra para elegir tu plan'}
          </Text>
          <Text style={[styles.meta, { marginVertical: spacing.sm }]}>
            {hasSession
              ? 'El plan se aplica a una quiniela concreta. Crea la tuya —es gratis y lleva un minuto— y pásala a Pro cuando quieras.'
              : 'El plan se aplica a una quiniela concreta. Entra con tu email y volverás aquí para elegirlo.'}
          </Text>
          <Button
            title={hasSession ? 'Crear mi quiniela' : 'Entrar'}
            onPress={choosePlan}
          />
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
              <Text style={styles.planPrice}>{p.priceBig}</Text>
              <Text style={styles.priceSub}>{p.priceSub}</Text>
            </View>
          </View>
          <Text style={[styles.meta, { marginBottom: spacing.sm }]}>{p.tagline}</Text>
          {p.features.map((f) => (
            <Feature key={f} text={f} />
          ))}
          {/* El botón SIEMPRE está, con o sin quiniela en contexto: lleva al
              paso que falte (entrar / crear / pagar). Una pantalla de precios
              sin nada que pulsar no vende. */}
          {p.upgradable && config.upgrade.enabled && (
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={`Elegir ${p.name}`}
                variant={p.recommended ? 'primary' : 'secondary'}
                onPress={choosePlan}
              />
            </View>
          )}
        </View>
      ))}

      <Text style={styles.fine}>
        {!config.upgrade.enabled
          ? 'Los planes se gestionan desde quinielabox.com con la cuenta del organizador.'
          : slug
            ? 'El pago se completa de forma segura en quinielabox.com. Los beneficios se activan al instante en la app.'
            : hasSession
              ? ownsAny
                ? 'Elige arriba la quiniela que quieres mejorar.'
                : 'Crea tu quiniela —gratis— y podrás elegir plan.'
              : 'Entra con tu email para elegir tu plan. El pago se completa de forma segura en quinielabox.com.'}
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
