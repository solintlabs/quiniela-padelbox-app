import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    ArchivoBlack_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Mientras cargan las fuentes, mostramos fondo dark con logo para evitar
    // el flash blanco que Expo Go inyecta antes de que aparezca la UI.
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../assets/logo-blanco.png')}
          style={{ width: 180, height: 60, resizeMode: 'contain' }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" backgroundColor={colors.bg} />
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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="partido/[id]" options={{ title: 'Partido' }} />
        <Stack.Screen name="inscripcion" options={{ title: 'Inscripción' }} />
        <Stack.Screen name="predecir-grupos" options={{ title: 'Fase de grupos' }} />
        <Stack.Screen name="reglas" options={{ title: 'Reglas' }} />
        <Stack.Screen name="usuario/[id]" options={{ title: 'Jugador' }} />
      </Stack>
      </View>
    </SafeAreaProvider>
  );
}
