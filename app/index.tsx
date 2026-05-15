import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '@/lib/auth';
import { colors } from '@/lib/theme';

/** Pantalla de bootstrap: decide a dónde llevar al usuario según haya sesión. */
export default function Index() {
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
