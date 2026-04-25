FROM php:8.4-apache

# System dependencies — includes pdo_pgsql for Render PostgreSQL + pdo_sqlite for tenant DBs
RUN apt-get update && apt-get install -y \
    libpq-dev libsqlite3-dev libzip-dev zip unzip git curl \
    && docker-php-ext-install pdo pdo_pgsql pdo_sqlite pdo_mysql zip opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer inside this layer so it always runs with PHP 8.4 (not the
# composer:2 image's own PHP 8.2 which breaks composer install on lock file).
RUN curl -sS https://getcomposer.org/installer \
    | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html

# Install PHP deps (cached layer)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction --ignore-platform-req=php

# Copy app source
COPY . .

# Laravel bootstrap directories
RUN php artisan package:discover --ansi || true
RUN mkdir -p \
        storage/framework/{sessions,views,cache} \
        storage/logs \
        bootstrap/cache \
        database/tenants \
    && chown -R www-data:www-data storage bootstrap/cache database/tenants \
    && chmod -R 775 storage bootstrap/cache database/tenants

# Apache: serve from /public
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

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["/usr/local/bin/docker-entrypoint.sh"]
