import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';

// Consolidado: /predecir-grupos -> tab Partidos (Mundial), que ahora divide
// los matches por Grupo A-L automaticamente y tiene champion picker + premios.
export default function RedirectToPartidos() {
  useEffect(() => {
    router.replace('/(tabs)/partidos');
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
