import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

/** Tab bar pre-login: vender antes de pedir el email. */
export default function AuthTabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      initialRouteName="login"
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: 11 },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily: fontFamily.display, color: colors.ink },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="login"
        options={{
          title: t('tabs.enter'),
          // El login es full-bleed (fondo de estadio): sin cabecera.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="log-in-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="descubre"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planes"
        options={{
          title: t('tabs.plans'),
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
