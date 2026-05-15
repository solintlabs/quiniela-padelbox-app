# Textos y assets para App Store / Play Store

Todo lo que hay que pegar en App Store Connect y Google Play Console.

---

## 🍏 Apple App Store

### Subtitle (30 caracteres máx)
```
Mundial 2026 entre socios
```

### Promotional Text (170 caracteres) — editable sin re-review
```
La quiniela privada del club PADELBOX para el Mundial 2026. Predice marcadores, sube en el ranking y compite por el bote con tus compañeros.
```

### Description (4000 caracteres)
```
Quiniela PADELBOX es la quiniela privada del club PADELBOX para el Mundial de Fútbol 2026. Predice el marcador exacto de cada partido, compite contra los demás socios y opta a los premios del bote común.

CÓMO FUNCIONA
• Predice los 48 partidos de fase de grupos antes del Mundial — o ve haciéndolo partido a partido
• Cada partido cierra 15 minutos antes del kickoff: hasta ese momento puedes ajustar tu pronóstico todas las veces que quieras
• Marcador exacto: +3 puntos
• Acertar al ganador: +1 punto
• Bonus campeón del Mundial: +25 puntos extra

DURANTE EL TORNEO
• Sigue los resultados en directo de los 104 partidos del Mundial 2026
• Los puntos se calculan automáticamente al terminar cada partido
• Ve la tabla del ranking actualizada en tiempo real
• Consulta los pronósticos de los demás socios una vez se cierre cada partido (sin trampas)

PRIVADO DEL CLUB
• Solo socios del club PADELBOX
• Inscripción única con pago confirmado por el admin
• Premios entregados en el club: 1.500 USD al campeón, 500 al segundo, 300 al tercero

CARACTERÍSTICAS
• Acceso sin contraseñas, mediante código numérico al email
• Modo oscuro nativo, optimizado para iPhone
• Pronósticos editables hasta el cierre
• Imprimir o guardar tus pronósticos como PDF para compartir por WhatsApp
• Reglas, premios y métodos de pago siempre accesibles

Esta app es una iniciativa privada del club PADELBOX para uso interno de sus socios. No es una plataforma de apuestas — los premios se financian con la cuota colectiva.

Soporte: info@solint.cloud
```

### Keywords (100 caracteres total, separados por coma)
```
quiniela,mundial,2026,futbol,padelbox,pronosticos,liga,pool,ranking,fifa
```

### What's New in This Version (4000 caracteres) — para updates
```
Versión inicial de Quiniela PADELBOX para el Mundial 2026.
```

### Privacy Policy URL
```
https://quiniela-padelbox.vercel.app/privacy
```

### Support URL
```
https://quiniela-padelbox.vercel.app
```

### Marketing URL (opcional)
```
https://solint.cloud
```

### Category
Primary: **Sports**
Secondary: **Entertainment**

### Age Rating
**4+** (Sin contenido sensible)

### App Privacy / Data Collection
Selecciona:
- ✅ **Contact Info → Email** — usado para autenticar, NO vinculado al usuario para tracking
- ✅ **User Content → Other** — los pronósticos del usuario
- ❌ NADA más

Marcar todo como "Data Used to Track You: No".

---

## 📱 Google Play Store

### Short Description (80 caracteres)
```
La quiniela privada del Mundial 2026 para los socios del club PADELBOX.
```

### Full Description (4000 caracteres)
Usa el mismo texto que la descripción de Apple App Store.

### App Category
**Sports**

### Content Rating
Apto para todos los públicos (lo determina el cuestionario de IARC).

### Privacy Policy URL
```
https://quiniela-padelbox.vercel.app/privacy
```

### Contact Details
- Email: info@solint.cloud
- Website: https://solint.cloud

---

## 📸 Screenshots requeridos

### iOS (mínimo)
- **iPhone 6.7"** (1290 x 2796 px) — Apple lo exige obligatoriamente. Ej: iPhone 15 Pro Max.
- 3-6 capturas, idealmente con texto/marketing sobre cada una.

### Android (Play Store)
- **Phone**: 1080 x 1920 px o equivalente, mínimo 2 capturas, máximo 8.

### Pantallas recomendadas para capturar
1. **Dashboard** (con podio + siguiente partido + premios)
2. **Partidos** con tabs Mundial/La Liga
3. **Detalle de partido** con formulario de pronóstico
4. **Ranking** con tu fila destacada
5. **Inscripción** con métodos de pago
6. **Pronósticos de un jugador** (vista pública)

### Cómo capturarlas

Opción A — Simulador iOS (Xcode):
1. Abrir el simulador con iPhone 15 Pro Max
2. `npx eas-cli build --platform ios --profile preview` para tener app de testing
3. Capturar con Cmd+S

Opción B — Tu propio iPhone:
1. Instalar la app vía TestFlight
2. Capturas con botones nativos
3. Asegúrate de tener iPhone 6.7" (Pro Max) — si tienes uno más pequeño, captúralas igual y Apple las escalará

Opción C — Mocks (más rápido):
1. Abrir https://quiniela-padelbox.vercel.app desde Chrome
2. DevTools (F12) → "Toggle device toolbar" → "iPhone 15 Pro Max"
3. Captura cada pantalla
4. Si quieres frame del iPhone alrededor: https://mockuphone.com/ o https://www.appstorescreenshot.com/

---

## 🔢 Versionado

| Componente | Valor |
|---|---|
| `app.json` → `version` | `1.0.0` (visible al usuario) |
| `app.json` → `ios.buildNumber` | `1` (auto-incrementado por EAS) |
| `app.json` → `android.versionCode` | `1` (auto-incrementado por EAS) |

Para futuras updates:
- Cambios menores (UI, textos, fix): no cambies version, EAS aumenta el build number
- Features nuevas: bumpea version a `1.1.0`
- Cambios grandes / breaking: a `2.0.0`

---

## ⚖️ Notas legales importantes

Apple/Google son sensibles con apps de "quinielas / gambling". Para evitar rechazo:

1. **No usar la palabra "apuestas"** — usar siempre "quiniela", "pool", "predicciones".
2. **Dejar claro en la descripción** que los premios se financian con la cuota colectiva (no es betting platform).
3. **No procesar pagos dentro de la app** — el pago siempre off-platform (ya está así).
4. **Privacy Policy disponible y completa** (ya tienes `/privacy`).
5. **Edad mínima**: la app aceptará a mayores de edad (lo afirmas en T&C).

Si Apple rechaza diciendo que es "gambling", responde con esta justificación:
> "Esta aplicación es una quiniela amistosa entre los socios de un club deportivo privado.
> No procesa pagos digitales. Los participantes pagan una cuota fija única off-platform y
> los premios se reparten entre los ganadores con esa cuota colectiva (no hay casa).
> Es equivalente a un torneo entre amigos, no a una plataforma de apuestas regulada."

---

## ✅ Checklist antes de submit final

- [ ] Iconos cuadrados definitivos (1024×1024) reemplazando los placeholders
- [ ] Screenshots de 5-6 pantallas en iPhone 6.7" (y/o Android phone)
- [ ] Privacy Policy URL accesible (`https://quiniela-padelbox.vercel.app/privacy`)
- [ ] App Store Connect: app creada, descripción, keywords, categoría, age rating
- [ ] EAS Build production hecho (`eas build --platform ios --profile production`)
- [ ] Build subido (`eas submit --platform ios`)
- [ ] TestFlight Internal testing OK
- [ ] Datos reales del club rellenados en `lib/club-info.ts` (Banesco, Pago Móvil reales)
- [ ] Tests con 3-5 socios beta
- [ ] Submit for Review
