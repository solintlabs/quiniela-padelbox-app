import { useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { requestLoginCode } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const STADIUM_BG = 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=70';
const DELISH_ORANGE = '#f14826';

const WHATSAPP_NUMBER = '34635171649';
const WHATSAPP_TEXT = 'Quiero inscribirme en la Quiniela PADELBOX';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true);
    setError(null);
    try {
      await requestLoginCode(cleanEmail);
      router.push({
        pathname: '/(auth)/verify',
        params: { email: cleanEmail, name: name.trim(), phone: phone.trim() },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={{ uri: STADIUM_BG }}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.45 }}
      >
        <View style={styles.overlay} pointerEvents="none" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            {/* Co-branding PADELBOX × DELISH */}
            <View style={styles.cobrandRow}>
              <Logo width={140} />
              <Text style={styles.cobrandX}>×</Text>
              <Image
                source={require('@/assets/delish.png')}
                style={styles.delishLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.cobrandLabel}>PRESENTAN LA QUINIELA</Text>

            <Text style={styles.eyebrow}>MUNDIAL 2026</Text>

            <View style={styles.prizesRow}>
              <View style={[styles.prizeChip, styles.prizeGold]}>
                <Text style={styles.prizeIcon}>🥇</Text>
                <Text style={[styles.prizeAmount, { color: colors.accent }]}>$1.5K</Text>
              </View>
              <View style={[styles.prizeChip, styles.prizeSilver]}>
                <Text style={styles.prizeIcon}>🥈</Text>
                <Text style={styles.prizeAmount}>$500</Text>
              </View>
              <View style={[styles.prizeChip, styles.prizeBronze]}>
                <Text style={styles.prizeIcon}>🥉</Text>
                <Text style={[styles.prizeAmount, { color: '#FB923C' }]}>$300</Text>
              </View>
            </View>
            <Text style={styles.prizesHint}>
              + gift cards en <Text style={{ color: DELISH_ORANGE, fontFamily: fontFamily.semibold }}>DELISH</Text> y
              afiliados (Sole Mio, Tacoberto, Vinny&apos;s…)
            </Text>
          </View>

          <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre o apodo"
              placeholderTextColor={colors.muted}
              autoComplete="name"
              maxLength={60}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+58 412 555 0000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={20}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              style={styles.input}
            />
          </View>

          <Button title="ENVIAR CÓDIGO" onPress={onSubmit} loading={loading} disabled={!email.trim()} />
          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.hint}>
            Si ya tienes cuenta, nombre y teléfono solo se guardan la primera vez.
          </Text>
        </View>

        {/* Info-box explicando el passwordless */}
        <View style={styles.infoBox}>
          <Text style={styles.infoEyebrow}>¿CÓMO ENTRO?</Text>
          <Text style={styles.infoBody}>
            Pones tu correo y te llega un{' '}
            <Text style={styles.infoStrong}>código de 6 dígitos por email</Text>. Lo introduces aquí y
            entras —{' '}
            <Text style={styles.infoStrong}>sin contraseñas que recordar</Text>. Cada vez que vuelvas
            a entrar funciona igual.
          </Text>
          <Text style={styles.infoFoot}>
            Tu cuenta se crea sola al introducir el email por primera vez.
          </Text>
        </View>

        {/* Accesos públicos a Reglas e Inscripción */}
        <View style={styles.publicLinks}>
          <Link href="/reglas" asChild>
            <Pressable style={styles.publicCard}>
              <Text style={styles.publicIcon}>📖</Text>
              <Text style={styles.publicLabel}>Reglas</Text>
              <Text style={styles.publicDesc}>Cómo funciona</Text>
            </Pressable>
          </Link>
          <Link href="/inscripcion" asChild>
            <Pressable style={styles.publicCard}>
              <Text style={styles.publicIcon}>💳</Text>
              <Text style={styles.publicLabel}>Inscripción</Text>
              <Text style={styles.publicDesc}>Métodos de pago</Text>
            </Pressable>
          </Link>
        </View>

        {/* Botón WhatsApp directo */}
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`,
            )
          }
          style={styles.whatsapp}
        >
          <Text style={styles.whatsappIcon}>💬</Text>
          <Text style={styles.whatsappText}>Contactar por WhatsApp</Text>
        </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No estás inscrito? Tu cuenta se crea sola. El admin de PADELBOX valida tu pago para
              activarte.
            </Text>
            <Pressable
              onPress={() => Linking.openURL('https://solint.cloud')}
              style={{ marginTop: spacing.lg }}
            >
              <Text style={styles.devCredit}>
                Desarrollado por{' '}
                <Text style={styles.devLink}>Solintlabs · S.Baldini</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.78)',
  },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxl * 2 },
  center: { alignItems: 'center', marginBottom: spacing.xl },
  cobrandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  cobrandX: { fontFamily: fontFamily.display, fontSize: 28, color: colors.muted, lineHeight: 30 },
  delishLogo: { width: 110, height: 56 },
  cobrandLabel: { fontFamily: fontFamily.semibold, fontSize: 9, color: colors.muted, letterSpacing: 3, marginTop: 4 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 3,
    marginTop: spacing.xl,
  },
  prizesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 280,
  },
  prizeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  prizeGold: { backgroundColor: '#B6FF3C18', borderColor: colors.accent + '66' },
  prizeSilver: { backgroundColor: 'rgba(24,24,27,0.8)', borderColor: '#3F3F46' },
  prizeBronze: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.5)' },
  prizeIcon: { fontSize: 14 },
  prizeAmount: { fontFamily: fontFamily.display, fontSize: 12, color: colors.ink, marginTop: 2 },
  prizesHint: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, marginTop: spacing.xs },
  form: {
    gap: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  fieldGroup: { gap: spacing.xs },
  label: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
  },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center' },
  hint: {
    color: colors.muted,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoBox: {
    backgroundColor: 'rgba(24,24,27,0.6)',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 2 },
  infoBody: { fontFamily: fontFamily.body, fontSize: 12, color: '#D4D4D8', marginTop: 6, lineHeight: 18 },
  infoStrong: { color: colors.ink, fontFamily: fontFamily.semibold },
  infoFoot: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, marginTop: 6 },
  footer: { marginTop: spacing.xxl, alignItems: 'center' },
  footerText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  publicLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  publicCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  publicIcon: { fontSize: 22 },
  publicLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  publicDesc: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  whatsappIcon: { fontSize: 18 },
  whatsappText: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: '#fff' },
  devCredit: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
  devLink: { color: colors.accent, fontFamily: fontFamily.semibold, textDecorationLine: 'underline' },
});
