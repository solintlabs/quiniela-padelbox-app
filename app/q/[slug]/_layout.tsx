import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/lib/theme';
import { TenantProvider } from '@/components/TenantProvider';

/**
 * Marco de una quiniela SaaS: el TenantProvider carga /play UNA vez y lo
 * comparte con la tab bar y las pantallas apiladas (partido, jugador).
 */
export default function TenantLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <TenantProvider slug={slug!}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: 'ArchivoBlack_400Regular', color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="partido/[fixtureId]" options={{ title: 'Partido' }} />
        <Stack.Screen name="jugador/[membershipId]" options={{ title: 'Jugador' }} />
      </Stack>
    </TenantProvider>
  );
}
