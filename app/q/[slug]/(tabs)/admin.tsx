import { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE, fillSlug, saasApi, type SaasAdminPlayer } from '@/lib/saas-api';
import { openWebLoggedIn } from '@/lib/web-bridge';
import { pickLogoDataUrl } from '@/lib/logo-picker';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, ui } from '@/components/tenantUi';
import { Button } from '@/components/Button';

/**
 * Panel rápido del organizador, nativo: sincronizar y recalcular, cierre de
 * pronósticos, % 1X2 antes del cierre, marcar jugadores pagados e invitar.
 * Lo grande (partidos a mano, patrocinadores, billing) sigue en el panel web.
 * El backend re-verifica el rol en cada llamada: esta pestaña solo es UI.
 */
export default function AdminTab() {
  const { data, slug, accent, config, reload, isOrganizer } = useTenant();
  const [players, setPlayers] = useState<SaasAdminPlayer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPlayers = useCallback(() => {
    if (!isOrganizer) return;
    saasApi
      .players(slug)
      .then((r) => setPlayers(r.players))
      .catch(() => {});
  }, [slug, isOrganizer]);

  useFocusEffect(
    useCallback(() => {
      loadPlayers();
    }, [loadPlayers]),
  );

  if (!data || !isOrganizer) return <TabScreen>{null}</TabScreen>;
  const comp = data.competition;
  const panelPath = `/saas/${slug}/panel`;
  const panelFallback = fillSlug(config.upgrade.urlTemplate, slug);

  async function changeLogo() {
    try {
      const dataUrl = await pickLogoDataUrl();
      if (!dataUrl) return;
      setBusy('logo');
      await saasApi.patchTenantLogo(slug, dataUrl);
      setNotice('Logo actualizado ✓');
      await reload();
    } catch (e) {
      Alert.alert('Logo', e instanceof Error ? e.message : 'No se pudo subir el logo.');
    } finally {
      setBusy(null);
    }
  }

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      setNotice(okMsg);
      await reload();
      loadPlayers();
    } catch (e) {
      Alert.alert('No se pudo', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setBusy(null);
    }
  }

  return (
    <TabScreen>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>Tu marca</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {data.tenant.logoUrl ? (
            <Image source={{ uri: data.tenant.logoUrl }} style={s.logo} contentFit="contain" />
          ) : (
            <View style={[s.logo, s.logoEmpty]}>
              <Text style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, color: accent }}>
                {data.tenant.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Button
              title={busy === 'logo' ? 'Subiendo…' : data.tenant.logoUrl ? 'Cambiar logo' : 'Subir logo'}
              variant="secondary"
              loading={busy === 'logo'}
              onPress={changeLogo}
            />
            <Text style={[ui.cardMeta, { marginTop: spacing.xs, fontSize: 11 }]}>
              Lo ven tus jugadores en la cabecera y en el hub.
            </Text>
          </View>
        </View>
      </View>

      {comp && comp.points && (
        <PointsEditor
          slug={slug}
          competitionId={comp.id}
          accent={accent}
          initial={comp.points}
          championBonus={data.champion?.bonus ?? 0}
          onSaved={reload}
        />
      )}

      {comp && (
        <View style={ui.card}>
          <Text style={ui.cardLabel}>Competición</Text>
          <Button
            title={busy === 'sync' ? 'Actualizando…' : '↻ Actualizar partidos y puntos'}
            loading={busy === 'sync'}
            onPress={() =>
              run('sync', () => saasApi.syncCompetition(slug, comp.id), 'Partidos y puntos al día ✓')
            }
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title={busy === 'recompute' ? 'Recalculando…' : 'Recalcular todos los puntos'}
            variant="secondary"
            loading={busy === 'recompute'}
            onPress={() =>
              run(
                'recompute',
                () => saasApi.recomputeCompetition(slug, comp.id),
                'Puntos recalculados ✓',
              )
            }
          />

          <View style={s.settingRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.settingLabel}>% de pronósticos antes del cierre</Text>
              <Text style={ui.cardMeta}>
                Solo la tendencia 1X2; los marcadores siguen ocultos hasta cerrar.
              </Text>
            </View>
            <Switch
              value={comp.showTrendPreClose ?? false}
              trackColor={{ true: accent }}
              disabled={busy === 'trend'}
              onValueChange={(v) =>
                run('trend', () => saasApi.patchCompetition(slug, comp.id, { showTrendPreClose: v }),
                  v ? 'Tendencia visible antes del cierre ✓' : 'Tendencia solo al cierre ✓')
              }
            />
          </View>

          <View style={s.settingRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.settingLabel}>Cierre de pronósticos</Text>
              <Text style={ui.cardMeta}>Minutos antes del partido</Text>
            </View>
            <View style={s.lockControls}>
              {[0, 15, 60, 1440].map((min) => (
                <Pressable
                  key={min}
                  disabled={busy === 'lock'}
                  onPress={() =>
                    run('lock', () => saasApi.patchCompetition(slug, comp.id, { lockOffsetMin: min }),
                      `Cierre ${min === 1440 ? '1 día' : `${min} min`} antes ✓`)
                  }
                  style={[
                    s.lockChip,
                    (comp.lockOffsetMin ?? 15) === min && {
                      backgroundColor: accent,
                      borderColor: accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.lockChipText,
                      (comp.lockOffsetMin ?? 15) === min && { color: colors.accentFg },
                    ]}
                  >
                    {min === 1440 ? '1 día' : `${min}′`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={ui.card}>
        <Text style={ui.cardLabel}>Jugadores {players ? `(${players.length})` : ''}</Text>
        <Text style={[ui.cardMeta, { marginBottom: spacing.sm }]}>
          Marca quién pagó su inscripción. Sin pagar no se puede pronosticar.
        </Text>
        {players?.map((p) => (
          <View key={p.membershipId} style={s.playerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.playerName} numberOfLines={1}>
                {p.name}
                {p.role !== 'PLAYER' ? ` · ${p.role === 'OWNER' ? 'Organizador' : 'Admin'}` : ''}
              </Text>
              {p.email && (
                <Text style={ui.cardMeta} numberOfLines={1}>
                  {p.email}
                </Text>
              )}
            </View>
            {p.role === 'OWNER' ? (
              <Text style={ui.cardMeta}>—</Text>
            ) : (
              <Switch
                value={p.hasPaid}
                trackColor={{ true: accent }}
                onValueChange={(v) =>
                  run(
                    `pay:${p.membershipId}`,
                    () => saasApi.patchPlayer(slug, p.membershipId, { hasPaid: v }),
                    v ? `${p.name} marcado como pagado ✓` : `${p.name} marcado como pendiente`,
                  )
                }
              />
            )}
          </View>
        ))}
        {players && players.length === 0 && (
          <Text style={ui.cardMeta}>Aún no hay jugadores. ¡Invita a tu gente!</Text>
        )}
      </View>

      <View style={ui.card}>
        <Text style={ui.cardLabel}>Herramientas</Text>
        <Button
          title="Invitar jugadores"
          onPress={() =>
            Share.share({
              message: `Únete a la quiniela "${data.tenant.name}": ${FALLBACK_SITE}/saas/${slug}`,
            })
          }
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title="Panel completo (web)"
          variant="secondary"
          onPress={() => openWebLoggedIn(panelPath, panelFallback)}
        />
        {data.me.role === 'OWNER' && data.tenant.plan === 'FREE' && config.upgrade.enabled && (
          <>
            <View style={{ height: spacing.sm }} />
            <Button
              title="⭐ Subir a Pro"
              onPress={() => openWebLoggedIn(panelPath, panelFallback)}
            />
          </>
        )}
        <Text style={[ui.cardMeta, { marginTop: spacing.sm, fontSize: 11 }]}>
          Los botones abren la web con tu sesión iniciada automáticamente.
        </Text>
      </View>

      {notice && <Text style={s.notice}>{notice}</Text>}
    </TabScreen>
  );
}

/**
 * Reglas de puntuación editables desde el móvil (marcador exacto, ganador,
 * diferencia de goles, goles por equipo, bonus empate y bonus campeón) —
 * las mismas que el panel web. Tras guardar conviene «Recalcular puntos».
 */
function PointsEditor({
  slug,
  competitionId,
  accent,
  initial,
  championBonus,
  onSaved,
}: {
  slug: string;
  competitionId: string;
  accent: string;
  initial: { exact: number; winner: number; goalDiff: number; teamScore: number; drawBonus: number };
  championBonus: number;
  onSaved: () => void;
}) {
  const [v, setV] = useState({ ...initial, championBonus });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty =
    v.exact !== initial.exact ||
    v.winner !== initial.winner ||
    v.goalDiff !== initial.goalDiff ||
    v.teamScore !== initial.teamScore ||
    v.drawBonus !== initial.drawBonus ||
    v.championBonus !== championBonus;

  async function save() {
    if (v.exact < v.winner) {
      Alert.alert('Puntos', 'El marcador exacto no puede valer menos que acertar el ganador.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      await saasApi.patchCompetition(slug, competitionId, {
        pointsExact: v.exact,
        pointsWinner: v.winner,
        pointsGoalDiff: v.goalDiff,
        pointsTeamScore: v.teamScore,
        pointsDrawBonus: v.drawBonus,
        pointsBonus: v.championBonus,
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo');
    } finally {
      setSaving(false);
    }
  }

  const rows: { key: keyof typeof v; label: string; hint?: string }[] = [
    { key: 'exact', label: 'Marcador exacto' },
    { key: 'winner', label: 'Acertar el ganador' },
    { key: 'goalDiff', label: 'Diferencia de goles', hint: 'Pones 2-0 y acaba 3-1' },
    { key: 'teamScore', label: 'Goles por equipo clavados' },
    { key: 'drawBonus', label: 'Extra por clavar un empate' },
    { key: 'championBonus', label: 'Bonus por acertar el campeón' },
  ];

  return (
    <View style={ui.card}>
      <Text style={ui.cardLabel}>Cómo se puntúa (personalizable)</Text>
      {rows.map((r) => (
        <View key={r.key} style={s.pointRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.settingLabel}>{r.label}</Text>
            {r.hint && <Text style={ui.cardMeta}>{r.hint}</Text>}
          </View>
          <View style={s.pointControls}>
            <Pressable
              onPress={() => setV((p) => ({ ...p, [r.key]: Math.max(0, p[r.key] - 1) }))}
              style={s.pointBtn}
              hitSlop={6}
            >
              <Text style={s.pointBtnText}>−</Text>
            </Pressable>
            <Text style={[s.pointValue, { color: accent }]}>{v[r.key]}</Text>
            <Pressable
              onPress={() => setV((p) => ({ ...p, [r.key]: Math.min(100, p[r.key] + 1) }))}
              style={s.pointBtn}
              hitSlop={6}
            >
              <Text style={s.pointBtnText}>＋</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {dirty && (
        <View style={{ marginTop: spacing.md }}>
          <Button title={saving ? 'Guardando…' : 'Guardar puntos'} loading={saving} onPress={save} />
          <Text style={[ui.cardMeta, { marginTop: spacing.xs, fontSize: 11 }]}>
            Tras cambiar los puntos, usa «Recalcular todos los puntos» para aplicarlos a lo ya
            jugado.
          </Text>
        </View>
      )}
      {saved && !dirty && <Text style={s.notice}>✓ Puntos guardados</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoEmpty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pointControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pointBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBtnText: { color: colors.ink, fontSize: fontSize.base, fontFamily: fontFamily.bold },
  pointValue: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.base,
    minWidth: 28,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  lockControls: { flexDirection: 'row', gap: 6 },
  lockChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  lockChipText: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.ink },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  notice: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
