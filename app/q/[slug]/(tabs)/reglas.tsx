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

  const hasFee = !!data.tenant.entryFee;

  return (
    <TabScreen>
      {data.tenant.description && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Sobre esta quiniela</Text>
          <Text style={ui.ruleLine}>{data.tenant.description}</Text>
        </View>
      )}

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

      {hasFee ? (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Inscripción</Text>
          <Text style={[ui.bigNumber, { color: accent }]}>{data.tenant.entryFee}</Text>
          <Text style={[ui.cardMeta, { marginBottom: spacing.md }]}>
            La cuota y las formas de pago se gestionan fuera de la app.
          </Text>
          <Button
            title="Cómo pagar tu inscripción"
            onPress={() => Linking.openURL(fillSlug(config.inscriptionUrlTemplate, slug))}
          />
        </View>
      ) : (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Inscripción</Text>
          <View
            style={{
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: accent,
              backgroundColor: accent + '18',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: spacing.sm,
            }}
          >
            <Text
              style={{
                color: accent,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Por diversión
            </Text>
          </View>
          <Text style={ui.ruleLine}>
            Esta quiniela no tiene cuota de inscripción. Únete y a pronosticar.
          </Text>
        </View>
      )}
    </TabScreen>
  );
}
