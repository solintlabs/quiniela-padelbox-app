import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { FALLBACK_SITE, fillSlug, saasApi, type SaasAdminPlayer } from '@/lib/saas-api';
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
          onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
        />
        {data.me.role === 'OWNER' && data.tenant.plan === 'FREE' && config.upgrade.enabled && (
          <>
            <View style={{ height: spacing.sm }} />
            <Button
              title="⭐ Subir a Pro"
              onPress={() => Linking.openURL(fillSlug(config.upgrade.urlTemplate, slug))}
            />
          </>
        )}
      </View>

      {notice && <Text style={s.notice}>{notice}</Text>}
    </TabScreen>
  );
}

const s = StyleSheet.create({
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
