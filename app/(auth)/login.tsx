import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { requestLoginCode } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

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
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.center}>
          <Logo width={170} />
          <Text style={styles.title}>Quiniela Mundial 2026</Text>
          <Text style={styles.subtitle}>Te enviamos un código por email. Sin contraseñas.</Text>
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
              placeholder="+34 600 000 000"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxl * 2 },
  center: { alignItems: 'center', marginBottom: spacing.xxl },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    color: colors.ink,
    marginTop: spacing.xl,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  form: { gap: spacing.md },
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
