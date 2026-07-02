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

    public function resolvedModules(): array
    {
        $modules = $this->modules ?? [];

        if (in_array('inventory', $modules, true) && ! in_array('products', $modules, true)) {
            $modules[] = 'products';
        }

        return array_values(array_unique($modules));
    }

    public function isTrialPlan(): bool
    {
        return strcasecmp($this->name, 'Free Trial') === 0;
    }
}
