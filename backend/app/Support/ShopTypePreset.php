<?php

namespace App\Support;

class ShopTypePreset
{
    public static function all(): array
    {
        return config('shop_types', []);
    }

    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function get(string $type): array
    {
        return self::all()[$type] ?? self::all()['retail'];
    }

    public static function forRegistration(string $type): array
    {
        $preset = self::get($type);

        return [
            'business_type' => $type,
            'capabilities' => $preset['extra_capabilities'] ?? [],
            'theme' => [
                'theme_preset' => $preset['theme_preset'] ?? 'classic-retail',
                'pos_mode' => $preset['pos_mode'] ?? 'retail',
            ],
            'settings' => [
                'pos_mode' => $preset['pos_mode'] ?? 'retail',
                'theme_preset' => $preset['theme_preset'] ?? 'classic-retail',
                'default_units' => $preset['default_units'] ?? ['piece'],
                'default_categories' => $preset['default_categories'] ?? ['General'],
                'default_pricing_mode' => $preset['default_pricing_mode'] ?? 'fixed',
                'track_expiry_default' => $preset['track_expiry_default'] ?? false,
                'default_shelf_life_days' => $preset['default_shelf_life_days'] ?? 3,
                'tax_rates' => $preset['tax_rates'] ?? [0, 5, 12, 18],
            ],
        ];
    }

    public static function publicList(): array
    {
        return collect(self::all())->map(function (array $preset, string $key) {
            return [
                'key' => $key,
                'label' => $preset['label'],
                'description' => $preset['description'],
                'icon' => $preset['icon'],
                'pos_mode' => $preset['pos_mode'] ?? 'retail',
                'theme_preset' => $preset['theme_preset'] ?? 'classic-retail',
                'default_units' => $preset['default_units'] ?? [],
                'default_categories' => $preset['default_categories'] ?? [],
                'extra_capabilities' => $preset['extra_capabilities'] ?? [],
            ];
        })->values()->all();
    }
}
