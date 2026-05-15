import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api, type ApiUser } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const PAYMENT_METHODS = [
  {
    icon: '📲',
    title: 'Pago Móvil',
    subtitle: 'Banesco',
    rows: [
      { label: 'Teléfono', value: '0412-PRUEBA', copy: true },
      { label: 'C.I.', value: 'V-00.000.000', copy: true },
      { label: 'Titular', value: 'S. Baldini' },
    ],
  },
  {
    icon: '🏦',
    title: 'Transferencia Banesco',
    subtitle: 'Cuenta Corriente',
    rows: [
      { label: 'Cuenta', value: '0134-0000-0000-0000-0000', copy: true, mono: true },
      { label: 'Titular', value: 'S. Baldini' },
      { label: 'C.I.', value: 'V-00.000.000', copy: true },
    ],
  },
  {
    icon: '💵',
    title: 'Zelle',
    subtitle: 'USD',
    rows: [
      { label: 'Email', value: 'sergiobaldini6@gmail.com', copy: true, mono: true },
      { label: 'Titular', value: 'Sergio Baldini' },
    ],
  },
  {
    icon: '🪙',
    title: 'Binance Pay',
    subtitle: 'Cripto',
    rows: [
      { label: 'Email Binance', value: 'sergiobaldini6@gmail.com', copy: true, mono: true },
      { label: 'Moneda', value: 'USDT (BSC / TRC20)' },
    ],
  },
];

export default function InscripcionScreen() {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.me().then((r) => setMe(r.me)).catch(() => {});
  }, []);

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View>
        <Text style={styles.eyebrow}>CÓMO PARTICIPAR</Text>
        <Text style={styles.title}>Inscripción y pago</Text>
        <Text style={styles.lead}>
          Para activar tu cuenta y enviar pronósticos, paga la cuota por cualquiera de los métodos
          de abajo y envíanos el comprobante.
        </Text>
      </View>

      {me?.hasPaid ? (
        <View style={[styles.banner, { borderColor: colors.success + '80', backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.bannerText, { color: colors.ink }]}>
            ✓ <Text style={{ fontFamily: fontFamily.bold }}>Ya estás inscrito.</Text> Tu cuota está al día.
          </Text>
        </View>
      ) : (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠ <Text style={{ fontFamily: fontFamily.bold }}>Aún no estás activo.</Text> Realiza el pago y envía el
            comprobante por email o WhatsApp.
          </Text>
        </View>
      )}

      <View style={styles.feeCard}>
        <Text style={styles.feeLabel}>Cuota</Text>
        <Text style={styles.feeAmount}>$10</Text>
        <Text style={styles.feeDesc}>Cuota única por toda la duración del Mundial</Text>
        <Text style={styles.feeConcept}>
          <Text style={{ color: colors.ink, fontFamily: fontFamily.semibold }}>Concepto: </Text>
          Quiniela Mundial 2026 — tu nombre
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Métodos de pago</Text>

      {PAYMENT_METHODS.map((m) => (
        <View key={m.title} style={styles.method}>
          <View style={styles.methodHeader}>
            <Text style={{ fontSize: 22 }}>{m.icon}</Text>
            <View>
              <Text style={styles.methodTitle}>{m.title}</Text>
              <Text style={styles.methodSubtitle}>{m.subtitle}</Text>
            </View>
          </View>
          {m.rows.map((r, i) => (
            <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{r.label.toUpperCase()}</Text>
              <Text
                style={[
                  styles.rowValue,
                  r.mono && { fontFamily: 'Courier' },
                ]}
                numberOfLines={1}
              >
                {r.value}
              </Text>
              {r.copy && (
                <Pressable onPress={() => copy(r.value)}>
                  <Text style={styles.copy}>{copied === r.value ? '✓' : 'Copiar'}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>Tras realizar el pago</Text>
        <Text style={styles.contactDesc}>
          Envíanos el comprobante por email o WhatsApp y activaremos tu cuenta:
        </Text>
        <Pressable onPress={() => Linking.openURL('mailto:info@solint.cloud')}>
          <Text style={styles.contactLink}>✉️  info@solint.cloud</Text>
        </Pressable>
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Cómo se gana</Text>
        <Text style={styles.rulesText}>
          <Text style={styles.rulesBold}>3 pts</Text> por marcador exacto ·{' '}
          <Text style={styles.rulesBold}>1 pt</Text> si aciertas solo el ganador ·{' '}
          <Text style={styles.rulesBold}>+25 pts</Text> si aciertas el campeón del Mundial.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },
  eyebrow: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink, marginTop: spacing.xs },
  lead: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.md, lineHeight: 20 },
  banner: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.warning + '80', backgroundColor: colors.warning + '20' },
  bannerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  feeCard: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  feeLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6, textTransform: 'uppercase' },
  feeAmount: { fontFamily: fontFamily.display, fontSize: fontSize.hero, color: colors.ink, marginTop: spacing.xs },
  feeDesc: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  feeConcept: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.sm },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  method: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  methodHeader: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  methodTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  methodSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  rowBorder: { borderTopWidth: 1, borderColor: colors.border },
  rowLabel: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.2, width: 90 },
  rowValue: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  copy: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.accent },
  contactCard: { backgroundColor: '#B6FF3C0D', borderColor: colors.accent + '50', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  contactTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.ink },
  contactDesc: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  contactLink: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.accent, marginTop: spacing.xs },
  rulesCard: { borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  rulesTitle: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  rulesText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  rulesBold: { color: colors.ink, fontFamily: fontFamily.bold },
});
