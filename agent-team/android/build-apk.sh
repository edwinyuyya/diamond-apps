#!/bin/bash
# Bangun APK debug Rekam Medisku. Pakai:  bash build-apk.sh [folder-proyek]
# Prasyarat: JDK 17+, Android SDK (ANDROID_HOME) dengan platforms;android-34 dan build-tools;34.0.0.
# Hasil: dist/rekam-medisku-debug.apk  (ditandatangani kunci debug: untuk dipasang manual, BUKAN Play Store)
set -euo pipefail
cd "$(dirname "$0")"
PROYEK="${1:-../projects/rekam-medis}"
export ANDROID_HOME="${ANDROID_HOME:-/root/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "==> 1/5 Menyusun www/ dari $PROYEK (app/ -> /, public/vendor -> /vendor)"
rm -rf www && mkdir -p www
cp -r "$PROYEK/app/." www/
[ -d "$PROYEK/public/vendor" ] && cp -r "$PROYEK/public/vendor" www/vendor || echo "   (peringatan: public/vendor tidak ada; OCR/suara offline tidak akan tersedia)"
# Pastikan tidak ada rujukan ke luar (aplikasi harus murni lokal)
if grep -rEl "https?://[a-z0-9.-]+\.[a-z]{2,}" www --include=*.html --include=*.js --include=*.css --include=*.webmanifest 2>/dev/null | grep -v "/vendor/" | head -3 | grep -q .; then
  echo "   catatan: ada URL http(s) di kode aplikasi (di luar vendor); periksa bila tidak disengaja"
fi

echo "==> 2/5 Memasang dependensi Capacitor"
[ -d node_modules ] || npm install --no-audit --no-fund

echo "==> 3/5 Menyiapkan proyek Android"
[ -d android ] || npx cap add android
npx cap sync android

echo "==> 4/5 Izin kamera dan mikrofon"
MANIFEST=android/app/src/main/AndroidManifest.xml
for p in CAMERA RECORD_AUDIO MODIFY_AUDIO_SETTINGS; do
  grep -q "android.permission.$p" "$MANIFEST" || sed -i "s#</manifest>#    <uses-permission android:name=\"android.permission.$p\" />\n</manifest>#" "$MANIFEST"
done
grep -q "android.hardware.camera" "$MANIFEST" || sed -i "s#</manifest>#    <uses-feature android:name=\"android.hardware.camera\" android:required=\"false\" />\n    <uses-feature android:name=\"android.hardware.microphone\" android:required=\"false\" />\n</manifest>#" "$MANIFEST"

echo "==> 5/5 Membangun APK debug (Gradle)"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
( cd android && ./gradlew --no-daemon assembleDebug )
mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk dist/rekam-medisku-debug.apk
ls -la dist/rekam-medisku-debug.apk
echo "SELESAI"
