# TestFlight + App Store · Quiniela PADELBOX

Pasos completos para publicar la app en TestFlight y luego App Store / Play Store.

---

## Pre-requisitos

- [x] Apple Developer Account ($99/año) — ya la tienes
- [ ] Google Play Developer Account ($25) — opcional ahora, necesaria para Android producción
- [x] App ya configurada con `bundleIdentifier: cloud.solint.quinielapadelbox`
- [ ] **Iconos definitivos** — los actuales son placeholders del logo PADELBOX en banner. Necesitamos:
  - `assets/icon.png` → **1024×1024 cuadrado, sin transparencia**, con el símbolo "pb" verde sobre fondo negro
  - `assets/adaptive-icon.png` → **1024×1024**, solo el símbolo con fondo transparente (para Android adaptive)
  - `assets/splash-icon.png` → versión del logo para la pantalla de carga

---

## Paso 1 — Crear cuenta EAS (gratis)

```powershell
cd c:\Users\sergi\OneDrive\Documentos\Claude\Quiniela\quiniela-padelbox-app
npx eas-cli@latest login
```

Si no tienes cuenta Expo, pide crearla en el mismo prompt. Usa el email de Solintlabs.

---

## Paso 2 — Linkar proyecto a EAS

```powershell
npx eas-cli@latest init
```

Esto:
- Crea el proyecto en EAS Cloud
- Reescribe `app.json` con `extra.eas.projectId` real
- Configura el `updates.url`

Tras correrlo, **commitea los cambios** que EAS hizo en `app.json`:

```powershell
git add app.json
git commit -m "chore: eas init - project linkado"
git push
```

---

## Paso 3 — Configurar credenciales iOS

```powershell
npx eas-cli@latest credentials
```

Selecciona iOS → Production → Set up new credentials. EAS te guía:
- Apple ID (email de tu Apple Dev Account)
- Genera automáticamente cert + provisioning profile

---

## Paso 4 — Datos en `eas.json`

Edita `eas.json` y reemplaza los placeholders:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "tu-email@example.com",
      "ascAppId": "se completa tras crear app en App Store Connect",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```

Para encontrar el **Team ID**:
1. https://developer.apple.com/account
2. Membership → Team ID (10 caracteres)

---

## Paso 5 — Crear app en App Store Connect

1. https://appstoreconnect.apple.com → My Apps → "+" → New App
2. Plataforma: **iOS**
3. Nombre: **Quiniela PADELBOX**
4. Idioma principal: **Spanish (Spain)**
5. Bundle ID: selecciona `cloud.solint.quinielapadelbox` (lo creas en developer.apple.com si no existe)
6. SKU: `quiniela-padelbox-2026`

Apunta el **Apple App ID** (número de 10 dígitos arriba) → ese es `ascAppId` en `eas.json`.

---

## Paso 6 — Primer build production

```powershell
npx eas-cli@latest build --platform ios --profile production
```

- Tarda **15-25 minutos** en EAS Cloud
- Te da una URL para seguir el progreso en vivo
- Al terminar, descarga el `.ipa` o subélo directo:

---

## Paso 7 — Submit a TestFlight

```powershell
npx eas-cli@latest submit --platform ios --profile production
```

- Sube el `.ipa` a App Store Connect
- Apple lo procesa en **15-30 minutos**
- Tras procesarse aparece en **TestFlight → Internal Testing**

---

## Paso 8 — Probar en TestFlight

1. Instala **TestFlight** en tu iPhone (App Store)
2. App Store Connect → tu app → TestFlight → Internal Testing → Add testers (hasta 100)
3. Los testers reciben email con link → instalan la app
4. **Disponible inmediatamente** (sin review Apple)

Para socios externos (External Testing) hay un review automático de ~24h la primera vez.

---

## Paso 9 — Submit a App Store público

Cuando termines de testear y todo esté bien:

1. App Store Connect → Prepare for Submission
2. Rellenar:
   - Screenshots (6.7" iPhone obligatorio, 5.5" recomendado)
   - Descripción corta + larga
   - Keywords
   - URL de soporte (https://solint.cloud o https://padelbox.es)
   - Privacy Policy URL (ver abajo)
   - Categoría: **Sports**
   - Edad: **4+**
3. Submit for Review
4. Apple revisa en **1-3 días normalmente**

---

## Privacy Policy

Apple **exige** una URL pública con la política de privacidad. Texto base que puedes hostear (por ejemplo en `https://quiniela-padelbox.vercel.app/privacy`):

```
Política de Privacidad - Quiniela PADELBOX

Recopilamos:
- Email y nombre (para identificarte como socio)
- Tus pronósticos (para calcular el ranking)
- Estado de pago (manual por admin)

NO recopilamos:
- Ubicación
- Contactos
- Información de pago (lo hacemos off-platform)
- Datos de redes sociales

Compartimos: nada con terceros.

Almacenamos los datos en servidores Neon (UE) mientras tu cuenta esté activa.
Puedes solicitar borrado a info@solint.cloud.

Contacto: info@solint.cloud
```

Te puedo crear una página `/privacy` en la web si me lo pides.

---

## Tiempos realistas con tu setup actual

| Hito | Tiempo |
|---|---|
| Pasos 1-5 (setup) | **1-2 horas** |
| Primer build | **25 min** |
| Submit a TestFlight | **15 min** |
| Disponible en TestFlight (internal) | **inmediato** |
| External Testing (review Apple) | **24-48h** |
| App Store público (review) | **1-3 días** |

**Desde hoy a tener la app en TestFlight: ~3 horas de trabajo.**

---

## Android / Play Store (cuando lo necesites)

```powershell
npx eas-cli@latest build --platform android --profile production
# Genera un .aab
npx eas-cli@latest submit --platform android
```

Pre-requisitos:
1. Google Play Console ($25 pago único)
2. Crear app en Play Console
3. Service account JSON para `eas submit` automático (más complejo) — o subir el .aab a mano la primera vez
