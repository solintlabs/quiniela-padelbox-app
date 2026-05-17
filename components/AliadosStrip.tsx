import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, type ApiSponsor } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

/** Construye la URL absoluta del logo (los paths /partners/* viven en la web). */
const WEB_BASE = 'https://quiniela-padelbox.vercel.app';
function logoSrc(logoUrl: string) {
  if (logoUrl.startsWith('http')) return logoUrl;
  return WEB_BASE + logoUrl;
}

/**
 * Strip de logos de aliados comerciales en la app.
 * Carga via /api/sponsors. Si no hay aliados, no renderiza.
 */
export function AliadosStrip() {
  const [sponsors, setSponsors] = useState<ApiSponsor[] | null>(null);

  useEffect(() => {
    api.sponsors().then((r) => setSponsors(r.sponsors)).catch(() => setSponsors([]));
  }, []);

  if (!sponsors || sponsors.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>ALIADOS COMERCIALES</Text>
      <Text style={styles.title}>Premios semanales cortesía de</Text>

      <View style={styles.logosRow}>
        {sponsors.map((s) => (
          <SponsorLogo key={s.id} sponsor={s} />
        ))}
      </View>

      <Text style={styles.note}>
        Top pronosticadores de cada semana se llevan gift cards y productos
        cortesía de nuestros aliados.
      </Text>
    </View>
  );
}

function SponsorLogo({ sponsor }: { sponsor: ApiSponsor }) {
  const inner = sponsor.logoUrl ? (
    <Image source={{ uri: logoSrc(sponsor.logoUrl) }} style={styles.logo} resizeMode="contain" />
  ) : (
    <Text style={styles.nameOnly}>{sponsor.name}</Text>
  );

  if (sponsor.url) {
    return (
      <Pressable onPress={() => Linking.openURL(sponsor.url!)}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.bgElev,
    padding: spacing.lg,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 3,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginTop: 4,
    textAlign: 'center',
  },
  logosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    opacity: 0.85,
  },
  logo: { width: 60, height: 40 },
  nameOnly: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  note: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
