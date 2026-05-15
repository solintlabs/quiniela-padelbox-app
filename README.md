# Quiniela PADELBOX · App móvil

App nativa (React Native + Expo) para la **Quiniela Mundial 2026** de PADELBOX. Companion del repo backend [solintlabs/quiniela-padelbox](https://github.com/solintlabs/quiniela-padelbox).

## Stack

- **Expo SDK 54** + TypeScript
- **expo-router** (file-based routing con tabs)
- **expo-secure-store** (token JWT)
- **expo-clipboard** (copiar IBAN/Bizum)
- **@expo-google-fonts** (Inter + Archivo Black, mismo type system que la web)
- Dark mode forzado, paleta verde lima `#B6FF3C`
- Consume la API REST en `https://quiniela-padelbox.vercel.app`

## Auth

Login por **código numérico de 6 dígitos** vía email:

```
[App] usuario pone email + (opcional) nombre
     ↓ POST /api/auth/code/request
[Backend] genera código, HMAC-guarda en VerificationToken,
          envía email con código grande
     ↓ usuario copia código
[App] pega los 6 dígitos
     ↓ POST /api/auth/code/verify
[Backend] valida, upsert User, firma JWT (90 días)
[App] guarda JWT en SecureStore → entra
```

Mismo email funciona en web y app: misma cuenta, mismo ranking, mismos pronósticos.

## Arranque local

```bash
npm install
npx expo start
```

Escanea el QR con la app **Expo Go**:
- iOS: cámara nativa
- Android: app Expo Go

## Estructura

```
app/
  _layout.tsx          → Stack raíz + carga fonts
  index.tsx            → Bootstrap: ¿hay token? → tabs : login
  (auth)/
    _layout.tsx
    login.tsx          → email + nombre opcional
    verify.tsx         → 6 inputs OTP
  (tabs)/
    _layout.tsx        → tabs: Inicio · Partidos · Ranking · Perfil
    index.tsx          → dashboard podio + siguiente partido
    partidos.tsx       → lista agrupada
    ranking.tsx        → tabla densa
    perfil.tsx         → datos + mis pronósticos + cerrar sesión
  partido/[id].tsx     → detalle + form pronóstico
  inscripcion.tsx      → métodos de pago (Banesco, Zelle, Binance...)

components/
  Button.tsx
  Logo.tsx
  MatchCard.tsx

lib/
  api.ts               → cliente fetch + JWT auto
  auth.ts              → SecureStore token+email
  theme.ts             → colors, spacing, type
  format.ts            → fechas, timeLeft, STAGE_LABEL
```

## Backend del que depende

Endpoints REST consumidos:
- `POST /api/auth/code/request`
- `POST /api/auth/code/verify`
- `GET /api/matches`
- `GET /api/matches/:id`
- `POST /api/predictions`
- `GET /api/predictions/me`
- `GET /api/ranking`
- `GET /api/me`

URL base: `https://quiniela-padelbox.vercel.app` (configurable en `app.json → extra.apiUrl`).

## Build a App Store / Play Store

Cuando llegue el momento, con [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build --platform all
```

Bundle identifiers ya configurados:
- iOS: `cloud.solint.quinielapadelbox`
- Android: `cloud.solint.quinielapadelbox`

## Licencia

Privado · © 2026 PADELBOX Sports Club.
