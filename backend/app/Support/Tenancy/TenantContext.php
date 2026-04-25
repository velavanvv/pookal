<?php

namespace App\Support\Tenancy;

use App\Models\TenantDatabase;

class TenantContext
{
    private static ?TenantDatabase $database = null;

    public static function activate(TenantDatabase $database): void
    {
        self::$database = $database;
    }

    public static function current(): ?TenantDatabase
    {
        return self::$database;
    }

    public static function hasActiveTenant(): bool
    {
        return self::$database !== null;
    }

    public static function clear(): void
    {
        self::$database = null;
    }
}
