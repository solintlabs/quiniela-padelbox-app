import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * i18n mínimo y sin dependencias: diccionario es/en para el "chrome" de la
 * app (navegación, hub, cuenta, login). El contenido que viene del servidor
 * (planes, reglas del organizador…) se muestra tal cual por ahora.
 * El idioma elegido persiste en SecureStore.
 */
export type Locale = 'es' | 'en';
const STORE_KEY = 'app.locale';

const STRINGS = {
  es: {
    'tabs.enter': 'Entrar',
    'tabs.discover': 'Descubre',
    'tabs.plans': 'Planes',
    'tabs.home': 'Inicio',
    'tabs.matches': 'Partidos',
    'tabs.ranking': 'Ranking',
    'tabs.rules': 'Reglas',
    'tabs.profile': 'Perfil',
    'tabs.admin': 'Admin',
    'hub.hello': '¡Hola{name}! 👋 Estas son tus quinielas',
    'hub.create': '＋ Crear mi quiniela',
    'hub.join': 'Unirme con un código',
    'hub.joinLabel': 'Código de la quiniela',
    'hub.joinHint': 'Es el nombre corto del link de invitación',
    'hub.joining': 'Uniendo…',
    'hub.joinCta': 'Unirme',
    'hub.cancel': 'Cancelar',
    'hub.plansLink': 'Ver planes y precios',
    'account.title': 'Mi cuenta',
    'account.notifications': 'Activar notificaciones',
    'account.myPools': 'Mis quinielas',
    'account.support': 'Soporte',
    'account.language': 'Idioma',
    'account.logout': 'Cerrar sesión',
    'account.delete': 'Eliminar mi cuenta',
    'login.sendCode': 'ENVIAR CÓDIGO',
    'login.name': 'Nombre',
    'login.phone': 'Teléfono (opcional)',
    'login.email': 'Email',
    'login.or': 'o continúa con',
    'login.google': 'Continuar con Google',
  },
  en: {
    'tabs.enter': 'Sign in',
    'tabs.discover': 'Discover',
    'tabs.plans': 'Plans',
    'tabs.home': 'Home',
    'tabs.matches': 'Matches',
    'tabs.ranking': 'Standings',
    'tabs.rules': 'Rules',
    'tabs.profile': 'Profile',
    'tabs.admin': 'Admin',
    'hub.hello': 'Hi{name}! 👋 These are your pools',
    'hub.create': '＋ Create my pool',
    'hub.join': 'Join with a code',
    'hub.joinLabel': 'Pool code',
    'hub.joinHint': "It's the short name in the invite link",
    'hub.joining': 'Joining…',
    'hub.joinCta': 'Join',
    'hub.cancel': 'Cancel',
    'hub.plansLink': 'See plans and pricing',
    'account.title': 'My account',
    'account.notifications': 'Enable notifications',
    'account.myPools': 'My pools',
    'account.support': 'Support',
    'account.language': 'Language',
    'account.logout': 'Sign out',
    'account.delete': 'Delete my account',
    'login.sendCode': 'SEND CODE',
    'login.name': 'Name',
    'login.phone': 'Phone (optional)',
    'login.email': 'Email',
    'login.or': 'or continue with',
    'login.google': 'Continue with Google',
  },
} as const;

type StringKey = keyof (typeof STRINGS)['es'];

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'es') setLocaleState(v);
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    SecureStore.setItemAsync(STORE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string>) => {
      let s: string = STRINGS[locale][key] ?? STRINGS.es[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
      }
      return s;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fuera de I18nProvider');
  return ctx;
}
