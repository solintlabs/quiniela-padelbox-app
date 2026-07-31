import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, ui } from '@/components/tenantUi';

/** Clasificación completa; cada fila abre el perfil del jugador. */
export default function RankingTab() {
  const { data, slug, accent } = useTenant();
  const ranking = data?.ranking ?? [];

  return (
    <TabScreen>
      {ranking.length === 0 ? (
        <View style={ui.card}>
          <Text style={ui.cardMeta}>Todavía no hay puntos. Invita a tu gente y a jugar.</Text>
        </View>
      ) : (
        ranking.map((r) => (
          <Pressable
            key={r.membershipId}
            onPress={() =>
              router.push({
                pathname: '/q/[slug]/jugador/[membershipId]',
                params: { slug, membershipId: r.membershipId },
              })
            }
            style={[s.row, r.isMe && { borderColor: accent }]}
          >
            <Text style={[s.pos, r.position <= 3 && { color: accent }]}>
              {r.position <= 3 ? ['🥇', '🥈', '🥉'][r.position - 1] : r.position}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.name, r.isMe && { color: accent }]} numberOfLines={1}>
                {r.displayName}
                {r.isMe ? ' (tú)' : ''}
              </Text>
              <Text style={ui.cardMeta}>{r.exact} exactos</Text>
            </View>
            {r.champion?.logoUrl ? (
              <Image
                source={{ uri: r.champion.logoUrl }}
                style={ui.teamLogoSm}
                contentFit="contain"
              />
            ) : null}
            <Text style={s.pts}>{r.points}</Text>
          </Pressable>
        ))
      )}
    </TabScreen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pos: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.base,
    color: colors.muted,
    minWidth: 30,
    textAlign: 'center',
  },
  name: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  pts: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
});
