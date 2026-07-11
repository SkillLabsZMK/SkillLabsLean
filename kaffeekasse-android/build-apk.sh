#!/usr/bin/env bash
# Baut die Kaffeekasse-APK (WebView-Wrapper, minSdk 24 = Android 7.0+).
# Benötigt: Java 11+, Apktool-CLI (Maven Central: org.apktool:apktool-cli).
# Die App-Dateien werden bei jedem Build frisch aus ../kaffeekasse-app kopiert.
set -euo pipefail
cd "$(dirname "$0")"

APKTOOL_JAR="${APKTOOL_JAR:-apktool.jar}"
if [ ! -f "$APKTOOL_JAR" ]; then
  echo "Lade Apktool von Maven Central ..."
  curl -sSL -o "$APKTOOL_JAR" \
    "https://repo.maven.apache.org/maven2/org/apktool/apktool-cli/2.9.3/apktool-cli-2.9.3-all.jar"
fi

rm -rf assets build dist
mkdir -p assets/www dist
cp -r ../kaffeekasse-app/* assets/www/
rm -f assets/www/README.md

java -jar "$APKTOOL_JAR" b . -o dist/kaffeekasse-unsigned.apk

# v1-Signatur reicht für targetSdk 25 / Android 7; Keystore-Passwort: kaffeekasse
jarsigner -keystore kaffeekasse.keystore -storepass kaffeekasse \
  -sigalg SHA256withRSA -digestalg SHA-256 \
  -signedjar dist/kaffeekasse.apk dist/kaffeekasse-unsigned.apk kaffeekasse

echo "Fertig: dist/kaffeekasse.apk"
