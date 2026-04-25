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

echo "→ Clearing caches..."
php artisan config:clear || true
php artisan route:clear  || true

echo "→ Starting Apache..."
exec apache2-foreground
