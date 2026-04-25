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
}
