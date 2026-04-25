<?php

namespace App\Models;

use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;

abstract class TenantModel extends Model
{
    public function getConnectionName(): ?string
    {
        if (TenantContext::hasActiveTenant()) {
            return 'tenant';
        }

        return app()->bound('config') ? config('database.default') : 'platform';
    }
}
