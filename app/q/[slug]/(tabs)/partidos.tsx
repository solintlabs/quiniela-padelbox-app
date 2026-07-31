import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { saasApi, type SaasFixtureVM } from '@/lib/saas-api';
import { useTenant } from '@/components/TenantProvider';
import { TabScreen, TeamCell, Stepper, ui } from '@/components/tenantUi';

/**
 * Partidos con pronóstico inline (steppers) y feedback de guardado idéntico
 * a PADELBOX: "✓ Guardado" / "● Sin guardar" / "Sin pronóstico" y la card
 * tintada según el estado.
 */
export default function PartidosTab() {
  const { data, slug, accent, reload } = useTenant();
  const fixtures = data?.fixtures ?? [];

  return (
    <TabScreen>
      {fixtures.length === 0 ? (
        <View style={ui.card}>
          <Text style={ui.cardMeta}>No hay partidos próximos.</Text>
        </View>
      ) : (
        fixtures.map((f) => (
          <FixtureRow
            // El marcador guardado forma parte de la key: si cambia en el
            // servidor la fila se remonta con la verdad nueva.
            key={`${f.id}:${f.myHome ?? 'x'}-${f.myAway ?? 'x'}`}
            fixture={f}
            accent={accent}
            slug={slug}
            canPredict={data?.canPredict ?? false}
            onSaved={reload}
          />
        ))
      )}
    </TabScreen>
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
  const [saved, setSaved] = useState(
    f.myHome !== null && f.myAway !== null ? { h: f.myHome, a: f.myAway } : null,
  );
  const [home, setHome] = useState(f.myHome ?? 0);
  const [away, setAway] = useState(f.myAway ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = saved !== null && (home !== saved.h || away !== saved.a);
  const editable = !f.closed && canPredict;

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
    setSaving(true);
    setError(null);
    try {
      await saasApi.submitEntry(slug, f.id, home, away);
      setSaved({ h: home, a: away });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/q/[slug]/partido/[fixtureId]', params: { slug, fixtureId: f.id } })
      }
      style={[
        ui.card,
        editable &&
          dirty && { borderColor: colors.warning + 'AA', backgroundColor: colors.warning + '12' },
        editable &&
          !dirty &&
          saved !== null && { borderColor: accent + '70', backgroundColor: accent + '12' },
        editable && !dirty && saved === null && { borderColor: accent + '40' },
      ]}
    >
      <View style={s.top}>
        <Text style={ui.cardMeta}>
          {f.round ? `${f.round} · ` : ''}
          {when}
        </Text>
        {f.points !== null && <Text style={[s.pointsBadge, { color: accent }]}>+{f.points}</Text>}
        {f.closed && f.points === null && <Text style={ui.cardMeta}>Cerrado</Text>}
      </View>

      <View style={s.teams}>
        <TeamCell name={f.home} logo={f.homeLogo} />
        <Text style={s.score}>
          {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore}–${f.awayScore}` : 'vs'}
        </Text>
        <TeamCell name={f.away} logo={f.awayLogo} right />
      </View>

      {editable ? (
        <>
          <View style={s.stepperRow}>
            <Stepper value={home} onChange={setHome} accent={accent} disabled={saving} />
            <Text style={ui.cardMeta}>Mi pronóstico</Text>
            <Stepper value={away} onChange={setAway} accent={accent} disabled={saving} />
          </View>
          <View style={s.saveRow}>
            <View style={s.statusRow}>
              {saving && <ActivityIndicator size="small" color={colors.muted} />}
              {!saving && dirty && <Text style={s.statusDirty}>● Sin guardar</Text>}
              {!saving && !dirty && saved !== null && (
                <Text style={s.statusSaved}>✓ Guardado</Text>
              )}
              {!saving && saved === null && <Text style={s.statusMuted}>Sin pronóstico</Text>}
              {!!error && (
                <Text style={s.statusError} numberOfLines={1}>
                  {error}
                </Text>
              )}
            </View>
            {(dirty || saved === null) && (
              <Pressable
                onPress={save}
                disabled={saving}
                style={[s.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.5 }]}
              >
                <Text style={s.saveBtnText}>{saving ? '…' : 'Guardar'}</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : null}

      {f.closed &&
        (f.myHome !== null ? (
          <Text style={[ui.cardMeta, { marginTop: spacing.xs }]}>
            Tu pronóstico:{' '}
            <Text style={{ color: colors.ink, fontFamily: fontFamily.semibold }}>
              {f.myHome}–{f.myAway}
            </Text>
          </Text>
        ) : (
          <Text style={[ui.cardMeta, { marginTop: spacing.xs }]}>No pronosticaste este partido</Text>
        ))}
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pointsBadge: { fontFamily: fontFamily.bold, fontSize: fontSize.sm },
  teams: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  statusSaved: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.success },
  statusDirty: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.warning },
  statusMuted: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  statusError: { fontFamily: fontFamily.body, fontSize: 11, color: colors.danger, flexShrink: 1 },
  saveBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm },
  saveBtnText: {
    fontFamily: fontFamily.display,
    fontSize: 11,
    color: colors.accentFg,
    letterSpacing: 0.3,
  },
});
