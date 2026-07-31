import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

/**
 * Zona sin sesión. La entrada es una mini-landing con tab bar (Entrar /
 * Descubre / Planes): quien descarga la app sin cuenta ve qué es y cuánto
 * cuesta antes de registrarse. `verify` (código OTP) va apilada encima.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
