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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE, saasApi } from '@/lib/saas-api';
import { pickLogoDataUrl } from '@/lib/logo-picker';
import { ClaimFailed, PurchaseCancelled, buyForTenant } from '@/lib/iap';
import { Button } from '@/components/Button';

/**
 * Alta de una quiniela desde el teléfono. Crear es GRATIS (plan FREE). La
 * gestión avanzada (competición, partidos, jugadores) vive en el panel web; al
 * terminar se ofrece compartir la invitación y abrir la quiniela recién creada.
 *
 * Con `?plan=<productId>` (viene de Planes) se encadena la compra integrada
 * justo después de crear: la quiniela nace y en el mismo gesto se paga el Pro.
 * Si el pago se cancela o falla, la quiniela YA existe (gratis) y se abre igual.
 */
const ACCENT_CHOICES = ['#B6FF3C', '#3CD3FF', '#FF7A3C', '#FF3C8E', '#C13CFF', '#FFD23C'];

export default function CrearQuiniela() {
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const [name, setName] = useState('');
  const [accent, setAccent] = useState(ACCENT_CHOICES[0]);
  const [logo, setLogo] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function chooseLogo() {
    try {
      const dataUrl = await pickLogoDataUrl();
      if (dataUrl) setLogo(dataUrl);
    } catch (e) {
      Alert.alert('Logo', e instanceof Error ? e.message : 'No se pudo leer la imagen.');
    }
  }

  async function create() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Ponle nombre', 'El nombre debe tener al menos 2 letras.');
      return;
    }
    setSaving(true);
    try {
      const res = await saasApi.createTenant(
        trimmed,
        accent,
        logo ?? undefined,
        description.trim() || undefined,
      );
      const url = `${FALLBACK_SITE}/saas/${res.tenant.slug}`;

      // Venía de Planes con un plan elegido: hoja de pago nativa ahora mismo.
      let upgraded = false;
      if (plan) {
        try {
          await buyForTenant(res.tenant.slug, plan);
          upgraded = true;
        } catch (e) {
          if (e instanceof ClaimFailed) {
            Alert.alert(
              'Pago recibido, falta activarlo',
              `${e.message}

No se te cobrará de nuevo: en Planes, pulsa "Restaurar compras".`,
            );
          } else if (!(e instanceof PurchaseCancelled)) {
            Alert.alert(
              'La quiniela se creó, pero el pago no',
              `${e instanceof Error ? e.message : 'Inténtalo de nuevo.'}

Puedes pasarla a Pro cuando quieras desde Planes.`,
            );
          }
        }
      }

      Alert.alert(
        upgraded ? '¡Quiniela creada y ya en Pro!' : '¡Quiniela creada!',
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
          {plan
            ? 'Primero tu quiniela: nombre y color. Al crearla pagas el plan Pro que elegiste y nace con todas las ventajas.'
            : 'Tu quiniela, tu marca, tus reglas. Gratis para empezar — hasta 15 jugadores.'}
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

        <Text style={styles.label}>Logo (opcional)</Text>
        <View style={styles.logoRow}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoPreview} contentFit="contain" />
          ) : (
            <View style={[styles.logoPreview, styles.logoEmpty]}>
              <Text style={[styles.logoLetter, { color: accent }]}>
                {name.trim().slice(0, 1).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Button
              title={logo ? 'Cambiar logo' : 'Subir logo'}
              variant="secondary"
              fullWidth={false}
              onPress={chooseLogo}
            />
            {logo && (
              <Pressable onPress={() => setLogo(null)}>
                <Text style={styles.logoRemove}>Quitar</Text>
              </Pressable>
            )}
            <Text style={styles.logoHint}>
              El escudo de tu club o negocio. Tus jugadores lo verán en la quiniela.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Descripción y duración (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={'Ej: "La quiniela del Mundial 2026 del club — de junio a julio."'}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          style={[styles.input, { height: 72, paddingTop: spacing.md, textAlignVertical: 'top' }]}
        />

        <View style={{ height: spacing.xl }} />
        <Button
          title={saving ? 'Creando…' : plan ? 'Crear y pasar a Pro' : 'Crear mi quiniela'}
          onPress={create}
          loading={saving}
        />
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
  logoRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoEmpty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  logoLetter: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  logoRemove: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  logoHint: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    lineHeight: 16,
  },
  fine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
