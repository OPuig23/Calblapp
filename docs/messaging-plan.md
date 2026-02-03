# Guia del Projecte: Missatgeria Instantània (Nou sistema des de 0)

## Objectiu
- Missatgeria instantània fiable.
- Web: avisos en temps real dins l’app.
- Mòbil: push natiu (Android primer, iOS després).
- Arquitectura neta, sense dependre del sistema antic.

## 1. Fase de Neteja (JA FETA)
- Eliminem el sistema antic de notificacions/push/FCM.
- Eliminem service workers i APIs de push.
- El codi antic queda desactivat.

## 2. Fase de Realtime Web (Ably)
**Objectiu**: l’admin rep l’avís en temps real dins la web.

**Passos**
1. Ably Free plan creat i clau guardada a `.env.local`.
2. Endpoint segur de token: `/api/ably/token`.
3. Client Ably a la web.
4. Al flux de “sol·licitud d’usuari”, publicar esdeveniment Ably.
5. Al mòdul “Usuaris”, subscriure el canal i mostrar badge.

## 3. Fase de Persistència
**Objectiu**: no perdre avisos si algú no està connectat.

**Passos**
1. Guardar notificacions a Firestore (nova col·lecció `notifications`).
2. Quan l’admin entra, llegeix pendents i actualitza badge.
3. Marcar com llegit quan s’obri la secció.

## 4. Fase de Mòbil (Capacitor)
**Objectiu**: push natiu, <5s gairebé sempre.

**Passos**
1. Afegir Capacitor al projecte web.
2. Generar projecte Android/iOS.
3. Configurar Firebase + FCM per Android.
4. Provar push Android amb APK debug (sense Google Play).
5. Quan estigui validat → Google Play Developer + Apple Developer.

## 5. Producció Completa
1. Ably en Standard plan (si cal).
2. Android publicat a Play Store.
3. iOS publicat a App Store.
4. Monitorització i mètriques (latència, entrega).

## Decisions Clau
- Web realtime: **Ably**.
- Push mòbil: **FCM/APNs** (via Capacitor).
- Dades: **Firestore**.

## Riscos i Notes
- PWA push no és 100% fiable.
- Push natiu requereix comptes Apple/Google.
- iOS necessita Mac o CI amb macOS.
