<?php

namespace App\Support\Tenancy;

use App\Models\TenantDatabase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class TenantConnectionManager
{
    public function activate(TenantDatabase $database): TenantDatabase
    {
        $config = $this->buildConfig($database);

        config(['database.connections.tenant' => $config]);
        DB::purge('tenant');
        DB::reconnect('tenant');

        TenantContext::activate($database);

        return $database;
    }

    public function activateMainForUser(User $user): ?TenantDatabase
    {
        $database = TenantDatabase::query()
            ->where('user_id', $user->shopOwnerId())
            ->whereNull('branch_id')
            ->where('scope', 'main')
            ->where('is_active', true)
            ->first();

        return $database ? $this->activate($database) : null;
    }

    public function activateBranchForUser(User $user, string $branchCode): ?TenantDatabase
    {
        $database = TenantDatabase::query()
            ->where('user_id', $user->shopOwnerId())
            ->where('scope', 'branch')
            ->where('is_active', true)
            ->whereHas('branch', fn ($query) => $query->where('code', $branchCode))
            ->first();

        return $database ? $this->activate($database) : null;
    }

    // Branch-assigned user logs in → auto-activate their branch DB (no header needed).
    public function activateForBranchUser(User $user): ?TenantDatabase
    {
        $database = TenantDatabase::query()
            ->where('user_id', $user->shopOwnerId())
            ->where('branch_id', $user->branch_id)
            ->where('scope', 'branch')
            ->where('is_active', true)
            ->first();

        return $database ? $this->activate($database) : null;
    }

    public function activateForStorefrontSlug(string $slug): ?TenantDatabase
    {
        $database = TenantDatabase::query()
            ->where('scope', 'main')
            ->where('storefront_slug', $slug)
            ->where('website_enabled', true)
            ->where('is_active', true)
            ->first();

        return $database ? $this->activate($database) : null;
    }

    public function createSqlitePath(string $relativePath): string
    {
        $path = database_path($relativePath);
        File::ensureDirectoryExists(dirname($path));

        if (! File::exists($path)) {
            File::put($path, '');
        }

        return $path;
    }

    private function buildConfig(TenantDatabase $database): array
    {
        $driver = $database->driver ?: 'sqlite';

        if ($driver === 'sqlite') {
            return [
                'driver' => 'sqlite',
                'url' => null,
                'database' => $this->normalizePath($database->database),
                'prefix' => '',
                'foreign_key_constraints' => true,
            ];
        }

        return [
            'driver' => $driver,
            'url' => null,
            'host' => $database->host,
            'port' => $database->port,
            'database' => $database->database,
            'username' => $database->username,
            'password' => $database->password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
        ];
    }

    private function normalizePath(?string $database): string
    {
        $database ??= 'tenants/default.sqlite';

        if (str_starts_with($database, '/') || preg_match('/^[A-Za-z]:[\\\\\\/]/', $database)) {
            File::ensureDirectoryExists(dirname($database));
            if (! File::exists($database)) {
                File::put($database, '');
            }

            return $database;
        }

        return $this->createSqlitePath($database);
    }
}
