<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$checks = [
    'platform_model_exists' => class_exists(\App\Models\PlatformModel::class),
    'tenant_model_exists' => class_exists(\App\Models\TenantModel::class),
    'tenant_database_model_exists' => class_exists(\App\Models\TenantDatabase::class),
    'user_uses_platform_connection' => (new \App\Models\User())->getConnectionName() === 'platform',
    'plan_uses_platform_connection' => (new \App\Models\Plan())->getConnectionName() === 'platform',
    'product_uses_platform_fallback_without_context' => (new \App\Models\Product())->getConnectionName() === config('database.default'),
];

$failed = array_keys(array_filter($checks, fn ($passed) => ! $passed));

if ($failed !== []) {
    fwrite(STDERR, "Smoke test failed:\n - " . implode("\n - ", $failed) . "\n");
    exit(1);
}

fwrite(STDOUT, "Pookal backend smoke checks passed.\n");
