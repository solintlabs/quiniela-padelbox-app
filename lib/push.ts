import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Configura el handler global para mostrar notificaciones cuando la app
 * está en primer plano (por defecto Expo las silencia).
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Pide permisos al usuario, obtiene el token Expo y lo registra en el
 * backend. Devuelve true si quedó registrado.
 *
 * Llamar tras el login (cuando ya hay JWT). En simulador iOS no funciona
 * porque APNS no entrega — solo en dispositivo real.
 */
export async function registerForPushAsync(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[push] solo funciona en dispositivo real (no simulador)');
    return false;
  }

  // Android: canal por defecto
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B6FF3C',
    });
  }

  // Permisos
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    console.warn('[push] permiso denegado');
    return false;
  }

  // Token Expo
  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) {
    console.warn('[push] sin projectId en app.json extra.eas');
    return false;
  }

  let token: string;
  try {
    const r = await Notifications.getExpoPushTokenAsync({ projectId });
    token = r.data;
  } catch (e) {
    console.warn('[push] no se pudo obtener token Expo:', e instanceof Error ? e.message : e);
    return false;
  }

  // Registra en backend
  try {
    await api.registerPushDevice(token, Platform.OS as 'ios' | 'android');
    return true;
  } catch (e) {
    console.warn('[push] backend rechazo el token:', e instanceof Error ? e.message : e);
    return false;
  }
}
