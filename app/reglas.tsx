import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const RULES = [
  { points: '+3 pts', color: 'success', title: 'Marcador exacto', desc: 'Aciertas resultado y diferencia (ej. predices 2-1, sale 2-1).' },
  { points: '+1 pt', color: 'warning', title: 'Ganador correcto', desc: 'Aciertas quién gana (o empate) pero no el marcador exacto.' },
  { points: '0 pts', color: 'muted', title: 'Fallo', desc: 'Te equivocas de ganador (o no predijiste).' },
];

const PHASES = [
  { title: 'Fase de grupos', detail: '48 partidos · 12 grupos de 4 · disponibles desde hoy' },
  { title: '1/16 de final', detail: '16 partidos · aparecen al terminar la fase de grupos' },
  { title: 'Octavos', detail: '8 partidos' },
  { title: 'Cuartos', detail: '4 partidos' },
  { title: 'Semifinales', detail: '2 partidos' },
  { title: '3er puesto + Final', detail: '2 partidos' },
];

export default function ReglasScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>CÓMO FUNCIONA</Text>
      <Text style={styles.title}>Reglas de la Quiniela</Text>
      <Text style={styles.intro}>
        Quiniela privada del Mundial 2026 para los socios del club PADELBOX.
      </Text>

      <Section title="1. Puntuación">
        <Text style={styles.body}>Por cada partido, comparamos tu pronóstico con el resultado final:</Text>
        <View style={styles.card}>
          {RULES.map((r, i) => (
            <View key={r.title} style={[styles.ruleRow, i > 0 && styles.ruleRowBorder]}>
              <Text
                style={[
                  styles.rulePoints,
                  r.color === 'success' && { color: colors.success },
                  r.color === 'warning' && { color: colors.warning },
                  r.color === 'muted' && { color: colors.muted },
                ]}
              >
                {r.points}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bonusBox}>
          <Text style={styles.bonusTitle}>🏆  Bonus campeón del Mundial</Text>
          <Text style={styles.body}>
            Si aciertas al campeón del Mundial 2026, sumas{' '}
            <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>+25 pts</Text> extra.
            Tu pick se configura desde el <Text style={styles.inline}>perfil</Text> y tienes hasta el inicio
            del primer partido para decidir.
          </Text>
        </View>
      </Section>

      <Section title="2. Cierre de pronósticos">
        <Text style={styles.body}>
          Cada partido se cierra <Text style={styles.bold}>15 minutos antes del kickoff</Text>. Tras
          el cierre ya no se puede crear ni modificar el pronóstico para ese partido.
        </Text>
        <Text style={[styles.body, { marginTop: spacing.sm }]}>
          Puedes ajustar tu pronóstico cuantas veces quieras hasta el cierre — solo cuenta la última versión.
        </Text>
      </Section>

      <Section title="3. Fases del torneo">
        <Text style={styles.body}>
          El Mundial 2026 tiene <Text style={styles.bold}>104 partidos</Text> en total:
        </Text>
        <View style={styles.card}>
          {PHASES.map((p, i) => (
            <View key={p.title} style={[styles.phaseRow, i > 0 && styles.ruleRowBorder]}>
              <Text style={styles.phaseTitle}>{p.title}</Text>
              <Text style={styles.phaseDetail}>{p.detail}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.body, { marginTop: spacing.sm }]}>
          Los partidos de eliminatoria aparecen automáticamente conforme se definen los emparejamientos reales.
        </Text>
      </Section>

      <Section title="4. Ranking">
        <Text style={styles.body}>
          El ranking se ordena por <Text style={styles.bold}>puntos totales</Text>. En caso de empate:
        </Text>
        <Text style={styles.bullet}>1. Mayor número de marcadores exactos.</Text>
        <Text style={styles.bullet}>2. Si persiste, gana quien se inscribió primero.</Text>
      </Section>

      <Section title="5. Pago e inscripción">
        <Text style={styles.body}>
          Para enviar pronósticos hay que pagar la cuota única. Métodos aceptados: Pago Móvil,
          Transferencia Banesco, Zelle, Binance Pay.{' '}
          <Link href="/inscripcion" asChild>
            <Text style={styles.inline}>Ver métodos →</Text>
          </Link>
        </Text>
      </Section>

      <Section title="6. Privacidad de los pronósticos">
        <Text style={styles.body}>
          Los pronósticos de los demás socios <Text style={styles.bold}>solo son visibles tras el
          cierre del partido</Text> (15 min antes del kickoff). Antes del cierre, cada uno solo ve los
          suyos. Sin trampas posibles, ya que nadie puede modificar tras el cierre.
        </Text>
      </Section>

      <Section title="7. Premios">
        <Text style={styles.body}>
          Los premios se entregan en el club al finalizar el Mundial. Ver lista en{' '}
          <Link href="/inscripcion" asChild>
            <Text style={styles.inline}>Inscripción</Text>
          </Link>.
        </Text>
      </Section>

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>¿Dudas?</Text>
        <Pressable onPress={() => Linking.openURL('mailto:info@solint.cloud')}>
          <Text style={[styles.helpBody, styles.inline]}>info@solint.cloud</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  eyebrow: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.6 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink, marginTop: spacing.xs },
  intro: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.md, lineHeight: 20 },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.ink, marginBottom: spacing.sm },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, lineHeight: 20 },
  bold: { color: colors.ink, fontFamily: fontFamily.semibold },
  inline: { color: colors.accent, fontFamily: fontFamily.semibold, textDecorationLine: 'underline' },
  bullet: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: 4, marginLeft: spacing.sm },
  card: { backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  ruleRowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  rulePoints: { fontFamily: fontFamily.display, fontSize: fontSize.lg, width: 64 },
  ruleTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  ruleDesc: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  phaseRow: { padding: spacing.md },
  phaseTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  phaseDetail: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  bonusBox: { backgroundColor: '#B6FF3C0D', borderColor: colors.accent + '50', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  bonusTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  helpBox: { marginTop: spacing.xl, backgroundColor: colors.bgElev, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  helpTitle: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  helpBody: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.sm },
});
