# Kaffeekasse

Eine schlanke, statische Progressive Web App (PWA) für eine gemeinsame
Büro-Kaffeekasse. Läuft ohne Konten, ohne Backend, ohne Cloud – alle Daten
bleiben lokal auf dem Tablet. Gedacht als dauerhaft installiertes
Selbstbedienungs-Terminal an der Kaffeeecke, auch für externe Besucher.

Ausgelegt auf das Lenovo TB-X704L (10,1", 1920×1200) im **Querformat**: alle
Bereiche passen ohne Scrollen auf einen Bildschirm, der QR-Code zum Bezahlen
sitzt oben rechts. Läuft auch auf anderen alten Android-Tablets (Android
7.1.1 „Nougat“ / Android 8 „Oreo“) mit Google Chrome; im Hochformat wird auf
eine gestapelte, scrollende Ansicht umgeschaltet.

## Funktionen

- Große Produktbuttons **Kaffee** und **Tee**, jeweils mit Preis direkt im
  Button
- Nach Antippen: Menge über +/−, Gesamtpreis, dann **„Bar bezahlt“** oder
  **„PayPal bezahlt“** (Abbrechen über ✕)
- Bereich „Heute“ mit Anzahl Kaffee/Tee, Vorgängen und Summen
  (gesamt / bar / PayPal)
- Bereich „Nachbestellen“ mit Ampel-Status (OK / Wenig / Bestellen) für
  Kaffee, Tee, Milch, Spülmaschinentabs, Spülmaschinensalz, Klarspüler,
  Reinigungstabletten und Entkalker der Kaffeemaschine – per Antippen direkt
  umschaltbar, mit Hinweis „Nachschub und Kanban im Raum Papier & Druck“
- Gestaltung im Skill-Labs-/UKT-Farbschema (ZMK Tübingen): Indigo, Gold,
  warmer Hintergrund – passend zur bestehenden Skill-Labs-Oberfläche
- Impressum (Betrieb & Verantwortung: ABX) über den Link unten rechts im
  Bereich „Heute“
- Bereich „Direkt zahlen“ mit clientseitig erzeugtem QR-Code für einen
  PayPal-Pool-Link
- Admin-Bereich (optional per PIN geschützt): Preise, Pool-Link, Bestand,
  Tagesabschluss, Monatsabschluss, CSV-Export, JSON-Backup Export/Import,
  Daten löschen
- Funktioniert nach dem ersten Laden auch offline (Service Worker)
- Speicherung in IndexedDB, automatischer Fallback auf `localStorage`, falls
  IndexedDB nicht verfügbar ist

## Dateistruktur

```text
kaffeekasse-app/
├── kaffeekasse.html      Hauptseite (einzige Ansicht der App)
├── manifest.json         PWA-Manifest (Name, Icons, Startverhalten)
├── service-worker.js     Offline-Cache für den App-Shell
├── styles.css            Kompletter Stil (kein Framework)
├── app.js                Gesamte App-Logik (Speicherung, Rendering, Events)
├── vendor/
│   ├── qrcode.js         QR-Code-Bibliothek (MIT, kazuhikoarase/qrcode-generator)
│   └── qrcode_UTF8.js    UTF-8-Erweiterung derselben Bibliothek
├── assets/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.png
└── README.md
```

## PayPal-Pool-Link anpassen

Der Link wird an **einer zentralen Stelle** in `app.js` gepflegt:

```js
const DEFAULT_POOL_URL = 'https://www.paypal.com/pools/c/DEIN_POOL_LINK';
```

Diesen Wert einfach auf den eigenen Pool-Link ändern. Der Link kann außerdem
jederzeit direkt am Tablet über **Admin-Bereich → PayPal-Pool-Link** geändert
werden, ohne den Code anzufassen – diese Einstellung wird lokal gespeichert
und hat Vorrang vor dem Standardwert in `app.js`.

Aus dem hinterlegten Link werden automatisch sowohl der QR-Code als auch der
Button „Pool öffnen“ erzeugt.

## Hosting

Die App ist rein statisch (HTML/CSS/JS) und läuft auf jedem einfachen
Webserver oder Static Hoster, zum Beispiel:

- **GitHub Pages**: Repository (oder den Ordner `kaffeekasse-app/`) als Pages
  veröffentlichen.
- **Netlify / Vercel**: Ordner `kaffeekasse-app/` als statische Seite
  deployen.
- **Lokaler Webserver im LAN**: z. B. `python3 -m http.server 8080` im Ordner
  `kaffeekasse-app/` ausführen und die Tablet-IP im WLAN aufrufen.
- **NAS / Raspberry Pi / Synology**: Ordner auf einen einfachen HTTP-Server
  (nginx, Caddy, integrierter Web-Server der NAS) legen.

Wichtig: Für die Installation als PWA und für Service Worker empfiehlt Chrome
**HTTPS** (oder `http://localhost` im lokalen Test). Bei reinem LAN-Betrieb
ohne HTTPS funktioniert die Seite meist trotzdem, aber Installation und
Offline-Cache können eingeschränkt sein – für den produktiven Einsatz daher
nach Möglichkeit HTTPS verwenden (z. B. über GitHub Pages, Netlify oder ein
Zertifikat auf der NAS).

## Installation auf dem Android-Tablet

1. Chrome auf dem Tablet öffnen und die gehostete URL der App aufrufen.
2. Prüfen, dass die Seite vollständig lädt (Buttons, QR-Code sichtbar).
3. Rechts oben im Chrome-Menü (drei Punkte) öffnen.
4. **„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“** wählen.
5. Namen bestätigen – das Icon erscheint auf dem Homescreen.
6. App über das neue Icon starten. Sie öffnet sich ohne Adressleiste, wie
   eine installierte App (Kiosk-Optik).

Da ältere Android-Versionen (z. B. 7.1.1) teilweise mit veralteten
Chrome-Versionen ausgeliefert werden: Falls die Installation oder der
Offline-Betrieb nicht sauber funktionieren, Chrome über den Play Store (falls
verfügbar) aktualisieren. Ist kein Play-Store-Zugriff mehr möglich, läuft die
App in der Regel dennoch im normalen Browser-Tab, nur ohne
„Installieren“-Komfort.

## Daten & Sicherung

Alle Buchungen, Preise, der Bestandsstatus und der Pool-Link liegen nur lokal
im Chrome-Speicher des Tablets (IndexedDB, mit `localStorage`-Fallback).
Android/Chrome kann diesen Speicher unter Umständen leeren (z. B. über
„Website-Speicher löschen“ in den Chrome-Einstellungen oder bei
Speicherknappheit). Deshalb:

- Regelmäßig im Admin-Bereich ein **JSON-Backup** exportieren
  (`kaffeekasse-backup-JJJJ-MM-TT.json`) – damit lässt sich der komplette
  Datenbestand wiederherstellen (Admin-Bereich → JSON-Backup importieren).
- Für die Abrechnung eignet sich der **CSV-Export**
  (`kaffeekasse-JJJJ-MM-TT.csv`), z. B. zum Öffnen in Excel/LibreOffice
  (Trennzeichen `;`, deutsches Zahlenformat mit Komma).
- „Tagesdaten zurücksetzen“ und „Monat abschließen“ löschen **keine**
  historischen Buchungen – sie setzen nur die Live-Anzeige in „Heute“ bzw.
  die Monatsauswertung zurück. Die komplette Historie bleibt für Export und
  Auswertung erhalten, bis „Alle lokalen Daten löschen“ explizit ausgeführt
  wird.

## Admin-Bereich

Über das Zahnrad-Symbol (⚙) oben rechts erreichbar. Ohne gesetzten PIN öffnet
er sich direkt; mit gesetztem PIN wird vorher danach gefragt. Der PIN ist ein
einfacher Zugriffsschutz für den gemeinsamen Tablet-Betrieb, keine echte
Verschlüsselung – er verhindert versehentliche oder spontane Änderungen durch
Kaffeeecken-Besucher, nicht gezielten Missbrauch.

## Lizenzhinweis

`vendor/qrcode.js` und `vendor/qrcode_UTF8.js` stammen aus dem Projekt
[`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) von
Kazuhiko Arase (MIT-Lizenz) und werden unverändert eingebunden, damit der
QR-Code vollständig offline und ohne CDN-Abhängigkeit erzeugt werden kann.
