import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { configureNotificationHandler } from '@/lib/push';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

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
    // Mantener splash nativo visible mientras cargan las fuentes
    // (en builds standalone es el icono + bg #0A0A0A definido en app.json;
    // en Expo Go se muestra el splash de Expo Go, no se puede customizar).
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
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
    </GestureHandlerRootView>
  );
}
