/**
 * Sistema de diseño PADELBOX para la app móvil.
 * Equivalente a app/globals.css del repo web.
 * Dark mode forzado (app.json: userInterfaceStyle: 'dark').
 */
export const colors = {
  bg: '#0A0A0A',
  bgElev: '#141414',
  ink: '#FAFAFA',
  muted: '#A3A3A3',
  border: '#262626',
  accent: '#B6FF3C',
  accentFg: '#0A0A0A',
  success: '#4ADE80',
  danger: '#F87171',
  warning: '#FBBF24',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  display: 28,
  hero: 44,
} as const;

/** Familias cargadas en app/_layout.tsx vía @expo-google-fonts */
export const fontFamily = {
  display: 'ArchivoBlack_400Regular',
  body: 'Inter_400Regular',
  bold: 'Inter_700Bold',
  semibold: 'Inter_600SemiBold',
} as const;
