import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { requestLoginCode } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const STADIUM_BG =
  'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=70';

/**
 * Login QuinielaBOX (marca genérica): la app es multi-quiniela, así que aquí
 * no hay branding de ningún club. Cada quiniela pone su marca DENTRO.
 * Flujo: email → código de 6 dígitos (sin contraseñas).
 */
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
      <ImageBackground source={{ uri: STADIUM_BG }} style={{ flex: 1 }} imageStyle={{ opacity: 0.45 }}>
        <View style={styles.overlay} pointerEvents="none" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.center}>
            <Text style={styles.brand}>
              QUINIELA<Text style={{ color: colors.accent }}>BOX</Text>
            </Text>
            <Text style={styles.tagline}>
              La quiniela de tu club, tu peña o tus amigos. Pronostica, compite y sube en la tabla.
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
              <Text style={styles.label}>Teléfono (opcional)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 786 555 0000"
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

          <View style={styles.infoBox}>
            <Text style={styles.infoEyebrow}>¿CÓMO ENTRO?</Text>
            <Text style={styles.infoBody}>
              Pones tu correo y te llega un{' '}
              <Text style={styles.infoStrong}>código de 6 dígitos por email</Text>. Lo introduces
              aquí y entras — <Text style={styles.infoStrong}>sin contraseñas que recordar</Text>.
              Tu sesión queda guardada en este dispositivo.
            </Text>
            <Text style={styles.infoFoot}>
              Tu cuenta se crea sola al introducir el email por primera vez.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Quieres montar la quiniela de tu grupo? Entra y pulsa «Crear mi quiniela»: gratis
              para empezar.
            </Text>
            <Pressable onPress={() => Linking.openURL('https://solint.cloud')} style={{ marginTop: spacing.lg }}>
              <Text style={styles.devCredit}>
                Desarrollado por <Text style={styles.devLink}>Solintlabs · S.Baldini</Text>
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
  brand: { fontFamily: fontFamily.display, fontSize: 34, color: colors.ink, letterSpacing: -1 },
  tagline: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 300,
    lineHeight: 20,
  },
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
  devCredit: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
  devLink: { color: colors.accent, fontFamily: fontFamily.semibold, textDecorationLine: 'underline' },
});
