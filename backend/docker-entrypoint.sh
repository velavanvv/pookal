#!/bin/sh

echo "→ Running platform migrations..."
php artisan migrate --force
MIGRATE_STATUS=$?
if [ $MIGRATE_STATUS -ne 0 ]; then
  echo "⚠ Migrations failed (exit $MIGRATE_STATUS) — check PLATFORM_DATABASE_URL in Render dashboard"
fi

if [ $MIGRATE_STATUS -eq 0 ]; then
  echo "→ Seeding initial data..."
  php artisan db:seed --class=DatabaseSeeder --force || echo "⚠ Seeding failed (non-fatal)"
fi

# Entrypoint runs as root; fix ownership so Apache (www-data) can read/write
# storage, bootstrap cache, and SQLite tenant DB files created during seeding.
chown -R www-data:www-data storage bootstrap/cache database/tenants 2>/dev/null || true
chmod -R 775 storage bootstrap/cache database/tenants 2>/dev/null || true

echo "→ Caching config and routes..."
php artisan config:cache  || true
php artisan route:cache   || true
php artisan view:cache    || true

echo "→ Starting Apache..."
exec apache2-foreground
