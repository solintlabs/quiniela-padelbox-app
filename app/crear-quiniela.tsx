import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE, saasApi } from '@/lib/saas-api';
import { Button } from '@/components/Button';

/**
 * Alta de una quiniela desde el teléfono. Crear es GRATIS (plan FREE), así que
 * Apple no exige compra dentro de la app. La gestión avanzada (competición,
 * partidos, jugadores) vive en el panel web; al terminar se ofrece compartir
 * la invitación y abrir la quiniela recién creada.
 */
const ACCENT_CHOICES = ['#B6FF3C', '#3CD3FF', '#FF7A3C', '#FF3C8E', '#C13CFF', '#FFD23C'];

export default function CrearQuiniela() {
  const [name, setName] = useState('');
  const [accent, setAccent] = useState(ACCENT_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  async function create() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Ponle nombre', 'El nombre debe tener al menos 2 letras.');
      return;
    }
    setSaving(true);
    try {
      const res = await saasApi.createTenant(trimmed, accent);
      const url = `${FALLBACK_SITE}/saas/${res.tenant.slug}`;
      Alert.alert(
        '¡Quiniela creada! 🎉',
        'Invita a tu gente y añade la competición desde el panel.',
        [
          {
            text: 'Invitar ahora',
            onPress: async () => {
              await Share.share({ message: `Únete a mi quiniela "${res.tenant.name}": ${url}` });
              router.replace({ pathname: '/q/[slug]', params: { slug: res.tenant.slug } });
            },
          },
          {
            text: 'Abrir la quiniela',
            onPress: () =>
              router.replace({ pathname: '/q/[slug]', params: { slug: res.tenant.slug } }),
          },
        ],
      );
    } catch (e) {
      Alert.alert('No se pudo crear', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Crear quiniela' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Tu quiniela, tu marca, tus reglas. Gratis para empezar — hasta 15 jugadores.
        </Text>

        <Text style={styles.label}>Nombre de la quiniela</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Peña El Rincón, Club Los Pinos…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={80}
          autoFocus
        />

        <Text style={styles.label}>Color</Text>
        <View style={styles.swatchRow}>
          {ACCENT_CHOICES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setAccent(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                accent === c && styles.swatchActive,
              ]}
            />
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
        <Button title={saving ? 'Creando…' : 'Crear mi quiniela'} onPress={create} loading={saving} />
        <Text style={styles.fine}>
          Podrás añadir la competición, los partidos y gestionar jugadores desde el panel web.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl },
  lead: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.muted,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.ink,
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    padding: spacing.lg,
  },
  swatchRow: { flexDirection: 'row', gap: spacing.md },
  swatch: { width: 40, height: 40, borderRadius: radius.full },
  swatchActive: { borderWidth: 3, borderColor: colors.ink },
  fine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
