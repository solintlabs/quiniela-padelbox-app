# claude.md — App móvil QuinielaBOX (Expo)

> **Lee este archivo antes de hacer cualquier cosa en este repo.** El repo web tiene su propio `CLAUDE.md` en `quiniela-padelbox/`.

---

## Qué es esto

App móvil **QuinielaBOX** — cliente Expo para la quiniela PADELBOX del Mundial 2026. Se conecta al backend Next.js en `https://quiniela.solint.cloud`. Disponible en iOS (TestFlight / App Store) y Android (Google Play).

---

## Identificadores críticos

| Campo | Valor |
|---|---|
| Nombre app | QuinielaBOX |
| Bundle ID (iOS) | `cloud.solint.quinielapadelbox` |
| Package (Android) | `cloud.solint.quinielapadelbox` |
| Expo slug | `quiniela-padelbox-app` |
| Expo owner | `solintlabs` |
| Scheme deep link | `quinielapadelbox://` |
| API_URL hardcoded | `https://quiniela.solint.cloud` |

**⚠️ No cambies `API_URL` hasta que la app esté aprobada en ambas stores.**

---

## Stack

| Capa | Tech |
|---|---|
| Framework | Expo SDK 54 + expo-router v4 (typed routes) |
| Lenguaje | TypeScript |
| UI | React Native — dark mode only (`userInterfaceStyle: dark`) |
| Auth | JWT en SecureStore. OTP numérico vía `/api/auth/code/*` del backend |
| Estado | useState/useEffect — sin Redux ni Zustand por ahora |
| Build | EAS Build (eas.json) |
| Updates OTA | EAS Update |
| Push | expo-notifications + Expo Push API (registro en `/api/me/push-device`) |

---

## Comandos esenciales

```bash
npx expo start            # dev con Expo Go / dev client
npx expo start --tunnel   # si hay problemas de red local
eas build --platform ios --profile production --auto-submit   # build + submit iOS
eas build --platform android --profile production             # build Android
eas update --branch production --message "descripción"        # OTA update
```

---

## Estructura de carpetas

```
app/
  (auth)/login.tsx         → pantalla de login (email + código OTP)
  (tabs)/
    index.tsx              → dashboard (ranking, pick campeón, reglas)
    partidos.tsx           → lista de partidos con predicciones
    perfil.tsx             → perfil + hasPaid + inscripción
lib/
  api.ts                   → cliente fetch con JWT automático. Todas las llamadas al backend.
  auth.ts                  → getToken/setToken/setEmail/clearToken via SecureStore
  push.ts                  → registro/baja de token Expo push
components/
  MatchCard.tsx            → card de partido
  PredictionStepper.tsx    → input ± para marcador
assets/
  icon.png                 → icono app (fondo negro, logo verde lima)
```

---

## Autenticación

Flujo OTP numérico (no magic link — los deep links desde email a app son poco fiables):

1. Usuario teclea email → `POST /api/auth/code/request`.
2. Backend manda email con código 6 dígitos (TTL 10 min).
3. Usuario teclea código → `POST /api/auth/code/verify` con `{ email, code, name?, phone? }`.
4. Backend devuelve `{ token, user }`. App guarda en SecureStore.
5. Todas las requests llevan `Authorization: Bearer <token>`.
6. Si respuesta 401 → `clearToken()` + redirect a login.

El JWT no caduca por fecha (se invalida cuando el usuario borra la app o hace logout). En producción no hay logout explícito — el usuario está logueado para siempre hasta que desinstale.

---

## lib/api.ts — cliente HTTP

- `API_URL` se lee de `Constants.expoConfig.extra.apiUrl` con fallback a `https://quiniela.solint.cloud`.
- `UnauthenticatedError` — lanzado en 401, redirige a login automáticamente.
- Todos los endpoints del backend disponibles en el objeto `api`:
  - `api.rules()` — cuota, puntos, premios, `championPrizesText`
  - `api.matches()` — lista partidos con predicciones del user
  - `api.predict(matchId, home, away)` — crear/editar predicción
  - `api.predictBatch([...])` — predicciones en bloque (grupos)
  - `api.ranking()` — ranking + meId
  - `api.me()` — perfil del usuario
  - `api.setChampion(pick)` — elegir campeón
  - `api.sponsors()` — patrocinadores (DELISH, Solintlabs)
  - `api.paymentMethods()` — métodos de pago para inscripción
  - `api.registerPushDevice(token, platform)` — registrar push
  - `api.unregisterPushDevice(token)` — dar de baja push

---

## Convenciones

1. **TypeScript estricto.** No uses `any`.
2. **Dark mode fijo.** `userInterfaceStyle: dark`. No implementes toggle.
3. **No SVG en `<Image>`.** React Native Image no renderiza SVG. Usar PNG siempre para logos/imágenes. Logos de sponsors en `.png`.
4. **Paleta hardcoded:**
   - Fondo: `#0A0A0A`
   - Acento: `#B6FF3C`
   - Texto principal: `#FAFAFA`
   - Texto muted: `#737373`
   - Border: `#262626`
5. **Sin premios en € o $ en la app.** Apple/Google pueden rechazar apps con referencias a premios monetarios. Usa texto genérico o el `championPrizesText` del backend (que el admin activa tras aprobación).
6. **expo-file-system:** si necesitas importar, usa `expo-file-system/legacy` (la API principal fue reorganizada).
7. **Fuentes:** no cargues fuentes custom en la app móvil — usa las del sistema.

---

## EAS — perfiles

```json
// eas.json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

Para submit iOS: `--auto-submit` en `eas build`. Necesita `EXPO_APPLE_ID` y `ASC_APP_ID` en env o eas.json.

---

## Apple App Store — estado

- **En revisión en TestFlight** (enviado con `--auto-submit`).
- Cuenta de prueba para reviewer: `apple-review@solint.cloud` (contraseña: código OTP — el reviewer recibe email con código y lo teclea en la app).
- **No añadir premios en dinero** en pantallas visibles (dashboard, login) hasta aprobación. Usar `championPrizesText` del backend que arranca vacío.

---

## Google Play — requisitos pendientes

- URL de eliminación de cuenta requerida por Google Play → `https://quinielabox.com/account/delete` (implementada en el backend web).
