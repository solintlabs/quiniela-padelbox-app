import { Linking, Text, View } from 'react-native';
import { spacing } from '@/lib/theme';
import { fillSlug } from '@/lib/saas-api';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, ui } from '@/components/tenantUi';
import { Button } from '@/components/Button';

/**
 * Reglas de la quiniela. El bote se paga FUERA de la app (regla de Apple):
 * aquí solo el resumen y el botón a la página pública de inscripción.
 */
export default function ReglasTab() {
  const { data, slug, accent, config } = useTenant();
  if (!data) return <TabScreen>{null}</TabScreen>;

  const hasInscription =
    !!data.tenant.entryFee || !!data.tenant.paymentInfo || data.paymentMethods.length > 0;

  return (
    <TabScreen>
      {data.competition && data.competition.pointsSummary.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Cómo se puntúa</Text>
          {data.competition.pointsSummary.map((line) => (
            <Text key={line} style={ui.ruleLine}>
              · {line}
            </Text>
          ))}
          {data.champion && (
            <Text style={ui.ruleLine}>· Acertar el campeón: +{data.champion.bonus} pts</Text>
          )}
        </View>
      )}

      {data.tenant.rulesText && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Reglas del organizador</Text>
          <Text style={ui.ruleLine}>{data.tenant.rulesText}</Text>
        </View>
      )}

      {data.tenant.prizesText && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Premios</Text>
          <Text style={ui.ruleLine}>{data.tenant.prizesText}</Text>
        </View>
      )}

      {hasInscription && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Inscripción</Text>
          {data.tenant.entryFee ? (
            <Text style={[ui.bigNumber, { color: accent }]}>{data.tenant.entryFee}</Text>
          ) : null}
          <Text style={[ui.cardMeta, { marginBottom: spacing.md }]}>
            La cuota y las formas de pago se gestionan fuera de la app.
          </Text>
          <Button
            title="Cómo pagar tu inscripción"
            onPress={() => Linking.openURL(fillSlug(config.inscriptionUrlTemplate, slug))}
          />
        </View>
      )}
    </TabScreen>
  );
}
