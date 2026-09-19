<?php

namespace App\Http\Controllers\Api;

use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(ShopSetting::allAsMap($request->user()->shopOwnerId()));
    }

    public function update(Request $request): JsonResponse
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'shop_name'       => ['sometimes', 'string', 'max:120'],
            'shop_tagline'    => ['sometimes', 'string', 'max:200'],
            'shop_phone'      => ['sometimes', 'string', 'max:20'],
            'shop_email'      => ['sometimes', 'email', 'max:120'],
            'shop_address'    => ['sometimes', 'string', 'max:300'],
            'gstin'           => ['sometimes', 'string', 'max:20'],
            'tax_rate'        => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'currency'        => ['sometimes', 'string', 'max:10'],
            'currency_symbol' => ['sometimes', 'string', 'max:5'],
            'receipt_footer'  => ['sometimes', 'string', 'max:300'],
        ]);

        foreach ($data as $key => $value) {
            ShopSetting::set($key, $value, $uid);
        }

        return response()->json([
            'message'  => 'Settings saved successfully.',
            'settings' => ShopSetting::allAsMap($uid),
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopProfile = $user->shopProfile ?? $user->parentShop?->shopProfile;

        return response()->json([
            'profile' => $shopProfile ? [
                'business_type' => $shopProfile->business_type,
                'label'         => $shopProfile->label(),
                'pos_mode'      => $shopProfile->posMode(),
                'capabilities'  => $shopProfile->capabilities ?? [],
                'settings'      => $shopProfile->settings ?? [],
                'theme'         => $shopProfile->theme ?? [],
                'preset'        => $shopProfile->preset(),
            ] : null,
            'available_types' => \App\Support\ShopTypePreset::publicList(),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->parent_user_id !== null, 403, 'Only shop owner can update shop profile.');

        $data = $request->validate([
            'business_type' => ['sometimes', 'string', 'in:retail,fresh_perishable,restaurant,service,hybrid'],
            'capabilities'  => ['sometimes', 'nullable', 'array'],
            'settings'      => ['sometimes', 'nullable', 'array'],
            'theme'         => ['sometimes', 'nullable', 'array'],
        ]);

        $profile = $user->shopProfile;
        if (! $profile) {
            $preset = \App\Support\ShopTypePreset::forRegistration($data['business_type'] ?? 'retail');
            $profile = \App\Models\ShopProfile::create([
                'user_id'       => $user->id,
                'business_type' => $data['business_type'] ?? 'retail',
                'capabilities'  => $data['capabilities'] ?? $preset['capabilities'],
                'settings'      => $data['settings'] ?? $preset['settings'],
                'theme'         => $data['theme'] ?? $preset['theme'],
            ]);
        } else {
            // If business type changed, merge with preset defaults
            if (isset($data['business_type']) && $data['business_type'] !== $profile->business_type) {
                $preset = \App\Support\ShopTypePreset::forRegistration($data['business_type']);
                $data['settings'] = array_merge($preset['settings'], $data['settings'] ?? []);
                $data['theme']    = array_merge($preset['theme'], $data['theme'] ?? []);
                $data['capabilities'] = array_unique(array_merge($preset['capabilities'], $data['capabilities'] ?? []));
            }
            $profile->update($data);
        }

        return response()->json([
            'message' => 'Shop profile updated successfully.',
            'profile' => [
                'business_type' => $profile->business_type,
                'label'         => $profile->label(),
                'pos_mode'      => $profile->posMode(),
                'capabilities'  => $profile->capabilities ?? [],
                'settings'      => $profile->settings ?? [],
                'theme'         => $profile->theme ?? [],
            ],
        ]);
    }
}
