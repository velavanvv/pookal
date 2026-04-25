<?php

namespace App\Models;

class Plan extends PlatformModel
{
    protected $fillable = [
        'name', 'description', 'price_monthly', 'price_yearly',
        'modules', 'max_users', 'is_active',
    ];

    protected $casts = [
        'modules'   => 'array',
        'is_active' => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
