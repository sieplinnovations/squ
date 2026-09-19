# Builds a Drupal 11 app image on PHP 8.3 + Apache, with the PostgreSQL
# PDO driver enabled and this project's custom module/theme copied in.
#
# NOTE: `docker compose build` needs internet access on your machine to
# let Composer download Drupal core + contrib from packages.drupal.org.

FROM php:8.3-apache-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpq-dev \
        libzip-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_pgsql pgsql gd zip intl opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /opt/drupal

# Install Drupal core + contrib (cached layer unless composer.json changes).
COPY composer.json ./
RUN composer install --no-interaction --no-progress --optimize-autoloader

# Copy in the custom module, theme, and the pre-written settings.php for
# this project - no build-time file concatenation, so nothing to get
# subtly corrupted between Dockerfile revisions.
COPY web/modules/custom/ web/modules/custom/
COPY web/themes/custom/ web/themes/custom/
COPY web/sites/default/settings.php web/sites/default/settings.php

RUN mkdir -p web/sites/default/files config/sync \
    && chown -R www-data:www-data web/sites/default/files web/sites/default/settings.php config \
    && chmod 664 web/sites/default/settings.php

ENV APACHE_DOCUMENT_ROOT=/opt/drupal/web
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

EXPOSE 80
