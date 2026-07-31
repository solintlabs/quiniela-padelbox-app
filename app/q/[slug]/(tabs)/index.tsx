import { useState } from 'react';
import { Alert, FlatList, Linking, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import {
  FALLBACK_SITE,
  fillSlug,
  saasApi,
  type SaasPlayPayload,
  type SaasRankingRow,
} from '@/lib/saas-api';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, ui } from '@/components/tenantUi';
import { SaasAdSlot } from '@/components/SaasAdSlot';
import { Button } from '@/components/Button';

/**
 * Inicio de la quiniela — el dashboard, con la misma energía que PADELBOX:
 * podio arriba, tu posición, próximos partidos con escudos y el pick de
 * campeón. Nada de listas planas.
 */
export default function InicioTab() {
  const { data } = useTenant();
  return <TabScreen>{data && <Inicio data={data} />}</TabScreen>;
}

function Inicio({ data }: { data: SaasPlayPayload }) {
  const { slug, accent, config, reload, isOrganizer } = useTenant();
  const ranking = data.ranking ?? [];
  const podium = ranking.slice(0, 3);
  const me = ranking.find((r) => r.isMe);
  const next = (data.fixtures ?? []).filter((f) => !f.closed).slice(0, 4);
  const pro = config.plans.find((p) => p.id === 'PRO');

  return (
    <View>
      {!data.competition && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Sin competición activa</Text>
          <Text style={[ui.cardMeta, { marginBottom: spacing.md }]}>
            {isOrganizer
              ? 'Añade una competición desde el panel para que tu gente empiece a pronosticar.'
              : 'El organizador aún no ha añadido una competición.'}
          </Text>
          {isOrganizer && (
            <Button
              title="Abrir el panel (web)"
              onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
            />
          )}
        </View>
      )}

      {/* Podio — protagonista, como el PodioHero de PADELBOX. */}
      {podium.length > 0 && (
        <View style={s.podioWrap}>
          <Text style={ui.cardLabel}>El podio</Text>
          <View style={s.podioRow}>
            <PodiumBox row={podium[1]} medal="🥈" height={72} accent={accent} slug={slug} />
            <PodiumBox row={podium[0]} medal="🥇" height={96} accent={accent} slug={slug} first />
            <PodiumBox row={podium[2]} medal="🥉" height={56} accent={accent} slug={slug} />
          </View>
        </View>
      )}

      {me && (
        <View style={[ui.card, { borderColor: accent }]}>
          <Text style={ui.cardLabel}>Tu posición</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
            <Text style={[ui.bigNumber, { color: accent }]}>{me.position}º</Text>
            <Text style={[s.points, { color: colors.ink }]}>{me.points} pts</Text>
            <Text style={ui.cardMeta}>{me.exact} exactos</Text>
          </View>
        </View>
      )}

      {!data.me.hasPaid && data.me.role === 'PLAYER' && (
        <View style={[ui.card, { borderColor: colors.warning }]}>
          <Text style={[ui.cardLabel, { color: colors.warning }]}>Inscripción pendiente</Text>
          <Text style={ui.cardMeta}>
            El organizador aún no ha confirmado tu inscripción. Podrás pronosticar en cuanto lo
            haga.
          </Text>
        </View>
      )}

      {data.champion && <ChampionCard data={data} accent={accent} slug={slug} onChanged={reload} />}

      {next.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Próximos partidos</Text>
          {next.map((f) => (
            <Pressable
              key={f.id}
              onPress={() =>
                router.push({
                  pathname: '/q/[slug]/partido/[fixtureId]',
                  params: { slug, fixtureId: f.id },
                })
              }
              style={s.nextRow}
            >
              <View style={s.nextTeam}>
                {f.homeLogo ? (
                  <Image source={{ uri: f.homeLogo }} style={ui.teamLogoSm} contentFit="contain" />
                ) : null}
                <Text style={s.nextName} numberOfLines={1}>
                  {f.home}
                </Text>
              </View>
              <Text style={s.nextVs}>
                {f.myHome !== null ? `${f.myHome}–${f.myAway}` : 'vs'}
              </Text>
              <View style={[s.nextTeam, { justifyContent: 'flex-end' }]}>
                <Text style={[s.nextName, { textAlign: 'right' }]} numberOfLines={1}>
                  {f.away}
                </Text>
                {f.awayLogo ? (
                  <Image source={{ uri: f.awayLogo }} style={ui.teamLogoSm} contentFit="contain" />
                ) : null}
              </View>
            </Pressable>
          ))}
          <Text style={[ui.cardMeta, { marginTop: spacing.xs, fontSize: 11 }]}>
            Toca un partido para verlo · pronostica en la pestaña Partidos
          </Text>
        </View>
      )}

      {isOrganizer && data.me.role === 'OWNER' && data.tenant.plan === 'FREE' && config.upgrade.enabled && (
        <Pressable
          onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
          style={[ui.card, { borderColor: accent }]}
        >
          <Text style={[ui.cardLabel, { color: accent }]}>⭐ Pásate a Pro</Text>
          <Text style={ui.ruleLine}>
            Sin anuncios · hasta {pro?.limits.maxPlayers ?? 500} jugadores · tu logo y tu marca
          </Text>
          <Text style={[s.upsellCta, { color: accent }]}>
            {pro?.season ? `$${pro.season.priceUsd} ${pro.season.label} (pago único) →` : 'Ver planes →'}
          </Text>
        </Pressable>
      )}

      {data.tenant.plan === 'FREE' && <SaasAdSlot />}

      {isOrganizer && (
        <Button
          title="Invitar jugadores"
          variant="secondary"
          onPress={() =>
            Share.share({
              message: `Únete a la quiniela "${data.tenant.name}": ${FALLBACK_SITE}/saas/${slug}`,
            })
          }
        />
      )}
    </View>
  );
}

function PodiumBox({
  row,
  medal,
  height,
  accent,
  slug,
  first,
}: {
  row?: SaasRankingRow;
  medal: string;
  height: number;
  accent: string;
  slug: string;
  first?: boolean;
}) {
  if (!row) return <View style={{ flex: 1 }} />;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/q/[slug]/jugador/[membershipId]',
          params: { slug, membershipId: row.membershipId },
        })
      }
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
    >
      <Text style={s.medal}>{medal}</Text>
      <Text style={[s.podioName, first && { color: accent }]} numberOfLines={1}>
        {row.displayName}
      </Text>
      <Text style={s.podioPts}>{row.points} pts</Text>
      <View
        style={[
          s.podioBar,
          { height, backgroundColor: first ? accent : colors.bgElev },
          !first && { borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text style={[s.podioPos, first && { color: colors.accentFg }]}>{row.position}</Text>
      </View>
    </Pressable>
  );
}

function ChampionCard({
  data,
  accent,
  slug,
  onChanged,
}: {
  data: SaasPlayPayload;
  accent: string;
  slug: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const champ = data.champion!;
  const myTeam = champ.teams.find((t) => t.id === champ.myTeamId) ?? null;

  async function pick(teamId: string) {
    if (!data.competition) return;
    setSaving(true);
    try {
      await saasApi.setChampion(slug, data.competition.id, teamId);
      setOpen(false);
      onChanged();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={ui.card}>
      <Text style={ui.cardLabel}>Pick de campeón · +{champ.bonus} pts</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {myTeam?.logoUrl ? (
          <Image source={{ uri: myTeam.logoUrl }} style={s.champLogo} contentFit="contain" />
        ) : (
          <Text style={{ fontSize: 22 }}>🏆</Text>
        )}
        <Text style={[s.champName, myTeam && { color: accent }]}>
          {myTeam ? myTeam.name : 'Sin elegir'}
        </Text>
      </View>
      {champ.locked ? (
        <Text style={ui.cardMeta}>El pick está cerrado (el torneo ya empezó).</Text>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: accent, fontFamily: fontFamily.semibold, fontSize: fontSize.sm }}>
            {myTeam ? 'Cambiar pick →' : 'Elegir campeón →'}
          </Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xxl }}>
          <Text style={s.modalTitle}>¿Quién gana el torneo?</Text>
          <FlatList
            data={champ.teams}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => (
              <Pressable
                disabled={saving}
                onPress={() => pick(item.id)}
                style={({ pressed }) => [s.teamRow, pressed && { opacity: 0.7 }]}
              >
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} style={s.champLogo} contentFit="contain" />
                ) : (
                  <View style={s.champLogo} />
                )}
                <Text style={s.teamName}>{item.name}</Text>
                {item.id === champ.myTeamId && (
                  <Text style={{ color: accent, fontSize: fontSize.lg }}>✓</Text>
                )}
              </Pressable>
            )}
          />
          <View style={{ padding: spacing.lg }}>
            <Button title="Cerrar" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  podioWrap: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  podioRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  medal: { fontSize: 20, marginBottom: 2 },
  podioName: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.ink },
  podioPts: { fontFamily: fontFamily.body, fontSize: 10, color: colors.muted, marginBottom: 4 },
  podioBar: {
    alignSelf: 'stretch',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podioPos: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.muted },
  points: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nextTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  nextName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink, flexShrink: 1 },
  nextVs: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    color: colors.muted,
    minWidth: 40,
    textAlign: 'center',
  },
  upsellCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, marginTop: spacing.xs },
  champLogo: { width: 28, height: 28 },
  champName: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.ink },
  modalTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamName: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink },
});
