# Kaffeekasse – Android-APK (WebView-Wrapper)

Dünner nativer Wrapper um die PWA aus `../kaffeekasse-app`: eine einzige
Activity mit einem WebView im Vollbild (Querformat, Bildschirm bleibt an,
Zurück-Taste deaktiviert), die App-Dateien liegen gebündelt in den Assets.
Damit läuft die Kaffeekasse als echte App auf dem Tablet – **ohne
Server-App, ohne Browser, ohne Internet**.

- minSdk 24 / targetSdk 25 → für Android 7.0/7.1 (Lenovo TB-X704L) gebaut
- Daten landen im App-Speicher des WebView (localStorage-Fallback der PWA);
  JSON-Backup/-Import im Admin-Bereich funktioniert wie gewohnt
- Kein Service Worker nötig – die Dateien sind ja lokal

## Bauen

```bash
./build-apk.sh          # lädt Apktool von Maven Central, baut + signiert
# Ergebnis: dist/kaffeekasse.apk
```

Der Wrapper-Code ist bewusst als Smali (`smali/.../MainActivity.smali`)
eingecheckt, damit der Build nur Apktool braucht – kein Android SDK,
kein Gradle, kein Android Studio.

## Installieren auf dem Tablet (Android 7.1.1)

1. `dist/kaffeekasse.apk` aufs Tablet kopieren (USB, Downloads, Drive …).
2. Einstellungen → Sicherheit → **„Unbekannte Quellen"** erlauben.
3. APK in der Dateien-App antippen → Installieren.
4. App starten – läuft sofort im Vollbild.

## Updates

Neue App-Version bauen (`./build-apk.sh`) und die APK über die alte
installieren – die Buchungsdaten bleiben erhalten, solange dieselbe
Signatur verwendet wird. Deshalb liegt `kaffeekasse.keystore`
(Passwort: `kaffeekasse`) mit im Ordner: **immer mit diesem Keystore
signieren**, sonst verlangt Android erst eine Deinstallation (Datenverlust
– vorher JSON-Backup ziehen!). Der Keystore signiert nur diese interne
Kiosk-App; für Play-Store-Apps wäre ein privater Keystore Pflicht.

## Hinweis PWA vs. APK

Die PWA-Variante (Hosting + „Zum Startbildschirm hinzufügen") bleibt
weiter möglich – APK und PWA speichern ihre Daten getrennt. Für den
Umzug: im Admin-Bereich JSON exportieren und in der anderen Variante
importieren.
