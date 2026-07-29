# claude.md — App móvil QuinielaBOX (Expo)

> **Lee este archivo antes de hacer cualquier cosa en este repo.** El repo web tiene su propio `CLAUDE.md` en `quiniela-padelbox/`.

---

## ⚡ Lee primero — datos y estado actual (última actualización: 2026-05-20)

### Cuentas / IDs de publicación
| Campo | Valor |
|---|---|
| Expo owner | `solintlabs` (GitHub OAuth, email sergiobal1995@gmail.com) |
| Expo slug | `quiniela-padelbox-app` |
| Expo projectId | `eeb72121-4a6d-4398-a009-c07c9dd43dd9` |
| URL proyecto Expo | https://expo.dev/accounts/solintlabs/projects/quiniela-padelbox-app |
| Apple ID (cuenta dev) | `sergiobal6@hotmail.com` |
| Apple Team ID | `5AMF3HF2MK` |
| ascAppId | `6770234104` |
| Bundle / Package | `cloud.solint.quinielapadelbox` |

### Estado iOS
- **v1.3.0 (2026-07-29): app multi-tenant** — hub "Mis quinielas" como inicio,
  crear quiniela nativa, planes con "Subir a Pro" (link externo con kill switch
  remoto `upgrade.enabled` de `/api/saas/config`), capa social por quiniela.
  ⚠️ Las v1.1-1.2 se construyeron desde otra máquina y NO están en git: la
  v1.3.0 las reemplaza por completo. Si aparece un working tree viejo del Mac,
  gana lo de GitHub.
- Cuenta de prueba para reviewer: `apple-review@solint.cloud` (OTP por email).
- Apple cerró el tren 1.0.9 (ITMS-90186/90062): **subir `version` en app.json
  en cada envío**; el buildNumber lo gestiona EAS (`appVersionSource: remote`).

### Estado Android
- Play Console: **cuenta creada y verificada** (aprobación de identidad 2026-05-18).
- Build producción: **completado 2026-05-18** (`eas build --platform android --profile production`).
- Keystore: gestionado por EAS. Backup local pendiente con `eas credentials → Android → production → Download existing keystore`.
- App en Play Console: **pendiente de crear** (siguiente paso).
- Service Account JSON para `eas submit`: **pendiente** (se genera tras crear app + vincular Google Cloud).
- ⚠️ **Closed Testing**: Google exige **12 testers ejecutando 20 días seguidos** antes de producción (regla 2024+). Empezar el conteo cuanto antes en track interno.

### Mercado y disponibilidad
- Club PADELBOX está en **Estados Unidos** (NO Madrid, ignora cualquier referencia antigua).
- Audiencia secundaria: venezolanos con Apple ID estadounidense.
- App Store countries: **USA obligatorio + Spain opcional**. Venezuela NO (usan storefront US).
- Idioma único: **español (es-ES)**. Apple permite apps solo en español en US storefront.

---

## Qué es esto

App móvil **QuinielaBOX** — cliente Expo para la quiniela PADELBOX del Mundial 2026. Se conecta al backend Next.js en `https://quiniela.solint.cloud`. Disponible en iOS (TestFlight / App Store) y Android (Google Play).

---

## Identificadores técnicos

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
  index.tsx                → bootstrap: con sesión va a /quinielas (el hub)
  quinielas.tsx            → HUB "Mis quinielas" (inicio): PADELBOX + tenants SaaS
  crear-quiniela.tsx       → alta nativa de quiniela (gratis, plan FREE)
  planes.tsx               → planes desde /api/saas/config + "Subir a Pro" (link web)
  q/[slug]/index.tsx       → quiniela SaaS: pestañas Inicio/Partidos/Ranking/Reglas
  q/[slug]/partido/[fixtureId].tsx   → social: tendencia 1X2 + pronósticos al cierre
  q/[slug]/jugador/[membershipId].tsx → perfil de jugador con stats
  (auth)/login.tsx         → pantalla de login (email + código OTP)
  (tabs)/                  → PADELBOX (sistema legacy, intacto)
    index.tsx              → dashboard (ranking, pick campeón, reglas)
    partidos.tsx           → lista de partidos con predicciones
    perfil.tsx             → perfil + link "Mis quinielas" de vuelta al hub
lib/
  api.ts                   → cliente fetch con JWT automático (exporta `request`)
  saas-api.ts              → cliente de /api/saas/* (mismo JWT); tipos espejo del backend
  auth.ts                  → getToken/setToken/setEmail/clearToken via SecureStore
  push.ts                  → registro/baja de token Expo push
components/
  MatchCard.tsx            → card de partido
  SaasAdSlot.tsx           → hueco de anuncio en quinielas FREE (fase 1: auto-promo)
assets/
  icon.png                 → icono QuinielaBOX (Q + balón). Regenerar: node scripts/gen-icons.mjs
```

**Reglas de tienda (NO romper):** el bote/inscripción de las quinielas SaaS
NUNCA se muestra dentro de la app — solo el link a la página pública
`/saas/[slug]/inscripcion`. "Subir a Pro" abre el checkout web y respeta el
kill switch remoto (`upgrade.enabled`); sin IAP. Tras añadir rutas nuevas,
regenera los typed routes arrancando expo unos segundos antes del typecheck.

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
