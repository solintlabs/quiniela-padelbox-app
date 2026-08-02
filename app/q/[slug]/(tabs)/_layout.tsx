import { Pressable, Text, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, fontFamily } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/components/TenantProvider';

/**
 * Tab bar nativa de una quiniela SaaS — misma estructura que PADELBOX.
 * El color activo es el ACENTO DEL TENANT y la cabecera lleva su marca.
 * La pestaña Admin solo existe para OWNER/ADMIN (href null la oculta).
 */
function TenantHeaderTitle() {
  const { data, accent } = useTenant();
  return (
    <Pressable
      onPress={() => router.navigate('/quinielas')}
      accessibilityRole="link"
      accessibilityLabel="Ir a mis quinielas"
      hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 260 }}
    >
      {data?.tenant.logoUrl ? (
        <Image
          source={{ uri: data.tenant.logoUrl }}
          style={{ width: 26, height: 26, borderRadius: 6 }}
          contentFit="contain"
        />
      ) : null}
      <View>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fontFamily.display, fontSize: 16, color: accent }}
        >
          {data?.tenant.name ?? 'Quiniela'}
        </Text>
        {data?.competition && (
          <Text
            numberOfLines={1}
            style={{ fontFamily: fontFamily.body, fontSize: 10, color: colors.muted }}
          >
            {data.competition.name}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function TenantTabsLayout() {
  const { accent, isOrganizer } = useTenant();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: 10 },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitle: () => <TenantHeaderTitle />,
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="partidos"
        options={{
          title: t('tabs.matches'),
          tabBarIcon: ({ color, size }) => <Ionicons name="football-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: t('tabs.ranking'),
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reglas"
        options={{
          title: t('tabs.rules'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('tabs.admin'),
          // Oculta del todo para jugadores; el backend re-verifica igualmente.
          href: isOrganizer ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
