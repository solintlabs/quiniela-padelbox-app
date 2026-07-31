import { Linking } from 'react-native';
import { saasApi } from './saas-api';

/**
 * Abre una ruta de quinielabox.com en el navegador YA LOGUEADO como el
 * usuario de la app (POST /api/auth/bridge → URL de un solo uso). Si el
 * puente falla (sin red, server viejo), abre la URL normal: mejor un login
 * manual que un botón muerto.
 */
export async function openWebLoggedIn(nextPath: string, fallbackUrl: string): Promise<void> {
  try {
    const { url } = await saasApi.bridge(nextPath);
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}
