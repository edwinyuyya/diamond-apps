#!/usr/bin/env bash
# Merakit paket website untuk hosting PHP/cPanel (IDwebhost) ke folder website/dist-host.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist-host
rm -rf "$OUT" && mkdir -p "$OUT/api" "$OUT/data" "$OUT/m"
cp -r index.html admin media favicon.svg favicon-48.png apple-touch-icon.png og-image.jpg robots.txt sitemap.xml "$OUT/"
cp server/lib.php server/ig.php server/crm.php server/form.php server/cron.php "$OUT/api/"
(cd server && composer install --no-dev --optimize-autoloader --no-interaction --quiet)
cp -r server/vendor "$OUT/api/vendor"
# Buang file tes/contoh dari library supaya upload FTP ringan
find "$OUT/api/vendor" -mindepth 3 -maxdepth 3 -type d \( -name tests -o -name fixtures -o -name examples -o -name docs -o -name scripts \) -prune -exec rm -rf {} +
find "$OUT/api/vendor" \( -name .git -o -name .github \) -prune -exec rm -rf {} +
cp server/htaccess/root.htaccess "$OUT/.htaccess"
cp server/htaccess/api.htaccess "$OUT/api/.htaccess"
cp server/htaccess/deny.htaccess "$OUT/data/.htaccess"
cp server/htaccess/admin.htaccess "$OUT/admin/.htaccess"
touch "$OUT/m/.keep"
echo "Paket siap di website/$OUT"
