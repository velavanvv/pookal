<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StorefrontController
{
    public function show(string $slug): JsonResponse
    {
        $tenant = TenantContext::current();
        abort_unless($tenant, 404, 'Storefront not found.');
        $ownerId = $tenant->user_id;

        $settings = ShopSetting::allAsMap($ownerId);
        abort_unless((bool) $tenant->website_enabled, 404, 'Storefront is disabled.');
        $products = Product::query()
            ->where('user_id', $ownerId)
            ->with('latestStock')
            ->orderBy('created_at', 'desc')
            ->limit(24)
            ->get()
            ->map(function (Product $product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'category' => $product->category,
                    'price' => $product->price,
                    'unit' => $product->unit,
                    'image_url' => $product->image_url,
                    'freshness_days' => $product->freshness_days,
                    'stock' => $product->latestStock?->balance_after ?? 0,
                ];
            });

        return response()->json([
            'owner_id' => $ownerId,
            'store' => [
                'name' => $settings['shop_name'] ?? 'Pookal Store',
                'tagline' => $settings['shop_tagline'] ?? 'Luxury blooms for meaningful celebrations.',
                'banner_title' => $settings['website_banner_title'] ?? 'Send flowers beautifully',
                'banner_subtitle' => $settings['website_banner_subtitle'] ?? 'A public storefront powered by your florist CRM.',
                'intro' => $settings['website_intro'] ?? '',
                'primary_color' => $settings['website_primary_color'] ?? '#7d294a',
                'secondary_color' => $settings['website_secondary_color'] ?? '#25543a',
                'phone' => $settings['website_contact_phone'] ?? null,
                'email' => $settings['website_contact_email'] ?? null,
                'slug' => $slug,
            ],
            'products' => $products,
            'share_url' => rtrim(env('FRONTEND_URL', 'http://127.0.0.1:5173'), '/') . '/store/' . $slug,
        ]);
    }

    public function placeOrder(Request $request, string $slug): JsonResponse
    {
        $tenant = TenantContext::current();
        abort_unless($tenant, 404, 'Storefront not found.');
        $ownerId = $tenant->user_id;

        $settings = ShopSetting::allAsMap($ownerId);
        abort_unless((bool) $tenant->website_enabled, 404, 'Storefront is disabled.');

        $data = $request->validate([
            'recipient_name'     => ['required', 'string', 'max:120'],
            'recipient_phone'    => ['required', 'string', 'max:20'],
            'recipient_address'  => ['required', 'string', 'max:400'],
            'delivery_date'      => ['required', 'date', 'after_or_equal:today'],
            'delivery_time_slot' => ['required', 'string', 'max:60'],
            'gift_message'       => ['nullable', 'string', 'max:300'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('tenant.products', 'id')],
            'items.*.qty'        => ['required', 'integer', 'min:1'],
        ]);

        // Resolve prices from DB (never trust client-submitted prices)
        $productIds = collect($data['items'])->pluck('product_id')->unique();
        $products   = Product::whereIn('id', $productIds)->where('user_id', $ownerId)->get()->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            return response()->json(['message' => 'One or more products are invalid.'], 422);
        }

        // Stock check
        $stockErrors = [];
        foreach ($data['items'] as $item) {
            $latest  = StockLedger::where('product_id', $item['product_id'])->latest()->first();
            $balance = $latest ? $latest->balance_after : 0;
            if ($item['qty'] > $balance) {
                $name = $products[$item['product_id']]->name;
                $stockErrors[] = "{$name}: requested {$item['qty']}, available {$balance}";
            }
        }
        if (!empty($stockErrors)) {
            return response()->json(['message' => 'Insufficient stock.', 'errors' => ['stock' => $stockErrors]], 422);
        }

        $taxRate  = (float) ($settings['tax_rate'] ?? 5) / 100;
        $subtotal = collect($data['items'])->sum(fn ($i) => $i['qty'] * $products[$i['product_id']]->price);
        $taxTotal = round($subtotal * $taxRate, 2);

        $order = Order::create([
            'user_id'            => $ownerId,
            'order_number'       => 'WEB-' . now()->format('YmdHis') . '-' . rand(100, 999),
            'channel'            => 'online',
            'status'             => 'pending',
            'subtotal'           => $subtotal,
            'discount_total'     => 0,
            'tax_total'          => $taxTotal,
            'grand_total'        => $subtotal + $taxTotal,
            'recipient_name'     => $data['recipient_name'],
            'recipient_phone'    => $data['recipient_phone'],
            'recipient_address'  => $data['recipient_address'],
            'delivery_date'      => $data['delivery_date'],
            'delivery_time_slot' => $data['delivery_time_slot'],
            'gift_message'       => $data['gift_message'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            $price = $products[$item['product_id']]->price;
            OrderItem::create([
                'order_id'   => $order->id,
                'product_id' => $item['product_id'],
                'qty'        => $item['qty'],
                'unit_price' => $price,
                'line_total' => $item['qty'] * $price,
            ]);

            $latest  = StockLedger::where('product_id', $item['product_id'])->latest()->first();
            $balance = $latest ? $latest->balance_after : 0;
            StockLedger::create([
                'product_id'    => $item['product_id'],
                'txn_type'      => 'sale',
                'qty_change'    => -$item['qty'],
                'balance_after' => $balance - $item['qty'],
                'reference'     => $order->order_number,
                'notes'         => 'Online storefront order',
            ]);
        }

        return response()->json([
            'message'      => 'Order placed successfully.',
            'order_number' => $order->order_number,
            'grand_total'  => $order->grand_total,
        ], 201);
    }
}
