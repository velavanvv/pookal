<?php

namespace App\Models;

class ShopProfile extends PlatformModel
{
    protected $fillable = [
        'user_id',
        'business_type',
        'capabilities',
        'settings',
        'theme',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'settings'     => 'array',
        'theme'        => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function preset(): array
    {
        $presets = config('shop_types', []);
        $type = $this->business_type;

        return $presets[$type] ?? $presets['retail'] ?? [];
    }

    public function label(): string
    {
        return $this->preset()['label'] ?? 'Shop';
    }

    public function posMode(): string
    {
        return $this->settings['pos_mode'] ?? $this->preset()['pos_mode'] ?? 'retail';
    }

    public function hasCapability(string $capability): bool
    {
        $caps = $this->capabilities ?? [];
        $presetCaps = $this->preset()['extra_capabilities'] ?? [];
        $merged = array_unique(array_merge($caps, $presetCaps));

        return in_array($capability, $merged, true);
    }
}
