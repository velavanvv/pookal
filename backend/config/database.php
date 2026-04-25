<?php

return [
    'default' => env('DB_CONNECTION', 'platform'),

    'connections' => [
        'platform' => [
            'driver' => env('PLATFORM_DB_DRIVER', env('DB_DRIVER', 'sqlite')),
            'url' => env('PLATFORM_DATABASE_URL', env('DATABASE_URL')),
            'host' => env('PLATFORM_DB_HOST', env('DB_HOST', '127.0.0.1')),
            'port' => env('PLATFORM_DB_PORT', env('DB_PORT', '5432')),
            'database' => env('PLATFORM_DB_DATABASE', env('DB_DATABASE', database_path('database.sqlite'))),
            'username' => env('PLATFORM_DB_USERNAME', env('DB_USERNAME', 'root')),
            'password' => env('PLATFORM_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'strict' => true,
            'foreign_key_constraints' => true,
            'schema' => 'public',
            'sslmode' => env('PLATFORM_DB_SSLMODE', env('DB_SSLMODE', 'prefer')),
        ],

        'tenant' => [
            'driver' => env('TENANT_DB_DRIVER', 'sqlite'),
            'url' => env('TENANT_DATABASE_URL'),
            'host' => env('TENANT_DB_HOST', '127.0.0.1'),
            'port' => env('TENANT_DB_PORT', '3306'),
            'database' => env('TENANT_DB_DATABASE', database_path('tenants/default.sqlite')),
            'username' => env('TENANT_DB_USERNAME', 'root'),
            'password' => env('TENANT_DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'foreign_key_constraints' => true,
        ],

        'sqlite' => [
            'driver'   => 'sqlite',
            'url'      => env('DATABASE_URL'),
            'database' => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix'   => '',
            'foreign_key_constraints' => true,
        ],

        'pgsql' => [
            'driver'   => 'pgsql',
            'url'      => env('DATABASE_URL'),
            'host'     => env('DB_HOST', '127.0.0.1'),
            'port'     => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'pookal'),
            'username' => env('DB_USERNAME', 'postgres'),
            'password' => env('DB_PASSWORD', ''),
            'charset'  => 'utf8',
            'prefix'   => '',
            'schema'   => 'public',
            'sslmode'  => env('DB_SSLMODE', 'prefer'),
        ],

        'mysql' => [
            'driver'    => 'mysql',
            'url'       => env('DATABASE_URL'),
            'host'      => env('DB_HOST', '127.0.0.1'),
            'port'      => env('DB_PORT', '3306'),
            'database'  => env('DB_DATABASE', 'pookal'),
            'username'  => env('DB_USERNAME', 'root'),
            'password'  => env('DB_PASSWORD', ''),
            'charset'   => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix'    => '',
            'strict'    => true,
        ],
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],
];
