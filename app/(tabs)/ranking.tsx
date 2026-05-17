import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { api, type ApiRanking } from '@/lib/api';
import { colors, fontFamily, fontSize, radius, spacing } from '@/lib/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const [data, setData] = useState<ApiRanking | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.ranking());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
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

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>
            Desempate por marcadores exactos · luego por fecha de registro.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colPos]}>#</Text>
            <Text style={[styles.th, styles.colName]}>Jugador</Text>
            <Text style={[styles.th, styles.colNum]}>PJ</Text>
            <Text style={[styles.th, styles.colNum]}>Exact</Text>
            <Text style={[styles.th, styles.colNum]}>Pts</Text>
            <Text style={[styles.th, styles.colChevron]}>{' '}</Text>
          </View>
        </View>
      }
      data={data?.ranking ?? []}
      keyExtractor={(row) => row.userId}
      renderItem={({ item, index }) => {
        const pos = index + 1;
        const isMe = item.userId === data?.meId;
        return (
          <Link href={{ pathname: '/usuario/[id]', params: { id: item.userId } }} asChild>
            <Pressable>
              <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={[styles.cell, styles.colPos, isMe && styles.cellMe]}>
                  {pos <= 3 ? `${MEDAL[pos - 1]} ${pos}` : isMe ? `▶ ${pos}` : pos}
                </Text>
                <Text style={[styles.cell, styles.colName, isMe && styles.cellMe]} numberOfLines={1}>
                  {item.name ?? item.email}
                  {isMe && <Text style={{ color: colors.muted }}>  · tú</Text>}
                </Text>
                <Text style={[styles.cell, styles.colNum]}>{item.played}</Text>
                <Text style={[styles.cell, styles.colNum]}>{item.exact}</Text>
                <Text style={[styles.cell, styles.points, styles.colNum, isMe && { color: colors.accent }]}>
                  {item.points}
                </Text>
                <Text style={[styles.cell, styles.colChevron]}>›</Text>
              </View>
            </Pressable>
          </Link>
        );
      }}
      ListEmptyComponent={
        !error ? <Text style={styles.empty}>Aún no hay puntos. ¡Empieza la quiniela!</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.md },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.display, color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  th: { fontFamily: fontFamily.semibold, fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  rowMe: { backgroundColor: '#B6FF3C15', borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.accent + '88', borderRadius: radius.sm, paddingHorizontal: spacing.sm, marginHorizontal: -spacing.sm },
  cell: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  cellMe: { fontFamily: fontFamily.bold },
  points: { fontFamily: fontFamily.display, fontSize: fontSize.base },
  colPos: { width: 44, paddingRight: 6 },
  colName: { flex: 1, paddingRight: 6 },
  colNum: { width: 38, textAlign: 'right', paddingRight: 6 },
  colChevron: { width: 14, textAlign: 'right', color: colors.muted },
  empty: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
  error: { color: colors.danger, fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.sm },
});
