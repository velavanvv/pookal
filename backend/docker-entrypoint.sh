#!/bin/sh
set -e

echo "→ Running platform migrations..."
php artisan migrate --force

echo "→ Seeding initial data..."
php artisan db:seed --class=DatabaseSeeder --force

echo "→ Clearing caches..."
php artisan config:clear
php artisan route:clear

echo "→ Starting Apache..."
exec apache2-foreground
