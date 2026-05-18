import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { verifyLoginCode, requestLoginCode } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const CODE_LEN = 6;

export default function VerifyScreen() {
  const { email = '', name = '', phone = '' } = useLocalSearchParams<{ email?: string; name?: string; phone?: string }>();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resentJustNow, setResentJustNow] = useState(false);
  const [cooldown, setCooldown] = useState(0); // segundos restantes
  const refs = useRef<Array<TextInput | null>>([]);

  // Tick del cooldown cada segundo
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function setDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < CODE_LEN - 1) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && !loading) {
      submit(next.join(''));
    }
  }

  function onKeyPress(i: number, key: string) {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  async function submit(code?: string) {
    const finalCode = code ?? digits.join('');
    if (finalCode.length !== CODE_LEN) return;
    setLoading(true);
    setError(null);
    try {
      await verifyLoginCode(email, finalCode, name || undefined, phone || undefined);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido');
      setDigits(Array(CODE_LEN).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResentJustNow(false);
    setError(null);
    try {
      await requestLoginCode(email);
      setResentJustNow(true);
      setCooldown(30); // 30s anti-spam visible
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reenviar. Intenta de nuevo.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.center}>
          <Logo width={140} />
          <Text style={styles.title}>Revisa tu email</Text>
          <Text style={styles.subtitle}>
            Te enviamos un código de 6 dígitos a {'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                refs.current[i] = r;
              }}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              autoComplete={i === 0 ? 'sms-otp' : undefined}
              autoFocus={i === 0}
              style={[styles.codeInput, !!d && styles.codeInputFilled]}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        <Button
          title="VERIFICAR"
          onPress={() => submit()}
          loading={loading}
          disabled={digits.some((d) => !d)}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={resend}
          style={[styles.resend, (resending || cooldown > 0) && { opacity: 0.6 }]}
          disabled={resending || cooldown > 0}
        >
          <Text style={styles.resendText}>
            ¿No te llegó?{' '}
            {resending ? (
              <Text style={styles.resendLink}>Enviando…</Text>
            ) : cooldown > 0 ? (
              <Text style={styles.resendLink}>Reenviar en {cooldown}s</Text>
            ) : resentJustNow ? (
              <Text style={[styles.resendLink, { color: colors.success }]}>✓ Reenviado · revisa spam</Text>
            ) : (
              <Text style={styles.resendLink}>Reenviar código</Text>
            )}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Usar otro email</Text>
        </Pressable>
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
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: { color: colors.ink, fontFamily: fontFamily.semibold },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  codeInput: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    textAlign: 'center',
    color: colors.ink,
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
  },
  codeInputFilled: {
    borderColor: colors.accent,
    backgroundColor: '#B6FF3C10',
  },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
  resend: { alignItems: 'center', marginTop: spacing.xl },
  resendText: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },
  resendLink: { color: colors.accent, fontFamily: fontFamily.semibold },
  back: { alignItems: 'center', marginTop: spacing.lg },
  backText: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },
});
