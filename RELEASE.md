# Publicación · Quiniela PADELBOX

Guía paso a paso para publicar la app en **TestFlight + App Store (iOS)** y **Google Play (Android)**.

---

## 🧰 Una sola vez · Setup EAS

### 1. Crear cuenta EAS (gratis)

```powershell
cd c:\Users\sergi\OneDrive\Documentos\Claude\Quiniela\quiniela-padelbox-app
npx eas-cli@latest login
```

Crea cuenta Expo si no tienes. Usa el email de Solintlabs.

### 2. Linkar proyecto

```powershell
npx eas-cli@latest init
```

Esto:
- Crea el proyecto en EAS Cloud
- Reescribe `app.json` con `extra.eas.projectId` real
- Configura el `updates.url`

Tras correrlo, commit:
```powershell
git add app.json
git commit -m "chore: eas init"
git push
```

---

# 🍏 iOS — TestFlight + App Store

## 3. Credenciales iOS

```powershell
npx eas-cli@latest credentials
```

Selecciona iOS → Production → Set up new credentials. EAS te guía:
- Apple ID (email de tu Apple Dev Account)
- Genera automáticamente cert + provisioning profile

## 4. Datos en `eas.json`

Edita `eas.json` y reemplaza los placeholders en `submit > production > ios`:

```json
"ios": {
  "appleId": "tu-email@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDE12345"
}
```

Para encontrar el **Team ID**: https://developer.apple.com/account → Membership.

## 5. Crear app en App Store Connect

1. https://appstoreconnect.apple.com → My Apps → "+" → New App
2. Plataforma: **iOS**
3. Nombre: **Quiniela PADELBOX**
4. Idioma principal: **Spanish (Spain)**
5. Bundle ID: `cloud.solint.quinielapadelbox`
6. SKU: `quiniela-padelbox-2026`

Apunta el **Apple App ID** (número arriba) → ése es `ascAppId` en `eas.json`.

## 6. Primer build iOS

```powershell
npx eas-cli@latest build --platform ios --profile production
```

- Tarda **15-25 minutos** en EAS Cloud
- URL en vivo para seguir el progreso
- Al terminar tienes el `.ipa`

## 7. Submit a TestFlight

```powershell
npx eas-cli@latest submit --platform ios --profile production
```

- Sube el `.ipa` a App Store Connect
- Apple procesa en **15-30 min**
- Aparece en **TestFlight → Internal Testing**

## 8. Probar en TestFlight

1. Instala **TestFlight** en tu iPhone (App Store)
2. App Store Connect → tu app → TestFlight → Internal Testing → Add testers (hasta 100)
3. Los testers reciben email con link → instalan la app
4. **Disponible inmediatamente** (sin review Apple)

External Testing (para socios fuera de tu equipo) tiene review automático de ~24h la primera vez.

## 9. Submit a App Store público

Cuando termines de testear:

1. App Store Connect → Prepare for Submission
2. Rellena: screenshots, descripción, keywords (ver [APP_STORE.md](./APP_STORE.md))
3. Submit for Review
4. Apple revisa en **1-3 días normalmente**

---

# 🤖 Android — Google Play

## 10. Crear cuenta Google Play Console

- $25 pago único
- https://play.google.com/console/signup
- Verificación de cuenta: 24-48h

## 11. Primer build Android

```powershell
npx eas-cli@latest build --platform android --profile production
```

- Tarda **15-25 minutos** en EAS Cloud
- Genera un `.aab` (Android App Bundle)

## 12. Crear app en Play Console

1. https://play.google.com/console → All apps → Create app
2. Nombre: **Quiniela PADELBOX**
3. Idioma default: Spanish (Spain)
4. App o juego: **App**
5. Free or paid: **Free**

## 13. Submit a Internal Testing (primera vez, MANUAL)

La primera vez sube el `.aab` a mano (porque eas submit Android necesita una service account JSON que aún no tienes):

1. En la sección **Testing → Internal testing** crea un track
2. Add testers (lista de emails)
3. Crea una release nueva
4. Sube el `.aab` que generó EAS (puedes descargarlo del dashboard de EAS)
5. **Save → Review → Start rollout**
6. Tus testers reciben link → instalan vía Play Store

Disponible inmediatamente, sin review Google (igual que TestFlight Internal).

## 14. Configurar `eas submit` Android (opcional, para automatizar futuras submissions)

Para que `eas submit --platform android` funcione sin subir manualmente:

1. Play Console → Setup → API access → Create new service account
2. Descarga el JSON
3. Guárdalo como `play-store-credentials.json` en la raíz del repo
4. **AÑADIRLO A `.gitignore`** (es un secret)
5. Tras eso: `npx eas-cli submit --platform android --profile production`

## 15. Submit a Production (público)

1. Play Console → Production → Create new release
2. Sube el `.aab` (o usa "Promote from internal testing")
3. Rellena descripción, screenshots (ver [APP_STORE.md](./APP_STORE.md))
4. Content rating (cuestionario IARC, 5 min)
5. Privacy Policy URL: `https://quiniela-padelbox.vercel.app/privacy`
6. **Send for review**

Primera review: **3-7 días**. Updates después: **horas**.

---

# 🔄 Updates de la app ya publicada

## OTA Updates (sin nuevo build, sin review tiendas)

Para cambios de **JS/UI/textos/lógica** que NO toquen libs nativas:

```powershell
git push                                                    # primero tu codigo
npx eas-cli@latest update --branch production --message "Fix copy en login"
```

- Cambios disponibles en **2-5 minutos** para todos los usuarios
- No pasa por review de Apple/Google
- Funciona en iOS y Android igual

## Nuevo build (cuando cambias libs nativas o version mayor)

```powershell
# iOS
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production

# Android
npx eas-cli@latest build --platform android --profile production
# subir manual a Play Console o eas submit si tienes service account
```

- Review Apple: 1-3 días
- Review Google: horas (apps ya publicadas)

---

# 📋 Checklist antes de Submit

- [ ] Iconos definitivos (1024×1024 cuadrados sin alfa para iOS)
- [ ] Screenshots según [APP_STORE.md](./APP_STORE.md)
- [ ] Privacy Policy URL pública (ya hecha en `/privacy`)
- [ ] Terms of Service URL pública (ya hecha en `/terms`)
- [ ] Apple Developer Account activa
- [ ] Google Play Console (para Android)
- [ ] EAS Build production OK (`.ipa` + `.aab`)
- [ ] Testing interno con 5+ socios en TestFlight / Internal Track
- [ ] Datos del club reales en `lib/club-info.ts` (Pago Móvil, Banesco, etc.)
- [ ] Versionado correcto en `app.json`

---

# ⏱ Tiempos realistas

| Hito | iOS | Android |
|---|---|---|
| Setup (EAS init, credenciales) | 30 min | 15 min |
| Primer build | 25 min | 25 min |
| Crear app en consola | 15 min | 15 min |
| Submit TestFlight / Internal | 15 min | 15 min |
| Procesamiento por la tienda | 30 min | 2-4 h |
| Disponible para testers | inmediato | inmediato |
| External / Open Testing review | 24-48 h | horas |
| Producción público (primera review) | 1-3 días | 3-7 días |

**Total realista desde hoy hasta App Store + Play Store público: ~10 días.**
**Total hasta TestFlight + Internal testing: ~1 día de trabajo efectivo.**
