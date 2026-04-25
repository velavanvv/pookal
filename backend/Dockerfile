FROM php:8.4-apache

# System dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev libzip-dev zip unzip git curl \
    && docker-php-ext-install pdo pdo_pgsql pdo_mysql zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP deps first (layer cache)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy app source
COPY . .

# Laravel bootstrap
RUN php artisan package:discover --ansi || true
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Apache virtual host → serve from /public
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html/public\n\
    <Directory /var/www/html/public>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-enabled/000-default.conf

EXPOSE 80

# Migrate + seed (superadmin + plans only) then start Apache
CMD php artisan migrate --force && \
    php artisan db:seed --class=DatabaseSeeder --force && \
    apache2-foreground
