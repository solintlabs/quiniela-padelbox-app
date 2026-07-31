import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';
import { useTenant } from '@/components/TenantProvider';
import { Button } from '@/components/Button';

/** Piezas de UI compartidas por las pestañas de una quiniela SaaS. */

/**
 * Envoltorio estándar de cada pestaña: scroll + pull-to-refresh conectado al
 * TenantProvider, padding consistente y estados de carga/error. Las pestañas
 * solo pintan su contenido cuando `data` existe.
 */
export function TabScreen({ children }: { children: React.ReactNode }) {
  const { data, error, refreshing, refresh, reload, accent } = useTenant();

  if (!data) {
    return (
      <View style={ui.center}>
        {error ? (
          <>
            <Text style={ui.errorText}>{error}</Text>
            <Button title="Reintentar" onPress={reload} fullWidth={false} />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />
      }
    >
      {children}
    </ScrollView>
  );
}

export function TeamCell({ name, logo, right }: { name: string; logo: string | null; right?: boolean }) {
  return (
    <View style={[ui.teamCell, right && { alignItems: 'flex-end' }]}>
      {logo ? <Image source={{ uri: logo }} style={ui.teamLogoSm} contentFit="contain" /> : null}
      <Text style={ui.teamCellName} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  accent,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <View style={ui.stepper}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
        style={[ui.stepBtn, (disabled || value <= 0) && { opacity: 0.3 }]}
        hitSlop={8}
      >
        <Text style={ui.stepBtnText}>−</Text>
      </Pressable>
      <Text style={[ui.stepValue, { color: accent }]}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={disabled || value >= 20}
        style={[ui.stepBtn, (disabled || value >= 20) && { opacity: 0.3 }]}
        hitSlop={8}
      >
        <Text style={ui.stepBtnText}>＋</Text>
      </Pressable>
    </View>
  );
}

export const ui = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: { color: colors.muted, fontFamily: fontFamily.body, textAlign: 'center' },
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
  ruleLine: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingVertical: 2,
    lineHeight: 20,
  },
  teamCell: { flex: 1, gap: 4 },
  teamCellName: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: colors.ink },
  teamLogoSm: { width: 22, height: 22 },
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  linkLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, color: colors.ink },
  linkArrow: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.muted },
});
