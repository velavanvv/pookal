<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantDatabase extends PlatformModel
{
    protected $fillable = [
        'user_id',
        'branch_id',
        'scope',
        'label',
        'driver',
        'database',
        'host',
        'port',
        'username',
        'password',
        'storefront_slug',
        'website_enabled',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'website_enabled' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
