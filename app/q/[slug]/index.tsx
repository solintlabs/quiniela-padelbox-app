import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import {
  FALLBACK_CONFIG,
  FALLBACK_SITE,
  fillSlug,
  saasApi,
  type SaasConfig,
  type SaasFixtureVM,
  type SaasPlayPayload,
} from '@/lib/saas-api';
import { SaasAdSlot } from '@/components/SaasAdSlot';
import { Button } from '@/components/Button';

type TabKey = 'inicio' | 'partidos' | 'ranking' | 'reglas';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'partidos', label: 'Partidos' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'reglas', label: 'Reglas' },
];

/**
 * Pantalla de una quiniela SaaS, espejo de la web: pestañas Inicio / Partidos /
 * Ranking / Reglas, podio, pick de campeón, pronóstico con steppers.
 *
 * Reglas de tienda (Apple): aquí NUNCA se muestran datos de pago del bote —
 * la pestaña Reglas enlaza a la página pública de inscripción en la web.
 * "Subir a Pro" abre el navegador y obedece el kill switch remoto.
 */
export default function TenantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<SaasPlayPayload | null>(null);
  const [config, setConfig] = useState<SaasConfig>(FALLBACK_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>('inicio');

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [play, cfg] = await Promise.all([
        saasApi.play(slug),
        saasApi.config().catch(() => FALLBACK_CONFIG),
      ]);
      setData(play);
      setConfig(cfg);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la quiniela');
    } finally {
      setRefreshing(false);
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const accent = data?.tenant.accentColor ?? colors.accent;
  const isOrganizer = data?.me.role === 'OWNER' || data?.me.role === 'ADMIN';

  if (!data) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Quiniela' }} />
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Reintentar" onPress={load} fullWidth={false} />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: data.tenant.name }} />

      {/* Cabecera de marca del tenant */}
      <View style={styles.header}>
        {data.tenant.logoUrl ? (
          <Image source={{ uri: data.tenant.logoUrl }} style={styles.logo} contentFit="contain" />
        ) : null}
        <Text style={[styles.tenantName, { color: accent }]}>{data.tenant.name}</Text>
        {data.competition ? (
          <Text style={styles.compName}>{data.competition.name}</Text>
        ) : null}
      </View>

      {/* Pestañas */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabBtn}>
            <Text
              style={[
                styles.tabLabel,
                tab === t.key && { color: accent, borderBottomColor: accent },
              ]}
            >
              {t.label}
            </Text>
            <View style={[styles.tabLine, tab === t.key && { backgroundColor: accent }]} />
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={accent}
          />
        }
      >
        {tab === 'inicio' && (
          <InicioTab data={data} accent={accent} slug={slug!} onChanged={load} />
        )}
        {tab === 'partidos' && (
          <PartidosTab data={data} accent={accent} slug={slug!} onSaved={load} />
        )}
        {tab === 'ranking' && <RankingTab data={data} accent={accent} slug={slug!} />}
        {tab === 'reglas' && (
          <ReglasTab
            data={data}
            accent={accent}
            slug={slug!}
            config={config}
            isOrganizer={isOrganizer}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ---------------- Inicio ----------------

function InicioTab({
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
  const ranking = data.ranking ?? [];
  const podium = ranking.slice(0, 3);
  const me = ranking.find((r) => r.isMe);
  const next = (data.fixtures ?? []).filter((f) => !f.closed).slice(0, 3);

  return (
    <View>
      {!data.competition && (
        <EmptyCompetition slug={slug} isOrganizer={data.me.role !== 'PLAYER'} tenantName={data.tenant.name} />
      )}

      {podium.length > 0 && (
        <View style={styles.podiumRow}>
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((r) => (
            <View
              key={r!.membershipId}
              style={[styles.podiumBox, r!.position === 1 && { borderColor: accent }]}
            >
              <Text style={[styles.podiumPos, r!.position === 1 && { color: accent }]}>
                {r!.position}º
              </Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {r!.displayName}
              </Text>
              <Text style={styles.podiumPts}>{r!.points} pts</Text>
            </View>
          ))}
        </View>
      )}

      {me && (
        <View style={[styles.card, { borderColor: accent }]}>
          <Text style={styles.cardLabel}>Tu posición</Text>
          <Text style={[styles.bigNumber, { color: accent }]}>
            {me.position}º · {me.points} pts
          </Text>
          <Text style={styles.cardMeta}>{me.exact} marcadores exactos</Text>
        </View>
      )}

      {!data.me.hasPaid && data.me.role === 'PLAYER' && (
        <View style={[styles.card, { borderColor: colors.warning }]}>
          <Text style={[styles.cardLabel, { color: colors.warning }]}>Inscripción pendiente</Text>
          <Text style={styles.cardMeta}>
            El organizador aún no ha confirmado tu inscripción. Podrás pronosticar en cuanto lo
            haga.
          </Text>
        </View>
      )}

      {data.champion && <ChampionCard data={data} accent={accent} slug={slug} onChanged={onChanged} />}

      {next.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Próximos partidos</Text>
          {next.map((f) => (
            <Text key={f.id} style={styles.nextRow}>
              {f.home} — {f.away}
            </Text>
          ))}
        </View>
      )}

      {data.tenant.plan === 'FREE' && <SaasAdSlot />}
    </View>
  );
}

function EmptyCompetition({
  slug,
  isOrganizer,
  tenantName,
}: {
  slug: string;
  isOrganizer: boolean;
  tenantName: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Sin competición activa</Text>
      <Text style={[styles.cardMeta, { marginBottom: spacing.md }]}>
        {isOrganizer
          ? 'Añade una competición desde el panel para que tu gente empiece a pronosticar.'
          : 'El organizador aún no ha añadido una competición.'}
      </Text>
      {isOrganizer && (
        <>
          <Button
            title="Abrir el panel (web)"
            onPress={() => Linking.openURL(`${FALLBACK_SITE}/saas/${slug}/panel`)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="Invitar jugadores"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: `Únete a la quiniela "${tenantName}": ${FALLBACK_SITE}/saas/${slug}`,
              })
            }
          />
        </>
      )}
    </View>
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
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Pick de campeón · +{champ.bonus} pts</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {myTeam?.logoUrl ? (
          <Image source={{ uri: myTeam.logoUrl }} style={styles.teamLogo} contentFit="contain" />
        ) : null}
        <Text style={[styles.champName, myTeam && { color: accent }]}>
          {myTeam ? myTeam.name : 'Sin elegir'}
        </Text>
      </View>
      {champ.locked ? (
        <Text style={styles.cardMeta}>El pick está cerrado (el torneo ya empezó).</Text>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: accent, fontFamily: fontFamily.semibold, fontSize: fontSize.sm }}>
            {myTeam ? 'Cambiar pick →' : 'Elegir campeón →'}
          </Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xxl }}>
          <Text style={[styles.tenantName, { textAlign: 'center', marginBottom: spacing.lg }]}>
            ¿Quién gana el torneo?
          </Text>
          <FlatList
            data={champ.teams}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => (
              <Pressable
                disabled={saving}
                onPress={() => pick(item.id)}
                style={({ pressed }) => [styles.teamRow, pressed && { opacity: 0.7 }]}
              >
                {item.logoUrl ? (
                  <Image
                    source={{ uri: item.logoUrl }}
                    style={styles.teamLogo}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.teamLogo} />
                )}
                <Text style={styles.teamName}>{item.name}</Text>
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

// ---------------- Partidos ----------------

function PartidosTab({
  data,
  accent,
  slug,
  onSaved,
}: {
  data: SaasPlayPayload;
  accent: string;
  slug: string;
  onSaved: () => void;
}) {
  const fixtures = data.fixtures ?? [];
  if (fixtures.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardMeta}>No hay partidos próximos.</Text>
      </View>
    );
  }
  return (
    <View>
      {fixtures.map((f) => (
        <FixtureRow
          key={f.id}
          fixture={f}
          accent={accent}
          slug={slug}
          canPredict={data.canPredict}
          onSaved={onSaved}
        />
      ))}
    </View>
  );
}

function FixtureRow({
  fixture: f,
  accent,
  slug,
  canPredict,
  onSaved,
}: {
  fixture: SaasFixtureVM;
  accent: string;
  slug: string;
  canPredict: boolean;
  onSaved: () => void;
}) {
  const [home, setHome] = useState<number | null>(f.myHome);
  const [away, setAway] = useState<number | null>(f.myAway);
  const [saving, setSaving] = useState(false);
  const dirty = home !== f.myHome || away !== f.myAway;

  const when = useMemo(() => {
    const d = new Date(f.kickoff);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }, [f.kickoff]);

  async function save() {
    if (home === null || away === null) return;
    setSaving(true);
    try {
      await saasApi.submitEntry(slug, f.id, home, away);
      onSaved();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/q/[slug]/partido/[fixtureId]', params: { slug, fixtureId: f.id } })
      }
      style={styles.card}
    >
      <View style={styles.fixtureTop}>
        <Text style={styles.cardMeta}>
          {f.round ? `${f.round} · ` : ''}
          {when}
        </Text>
        {f.points !== null && (
          <Text style={[styles.pointsBadge, { color: accent }]}>+{f.points}</Text>
        )}
        {f.closed && f.points === null && <Text style={styles.cardMeta}>Cerrado</Text>}
      </View>

      <View style={styles.fixtureTeams}>
        <TeamCell name={f.home} logo={f.homeLogo} />
        <Text style={styles.score}>
          {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore}–${f.awayScore}` : 'vs'}
        </Text>
        <TeamCell name={f.away} logo={f.awayLogo} right />
      </View>

      {!f.closed && canPredict ? (
        <View style={styles.stepperRow}>
          <Stepper value={home} onChange={setHome} accent={accent} />
          <Text style={styles.cardMeta}>Mi pronóstico</Text>
          <Stepper value={away} onChange={setAway} accent={accent} />
        </View>
      ) : null}

      {!f.closed && canPredict && dirty && home !== null && away !== null ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button title={saving ? 'Guardando…' : 'Guardar'} onPress={save} loading={saving} />
        </View>
      ) : null}

      {f.closed && f.myHome !== null && (
        <Text style={[styles.cardMeta, { marginTop: spacing.xs }]}>
          Tu pronóstico: {f.myHome}–{f.myAway}
        </Text>
      )}
    </Pressable>
  );
}

function TeamCell({ name, logo, right }: { name: string; logo: string | null; right?: boolean }) {
  return (
    <View style={[styles.teamCell, right && { alignItems: 'flex-end' }]}>
      {logo ? <Image source={{ uri: logo }} style={styles.teamLogoSm} contentFit="contain" /> : null}
      <Text style={styles.teamCellName} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}

function Stepper({
  value,
  onChange,
  accent,
}: {
  value: number | null;
  onChange: (n: number) => void;
  accent: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(0, (value ?? 0) - 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, value !== null && { color: accent }]}>
        {value ?? '·'}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(20, (value ?? -1) + 1))}
        style={styles.stepBtn}
        hitSlop={8}
      >
        <Text style={styles.stepBtnText}>＋</Text>
      </Pressable>
    </View>
  );
}

// ---------------- Ranking ----------------

function RankingTab({
  data,
  accent,
  slug,
}: {
  data: SaasPlayPayload;
  accent: string;
  slug: string;
}) {
  const ranking = data.ranking ?? [];
  if (ranking.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardMeta}>Todavía no hay puntos. Invita a tu gente y a jugar.</Text>
      </View>
    );
  }
  return (
    <View>
      {ranking.map((r) => (
        <Pressable
          key={r.membershipId}
          onPress={() =>
            router.push({
              pathname: '/q/[slug]/jugador/[membershipId]',
              params: { slug, membershipId: r.membershipId },
            })
          }
          style={[styles.rankRow, r.isMe && { borderColor: accent }]}
        >
          <Text style={[styles.rankPos, r.position <= 3 && { color: accent }]}>{r.position}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rankName, r.isMe && { color: accent }]} numberOfLines={1}>
              {r.displayName}
              {r.isMe ? ' (tú)' : ''}
            </Text>
            <Text style={styles.cardMeta}>{r.exact} exactos</Text>
          </View>
          {r.champion?.logoUrl ? (
            <Image
              source={{ uri: r.champion.logoUrl }}
              style={styles.teamLogoSm}
              contentFit="contain"
            />
          ) : null}
          <Text style={styles.rankPts}>{r.points}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------- Reglas ----------------

function ReglasTab({
  data,
  accent,
  slug,
  config,
  isOrganizer,
}: {
  data: SaasPlayPayload;
  accent: string;
  slug: string;
  config: SaasConfig;
  isOrganizer: boolean;
}) {
  const hasInscription =
    !!data.tenant.entryFee || !!data.tenant.paymentInfo || data.paymentMethods.length > 0;

  return (
    <View>
      {data.competition && data.competition.pointsSummary.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cómo se puntúa</Text>
          {data.competition.pointsSummary.map((line) => (
            <Text key={line} style={styles.ruleLine}>
              · {line}
            </Text>
          ))}
          {data.champion && (
            <Text style={styles.ruleLine}>· Acertar el campeón: +{data.champion.bonus} pts</Text>
          )}
        </View>
      )}

      {data.tenant.rulesText && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Reglas del organizador</Text>
          <Text style={styles.ruleLine}>{data.tenant.rulesText}</Text>
        </View>
      )}

      {data.tenant.prizesText && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Premios</Text>
          <Text style={styles.ruleLine}>{data.tenant.prizesText}</Text>
        </View>
      )}

      {/* El bote se paga FUERA de la app (regla de Apple): solo un enlace. */}
      {hasInscription && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Inscripción</Text>
          {data.tenant.entryFee ? (
            <Text style={[styles.bigNumber, { color: accent }]}>{data.tenant.entryFee}</Text>
          ) : null}
          <Text style={[styles.cardMeta, { marginBottom: spacing.md }]}>
            La cuota y las formas de pago se gestionan fuera de la app.
          </Text>
          <Button
            title="Cómo pagar tu inscripción"
            onPress={() => Linking.openURL(fillSlug(config.inscriptionUrlTemplate, slug))}
          />
        </View>
      )}

      <RenameCard slug={slug} accent={accent} />

      {isOrganizer && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Organizador</Text>
          <Button
            title="Panel completo (web)"
            variant="secondary"
            onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
          />
          {data.tenant.plan === 'FREE' && config.upgrade.enabled && (
            <>
              <View style={{ height: spacing.sm }} />
              <Button
                title="⭐ Subir a Pro"
                onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
              />
              <Pressable onPress={() => router.push({ pathname: '/planes', params: { slug } })}>
                <Text
                  style={{
                    color: accent,
                    fontFamily: fontFamily.semibold,
                    fontSize: fontSize.sm,
                    textAlign: 'center',
                    paddingTop: spacing.md,
                  }}
                >
                  Ver qué incluye cada plan →
                </Text>
              </Pressable>
            </>
          )}
          <View style={{ height: spacing.sm }} />
          <Button
            title="Invitar jugadores"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: `Únete a la quiniela "${data.tenant.name}": ${FALLBACK_SITE}/saas/${slug}`,
              })
            }
          />
        </View>
      )}
    </View>
  );
}

function RenameCard({ slug, accent }: { slug: string; accent: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Tu nombre en esta quiniela</Text>
      <Text style={[styles.cardMeta, { marginBottom: spacing.sm }]}>
        Puedes llamarte distinto en cada quiniela.
      </Text>
      <Button
        title="Cambiar mi nombre"
        variant="secondary"
        onPress={() => {
          Alert.prompt?.(
            'Tu nombre',
            'Cómo te verán en esta quiniela',
            async (name) => {
              if (!name?.trim()) return;
              try {
                await saasApi.rename(slug, name.trim());
                Alert.alert('Listo', `Ahora eres "${name.trim()}" aquí.`);
              } catch (e) {
                Alert.alert('No se pudo', e instanceof Error ? e.message : 'Inténtalo de nuevo');
              }
            },
            'plain-text',
          );
        }}
      />
    </View>
  );
}

// ---------------- estilos ----------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: { color: colors.muted, fontFamily: fontFamily.body, textAlign: 'center' },
  header: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  logo: { width: 40, height: 40, borderRadius: radius.sm, marginBottom: spacing.xs },
  tenantName: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink },
  compName: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  tabBtn: { flex: 1, alignItems: 'center' },
  tabLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.muted,
    paddingVertical: spacing.md,
  },
  tabLine: { height: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  card: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  cardMeta: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted },
  bigNumber: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  nextRow: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingVertical: 3,
  },
  podiumRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  podiumBox: {
    flex: 1,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  podiumPos: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.muted },
  podiumName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: colors.ink,
    marginTop: 2,
  },
  podiumPts: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted },
  champName: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.ink },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamLogo: { width: 28, height: 28 },
  teamLogoSm: { width: 22, height: 22 },
  teamName: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink },
  fixtureTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pointsBadge: { fontFamily: fontFamily.bold, fontSize: fontSize.sm },
  fixtureTeams: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamCell: { flex: 1, gap: 4 },
  teamCellName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  score: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: colors.ink,
    minWidth: 48,
    textAlign: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  stepBtn: { padding: spacing.sm },
  stepBtnText: { color: colors.ink, fontSize: fontSize.lg, fontFamily: fontFamily.bold },
  stepValue: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: colors.muted,
    minWidth: 24,
    textAlign: 'center',
  },
  rankRow: {
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
  rankPos: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.base,
    color: colors.muted,
    minWidth: 26,
    textAlign: 'center',
  },
  rankName: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  rankPts: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.ink },
  ruleLine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingVertical: 2,
    lineHeight: 20,
  },
});
