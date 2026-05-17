import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api, type ApiMatch, type ApiUser } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { computeGroupStandings, type TeamStanding } from '@/lib/groupStandings';
import { formatDateTime } from '@/lib/format';

export default function CuadroScreen() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [me, setMe] = useState<ApiUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function generatePdf(args: { matches: ApiMatch[]; me: ApiUser | null; groups: ReturnType<typeof computeGroupStandings> }) {
    setGeneratingPdf(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildPdfHtml(args),
        base64: false,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir mis predicciones' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ms, m] = await Promise.all([api.matches(), api.me()]);
      setMatches(ms.matches);
      setMe(m.me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const groups = computeGroupStandings(matches);
  const totalPredicted = groups.reduce((s, g) => s + g.matchesPredicted, 0);
  const totalMatches = groups.reduce((s, g) => s + g.matchesTotal, 0);
  const completePct = totalMatches > 0 ? Math.round((totalPredicted / totalMatches) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Mi Cuadro', headerBackTitle: 'Atrás' }} />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {!loaded ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl * 2 }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.muted, { marginTop: spacing.md }]}>Cargando…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>MUNDIAL 2026</Text>
              <Text style={styles.title}>Mi Cuadro</Text>
              <Text style={styles.subtitle}>
                Así quedan los grupos según tus predicciones.
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${completePct}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {totalPredicted}/{totalMatches}
                </Text>
              </View>
              <View style={styles.actionRow}>
                {completePct < 100 && (
                  <Link href="/predecir-grupos" asChild>
                    <Pressable style={styles.completeBtn}>
                      <Text style={styles.completeBtnText}>
                        {completePct === 0 ? 'EMPEZAR PREDICCIONES →' : 'COMPLETAR →'}
                      </Text>
                    </Pressable>
                  </Link>
                )}
                <Pressable
                  onPress={() => generatePdf({ matches, me, groups })}
                  disabled={generatingPdf}
                  style={styles.pdfBtn}
                >
                  <Text style={styles.pdfBtnText}>{generatingPdf ? 'Generando…' : '📄 PDF'}</Text>
                </Pressable>
              </View>
            </View>

            <ChampionCard champion={me?.championPick ?? null} locked={!!me?.championLockedAt} />

            <Text style={styles.sectionTitle}>FASE DE GRUPOS</Text>
            <View style={styles.groupsGrid}>
              {groups.map((g) => (
                <GroupCard key={g.group} group={g.group} standings={g.standings} predicted={g.matchesPredicted} total={g.matchesTotal} />
              ))}
            </View>

            <Text style={styles.legendTitle}>LEYENDA</Text>
            <View style={styles.legend}>
              <LegendItem color={colors.accent} label="1º · clasifica" />
              <LegendItem color="#3B82F6" label="2º · clasifica" />
              <LegendItem color="#F59E0B" label="3º · posible" />
              <LegendItem color={colors.muted} label="4º · fuera" />
            </View>
            <Text style={styles.legendNote}>
              Los 8 mejores 3ros también pasan a R32. El bracket completo se calcula automático cuando termine la fase de grupos.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

function ChampionCard({ champion, locked }: { champion: string | null; locked: boolean }) {
  return (
    <View style={styles.championCard}>
      <Text style={styles.championEyebrow}>MI CAMPEÓN</Text>
      {champion ? (
        <>
          <Text style={styles.championName}>{champion.toUpperCase()}</Text>
          <Text style={styles.championNote}>
            {locked ? '🔒 Pick congelado al inicio del torneo' : 'Aún puedes cambiarlo antes del 11 jun'}
          </Text>
          {!locked && (
            <Link href="/elegir-campeon" asChild>
              <Pressable>
                <Text style={styles.championCta}>Cambiar →</Text>
              </Pressable>
            </Link>
          )}
        </>
      ) : (
        <>
          <Text style={[styles.championName, { color: colors.muted }]}>Sin elegir</Text>
          <Link href="/elegir-campeon" asChild>
            <Pressable>
              <Text style={styles.championCta}>Elegir campeón →</Text>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}

function GroupCard({ group, standings, predicted, total }: { group: string; standings: TeamStanding[]; predicted: number; total: number }) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>GRUPO {group}</Text>
        <Text style={styles.groupProgress}>
          {predicted}/{total}
        </Text>
      </View>
      {standings.map((s, i) => (
        <TeamRow key={s.team} position={i + 1} standing={s} />
      ))}
    </View>
  );
}

function TeamRow({ position, standing }: { position: number; standing: TeamStanding }) {
  const color =
    position === 1 ? colors.accent
    : position === 2 ? '#3B82F6'
    : position === 3 ? '#F59E0B'
    : colors.muted;

  return (
    <View style={styles.teamRow}>
      <Text style={[styles.position, { color }]}>{position}</Text>
      {standing.flag ? (
        <Image source={{ uri: standing.flag }} style={styles.flag} />
      ) : (
        <View style={[styles.flag, { backgroundColor: colors.border }]} />
      )}
      <Text style={styles.teamName} numberOfLines={1}>{standing.team}</Text>
      <Text style={[styles.points, { color }]}>{standing.pts}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xl },
  muted: { color: colors.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm },

  header: { alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 3 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink, marginTop: 2 },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.bgElev, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.accent },
  progressLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.muted, minWidth: 50, textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  completeBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  completeBtnText: { fontFamily: fontFamily.display, fontSize: fontSize.xs, color: colors.accentFg, letterSpacing: 0.5 },
  pdfBtn: { borderColor: colors.border, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  pdfBtnText: { fontFamily: fontFamily.semibold, fontSize: fontSize.xs, color: colors.ink },

  championCard: {
    borderWidth: 2,
    borderColor: colors.accent + 'AA',
    backgroundColor: colors.accent + '12',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  championEyebrow: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.accent, letterSpacing: 3 },
  championName: { fontFamily: fontFamily.display, fontSize: 28, color: colors.ink, marginTop: 2 },
  championNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  championCta: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.accent, marginTop: spacing.sm, textDecorationLine: 'underline' },

  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: spacing.md },
  groupsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  groupCard: {
    width: '48%',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  groupTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.ink, letterSpacing: 1.5 },
  groupProgress: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  position: { fontFamily: fontFamily.display, fontSize: 14, width: 16, textAlign: 'center' },
  flag: { width: 18, height: 18, borderRadius: 3 },
  teamName: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 12, color: colors.ink },
  points: { fontFamily: fontFamily.display, fontSize: 14, minWidth: 18, textAlign: 'right' },

  legendTitle: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted },
  legendNote: { fontFamily: fontFamily.body, fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 4 },
});

/** Genera HTML para expo-print. Diseñado para A4 con tablas legibles. */
function buildPdfHtml({
  matches,
  me,
  groups,
}: {
  matches: ApiMatch[];
  me: ApiUser | null;
  groups: ReturnType<typeof computeGroupStandings>;
}): string {
  const userLabel = me?.name ?? me?.email ?? '—';
  const totalPredicted = groups.reduce((s, g) => s + g.matchesPredicted, 0);
  const totalMatches = groups.reduce((s, g) => s + g.matchesTotal, 0);
  const champion = me?.championPick ?? 'Sin elegir';
  const generatedAt = formatDateTime(new Date());

  const groupCards = groups
    .map(
      (g) => `
    <div class="group-card">
      <header><h3>GRUPO ${g.group}</h3><span class="mini">${g.matchesPredicted}/${g.matchesTotal}</span></header>
      ${g.standings
        .map(
          (s, i) => `
        <div class="team-row">
          <span class="pos pos-${i + 1}">${i + 1}</span>
          <span class="nm">${escapeHtml(s.team)}</span>
          <span class="pts pts-${i + 1}">${s.pts}</span>
        </div>`,
        )
        .join('')}
    </div>`,
    )
    .join('');

  const matchRows = matches
    .map((m) => {
      const pred = m.predictions?.[0];
      return `
      <div class="match-row">
        <span class="grp">${m.group ? 'G' + m.group : '—'}</span>
        <span class="home">${escapeHtml(m.homeTeam)}</span>
        ${pred ? `<span class="score">${pred.homeScore}–${pred.awayScore}</span>` : '<span class="nopred">sin pred</span>'}
        <span class="away">${escapeHtml(m.awayTeam)}</span>
        <span class="date">${formatDateTime(m.kickoff)}</span>
      </div>`;
    })
    .join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<style>
@page { size: A4; margin: 12mm 14mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; margin: 0; padding: 0; }
.display { font-family: 'Arial Black', 'Helvetica Neue', sans-serif; letter-spacing: -0.02em; }
.header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #B6FF3C; padding-bottom: 8px; margin-bottom: 16px; }
.brand { display: flex; align-items: baseline; gap: 8px; font-weight: 900; }
.brand .pb { font-size: 22px; color: #111; }
.brand .x { color: #999; font-size: 14px; }
.brand .ds { color: #f14826; font-size: 22px; }
h1 { font-size: 24px; margin: 8px 0 0; font-weight: 900; }
.meta { text-align: right; font-size: 11px; color: #555; line-height: 1.5; }
.champion { display: inline-flex; align-items: center; gap: 10px; border: 2px solid #B6FF3C; background: #B6FF3C22; padding: 6px 12px; border-radius: 6px; margin-top: 6px; }
.champion .lbl { font-size: 9px; color: #555; letter-spacing: 0.18em; text-transform: uppercase; }
.champion .name { font-weight: 800; font-size: 14px; }
.section-title { font-size: 11px; letter-spacing: 0.18em; color: #555; text-transform: uppercase; margin: 18px 0 8px; font-weight: 700; }
.groups { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.group-card { border: 1px solid #ccc; border-radius: 5px; padding: 5px 7px; page-break-inside: avoid; }
.group-card header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.group-card h3 { font-size: 10px; font-weight: 800; margin: 0; }
.mini { font-size: 9px; color: #888; }
.team-row { display: grid; grid-template-columns: 14px 1fr 22px; padding: 3px 0; font-size: 10px; border-top: 1px solid #eee; align-items: center; gap: 4px; }
.team-row .pos, .team-row .pts { font-weight: 800; text-align: center; }
.team-row .pts { text-align: right; }
.team-row .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pos-1, .pts-1 { color: #6BA50A; }
.pos-2, .pts-2 { color: #2563EB; }
.pos-3, .pts-3 { color: #D97706; }
.pos-4, .pts-4 { color: #6B7280; }
.match-row { display: grid; grid-template-columns: 50px 1fr 50px 1fr 80px; gap: 6px; padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 10px; align-items: center; }
.match-row .grp { font-weight: 700; color: #555; font-size: 9px; }
.match-row .home { text-align: right; }
.match-row .away { text-align: left; }
.match-row .score { text-align: center; background: #111; color: #B6FF3C; border-radius: 4px; padding: 2px 0; font-weight: 800; }
.match-row .nopred { text-align: center; color: #aaa; font-style: italic; }
.match-row .date { font-size: 8px; color: #888; text-align: right; }
footer { margin-top: 24px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
<div class="header">
  <div>
    <div class="brand"><span class="pb">PADELBOX</span><span class="x">×</span><span class="ds">DELISH!</span></div>
    <h1>Mi Cuadro · Mundial 2026</h1>
    <div class="champion"><span class="lbl">Mi Campeón</span><span class="name">${escapeHtml(champion)}</span></div>
  </div>
  <div class="meta">
    <div><strong>${escapeHtml(userLabel)}</strong></div>
    <div>${generatedAt}</div>
    <div>Predicciones: ${totalPredicted}/${totalMatches}</div>
  </div>
</div>

${
  groups.length > 0
    ? `<h2 class="section-title">Clasificación predicha por grupos</h2><div class="groups">${groupCards}</div>`
    : ''
}

<h2 class="section-title">Todas mis predicciones · ${totalPredicted}/${totalMatches}</h2>
${matchRows}

<footer>PADELBOX × DELISH! · Quiniela del Mundial 2026 · Generado ${generatedAt}</footer>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
