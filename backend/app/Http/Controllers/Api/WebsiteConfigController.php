<?php

namespace App\Http\Controllers\Api;

use App\Models\ShopSetting;
use App\Models\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebsiteConfigController
{
    private function buildConfig(Request $request): array
    {
        $user = $request->user();
        $mainDatabase = $user->mainDatabase ?? $user->load('mainDatabase')->mainDatabase;
        $shopName = $user->shop_name ?: $user->name;
        $defaultSlug = Str::slug($shopName ?: 'pookal-store');
        $defaults = [
            'website_enabled' => false,
            'website_slug' => $mainDatabase?->storefront_slug ?: $defaultSlug,
            'website_theme' => 'rose-luxury',
            'website_banner_title' => "Send flowers from {$shopName}",
            'website_banner_subtitle' => 'Handcrafted bouquets, live inventory, and elegant gifting in one shareable storefront.',
            'website_intro' => 'Enable your website from Pookal and share the URL or QR code directly with your customers.',
            'website_primary_color' => '#7d294a',
            'website_secondary_color' => '#25543a',
            'website_setup_fee' => '2500',
            'website_subscription_amount' => '999',
            'website_contact_phone' => $user->phone ?: '',
            'website_contact_email' => $user->email,
        ];

        $config = array_merge($defaults, ShopSetting::allAsMap($user->shopOwnerId()));
        $config['website_enabled'] = (bool) ($mainDatabase?->website_enabled ?? filter_var($config['website_enabled'], FILTER_VALIDATE_BOOLEAN));
        $config['website_share_url'] = rtrim(env('FRONTEND_URL', 'http://127.0.0.1:5173'), '/') . '/store/' . ($config['website_slug'] ?: $defaultSlug);

        return $config;
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->buildConfig($request));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'website_enabled' => ['sometimes', 'boolean'],
            'website_slug' => ['sometimes', 'string', 'max:120', 'regex:/^[a-z0-9-]+$/'],
            'website_theme' => ['sometimes', 'string', 'max:60'],
            'website_banner_title' => ['sometimes', 'string', 'max:180'],
            'website_banner_subtitle' => ['sometimes', 'string', 'max:260'],
            'website_intro' => ['sometimes', 'string', 'max:400'],
            'website_primary_color' => ['sometimes', 'string', 'max:20'],
            'website_secondary_color' => ['sometimes', 'string', 'max:20'],
            'website_setup_fee' => ['sometimes', 'numeric', 'min:0'],
            'website_subscription_amount' => ['sometimes', 'numeric', 'min:0'],
            'website_contact_phone' => ['sometimes', 'string', 'max:20'],
            'website_contact_email' => ['sometimes', 'email', 'max:120'],
        ]);

        if (isset($data['website_slug'])) {
            $slugTaken = TenantDatabase::query()
                ->where('storefront_slug', $data['website_slug'])
                ->where('user_id', '!=', $request->user()->id)
                ->exists();

            if ($slugTaken) {
                return response()->json([
                    'message' => 'That storefront slug is already in use.',
                    'errors' => ['website_slug' => ['That storefront slug is already in use.']],
                ], 422);
            }
        }

        $uid = $request->user()->shopOwnerId();
        foreach ($data as $key => $value) {
            ShopSetting::set($key, is_bool($value) ? ($value ? '1' : '0') : $value, $uid);
        }

        $request->user()->mainDatabase?->update([
            'storefront_slug' => $data['website_slug'] ?? $request->user()->mainDatabase->storefront_slug,
            'website_enabled' => $data['website_enabled'] ?? $request->user()->mainDatabase->website_enabled,
        ]);

        return response()->json([
            'message' => 'Website configuration saved.',
            'config' => $this->buildConfig($request),
        ]);
    }
}
