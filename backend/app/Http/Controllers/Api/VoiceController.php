<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\User;
use App\Support\Tenancy\TenantConnectionManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class VoiceController
{
    public function __construct(
        private readonly TenantConnectionManager $connections
    ) {}

    /**
     * Resolve default flower shop owner (admin@pookal.com or first owner)
     */
    private function resolveShopOwner(): User
    {
        $admin = User::where('email', 'admin@pookal.com')->first();
        if ($admin) {
            return $admin;
        }

        $first = User::whereNull('parent_user_id')->where('role', '!=', 'superadmin')->first();
        return $first ?: User::first();
    }

    /**
     * Ensure tenant database connection is active for product / order queries
     */
    private function ensureTenantDb(): int
    {
        $owner = $this->resolveShopOwner();
        if ($owner) {
            $this->connections->activateMainForUser($owner);
            return $owner->id;
        }
        return 1;
    }

    /**
     * Tamil to English floral synonym dictionary for high-accuracy AI tool searching
     */
    private const TAMIL_SYNONYMS = [
        'மல்லிகை'    => 'Jasmine',
        'மல்லி'       => 'Jasmine',
        'ரோஜா'       => 'Rose',
        'ரோஸ்'       => 'Rose',
        'பன்னீர் ரோஜா' => 'Red Rose',
        'சாமந்தி'     => 'Marigold',
        'செவ்வந்தி'   => 'Chrysanthemum',
        'துளசி'       => 'Tulasi',
        'தாமரை'      => 'Lotus',
        'செந்தாமரை'  => 'Lotus',
        'வெண்தாமரை'  => 'Lotus',
        'பூஜை'       => 'Pooja',
        'மாலை'       => 'Garland',
        'காம்போ'     => 'Combo',
        'உதிரி'       => 'Loose',
        'சூரியகாந்தி' => 'Sunflower',
        'அரளி'       => 'Oleander',
    ];

    /**
     * 1. LiveKit Access Token Issuer (WebRTC Audio Stream)
     */
    public function token(Request $request): JsonResponse
    {
        $roomName = $request->query('room', 'pookal-voice-' . Str::random(8));
        $identity = $request->query('identity', 'user-' . Str::random(6));
        $agentName = 'Vela (வேலா)';

        $apiKey = env('LIVEKIT_API_KEY', 'devkey');
        $apiSecret = env('LIVEKIT_API_SECRET', 'secret');
        $livekitUrl = env('LIVEKIT_URL', 'wss://livekit.pookal.local');

        // Construct standard LiveKit JWT payload
        $now = time();
        $payload = [
            'iss' => $apiKey,
            'sub' => $identity,
            'nbf' => $now,
            'exp' => $now + (60 * 60 * 2), // 2 hours
            'video' => [
                'room' => $roomName,
                'roomJoin' => true,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
            ],
            'metadata' => json_encode([
                'agent' => $agentName,
                'language' => 'ta-IN',
                'character' => 'Vela - Friendly Pookal Flower Assistant',
                'service' => 'Tamil-Voice-Agent-Vela',
            ]),
        ];

        // Base64URL encode header and payload
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $b64Header = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
        $b64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $b64Header . '.' . $b64Payload, $apiSecret, true);
        $b64Signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        $jwtToken = $b64Header . '.' . $b64Payload . '.' . $b64Signature;

        return response()->json([
            'status' => 'success',
            'token' => $jwtToken,
            'url' => $livekitUrl,
            'room' => $roomName,
            'identity' => $identity,
            'agent' => [
                'name' => 'வேலா (Vela)',
                'role' => 'Native Tamil Voice Sales Agent',
                'stt' => 'Faster-Whisper (Tamil)',
                'llm' => 'Gemini 2.0 Flash',
                'tts' => 'ElevenLabs Tamil Voice',
            ],
        ]);
    }

    /**
     * 2. AI Tool: Search Flower Catalog (Tamil & English support)
     */
    public function search(Request $request): JsonResponse
    {
        $this->ensureTenantDb();
        $q = trim((string) ($request->query('q') ?? $request->query('query') ?? ''));
        $category = $request->query('category');
        $limit = min((int) ($request->query('limit', 12)), 30);

        $query = Product::query()->with('latestStock');

        if ($category && $category !== 'All' && $category !== 'அனைத்தும்') {
            $query->where('category', 'like', "%{$category}%");
        }

        if ($q !== '') {
            // Expand Tamil synonyms
            $englishTerms = [];
            foreach (self::TAMIL_SYNONYMS as $tamil => $eng) {
                if (mb_stripos($q, $tamil) !== false) {
                    $englishTerms[] = $eng;
                }
            }

            $query->where(function ($sub) use ($q, $englishTerms) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('category', 'like', "%{$q}%");

                foreach ($englishTerms as $eng) {
                    $sub->orWhere('name', 'like', "%{$eng}%")
                        ->orWhere('category', 'like', "%{$eng}%");
                }
            });
        }

        $products = $query->orderBy('price', 'asc')->limit($limit)->get()->map(function (Product $p) {
            $tamilName = $this->getTamilName($p->name);
            $stock = $p->latestStock?->balance_after ?? 25;

            return [
                'id' => $p->id,
                'name' => $p->name,
                'tamil_name' => $tamilName,
                'display_title' => "{$p->name} ({$tamilName})",
                'sku' => $p->sku,
                'category' => $p->category,
                'price' => (float) $p->price,
                'unit' => $p->unit,
                'tamil_unit' => $this->getTamilUnit($p->unit),
                'stock' => $stock,
                'in_stock' => $stock > 0,
                'image_url' => $p->image_url,
                'freshness_days' => $p->shelf_life_days ?? $p->freshness_days ?? 3,
                'is_fresh_today' => true,
            ];
        });

        return response()->json([
            'status' => 'success',
            'query' => $q,
            'count' => $products->count(),
            'products' => $products,
            'speech_summary' => $products->isEmpty()
                ? "மன்னிக்கவும், '{$q}' என்ற பெயரில் பூக்கள் எதுவும் கிடைக்கவில்லை."
                : "நான் {$products->count()} பூக்களை கண்டுபிடித்துள்ளேன். " . $products->pluck('tamil_name')->take(3)->implode(', ') . '.',
        ]);
    }

    /**
     * 3. AI Tool: Voice Cart Management
     */
    public function cart(Request $request): JsonResponse
    {
        $this->ensureTenantDb();
        $sessionId = $request->input('session_id') ?? $request->header('X-Session-ID') ?? 'voice-session-default';
        $action = $request->input('action', 'get'); // 'get' | 'add' | 'remove' | 'clear'
        $cacheKey = "voice_cart_{$sessionId}";

        $cart = Cache::get($cacheKey, []);

        if ($action === 'clear') {
            Cache::forget($cacheKey);
            return response()->json([
                'status' => 'success',
                'message' => 'Cart cleared',
                'items' => [],
                'total' => 0,
                'speech' => 'உங்கள் கார்ட் காலியாக்கப்பட்டது.',
            ]);
        }

        if ($action === 'add') {
            $productId = $request->input('product_id');
            $productQuery = $request->input('product_name') ?? $request->input('query');
            $qty = max(1, (int) $request->input('qty', 1));

            $product = null;
            if ($productId) {
                $product = Product::find($productId);
            } elseif ($productQuery) {
                $product = Product::where('name', 'like', "%{$productQuery}%")->first();
                if (! $product) {
                    foreach (self::TAMIL_SYNONYMS as $tam => $eng) {
                        if (mb_stripos($productQuery, $tam) !== false) {
                            $product = Product::where('name', 'like', "%{$eng}%")->first();
                            if ($product) break;
                        }
                    }
                }
            }

            if (! $product) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Product not found',
                    'speech' => 'மன்னிக்கவும், அந்தப் பூ கிடைக்கவில்லை. வேறு பூவை கூறவும்.',
                ], 404);
            }

            $tamilName = $this->getTamilName($product->name);
            $tamilUnit = $this->getTamilUnit($product->unit);

            $existingKey = null;
            foreach ($cart as $k => $item) {
                if ($item['product_id'] === $product->id) {
                    $existingKey = $k;
                    break;
                }
            }

            if ($existingKey !== null) {
                $cart[$existingKey]['qty'] += $qty;
                $cart[$existingKey]['line_total'] = $cart[$existingKey]['qty'] * $cart[$existingKey]['price'];
            } else {
                $cart[] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'tamil_name' => $tamilName,
                    'price' => (float) $product->price,
                    'unit' => $product->unit,
                    'tamil_unit' => $tamilUnit,
                    'qty' => $qty,
                    'line_total' => (float) ($product->price * $qty),
                    'image_url' => $product->image_url,
                ];
            }

            Cache::put($cacheKey, $cart, 60 * 60 * 4); // 4 hours
        }

        if ($action === 'remove') {
            $productId = $request->input('product_id');
            $cart = array_values(array_filter($cart, fn ($item) => $item['product_id'] != $productId));
            Cache::put($cacheKey, $cart, 60 * 60 * 4);
        }

        $totalAmount = array_sum(array_column($cart, 'line_total'));
        $totalItems = array_sum(array_column($cart, 'qty'));

        $itemDescriptions = collect($cart)->map(function ($item) {
            return "{$item['qty']} {$item['tamil_unit']} {$item['tamil_name']}";
        })->implode(', ');

        $speech = empty($cart)
            ? 'உங்கள் கார்ட் காலியாக உள்ளது.'
            : "உங்கள் கார்ட்டில் {$itemDescriptions} உள்ளது. மொத்த தொகை ரூபாய் {$totalAmount}.";

        return response()->json([
            'status' => 'success',
            'session_id' => $sessionId,
            'items' => $cart,
            'total_items' => $totalItems,
            'total_amount' => $totalAmount,
            'currency' => 'INR',
            'currency_symbol' => '₹',
            'speech' => $speech,
        ]);
    }

    /**
     * 4. AI Tool: Voice Order Placement with Morning Slot (6:00 AM - 8:00 AM)
     */
    public function order(Request $request): JsonResponse
    {
        $ownerId = $this->ensureTenantDb();
        $sessionId = $request->input('session_id') ?? $request->header('X-Session-ID') ?? 'voice-session-default';
        $cacheKey = "voice_cart_{$sessionId}";
        $cachedCart = Cache::get($cacheKey, []);

        $items = $request->input('items', $cachedCart);

        if (empty($items)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cart is empty. Please add flowers before placing order.',
                'speech' => 'கார்ட் காலியாக உள்ளது. பூக்களை சேர்த்த பிறகு ஆர்டர் செய்யவும்.',
            ], 422);
        }

        $recipientName = $request->input('recipient_name') ?? $request->input('name') ?? 'Pookal Voice Customer';
        $recipientPhone = $request->input('recipient_phone') ?? $request->input('phone') ?? '9876543210';
        $recipientAddress = $request->input('recipient_address') ?? $request->input('address') ?? 'T. Nagar, Chennai';
        $deliveryDate = $request->input('delivery_date', Carbon::today()->addDay()->toDateString());
        $deliverySlot = $request->input('delivery_time_slot') ?? '6:00 AM – 8:00 AM (காலை பூஜை)';

        $orderNumber = 'PKL-' . strtoupper(Str::random(4)) . '-' . rand(100, 999);
        $subtotal = 0;

        foreach ($items as $item) {
            $subtotal += ($item['price'] * $item['qty']);
        }

        $taxTotal = round($subtotal * 0.05, 2);
        $grandTotal = $subtotal + $taxTotal;

        $order = Order::create([
            'user_id' => $ownerId,
            'order_number' => $orderNumber,
            'channel' => 'voice_agent_vela',
            'order_type' => 'delivery',
            'status' => 'pending',
            'subtotal' => $subtotal,
            'tax_total' => $taxTotal,
            'grand_total' => $grandTotal,
            'payment_method' => $request->input('payment_method', 'cod'),
            'delivery_date' => $deliveryDate,
            'delivery_time_slot' => $deliverySlot,
            'recipient_name' => $recipientName,
            'recipient_phone' => $recipientPhone,
            'recipient_address' => $recipientAddress,
            'notes' => 'Placed via Vela (வேலா) Native Tamil Voice Agent',
            'metadata' => [
                'source' => 'Tamil Voice Agent (Vela)',
                'language' => 'Tamil',
                'morning_slot' => true,
            ],
        ]);

        foreach ($items as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'],
                'qty' => $item['qty'],
                'unit_price' => $item['price'],
                'line_total' => $item['price'] * $item['qty'],
            ]);
        }

        // Clear session cart
        Cache::forget($cacheKey);

        $tamilConfirmation = "நன்றி {$recipientName}! உங்கள் ஆர்டர் எண் {$orderNumber} வெற்றிகரமாக பதிவாகியது. காலை {$deliverySlot} மணிக்குள் உங்கள் முகவரிக்கு வழங்கப்படும். மொத்த தொகை ரூபாய் {$grandTotal}.";

        return response()->json([
            'status' => 'success',
            'message' => 'Order placed successfully',
            'order_number' => $orderNumber,
            'order_id' => $order->id,
            'delivery_date' => $deliveryDate,
            'delivery_slot' => $deliverySlot,
            'grand_total' => $grandTotal,
            'recipient' => [
                'name' => $recipientName,
                'phone' => $recipientPhone,
                'address' => $recipientAddress,
            ],
            'speech' => $tamilConfirmation,
        ]);
    }

    /**
     * 5. Public Flower Catalog & Storefront Info
     */
    public function catalog(): JsonResponse
    {
        $ownerId = $this->ensureTenantDb();
        $settings = ShopSetting::allAsMap($ownerId);

        $products = Product::where('user_id', $ownerId)
            ->with('latestStock')
            ->orderBy('price', 'asc')
            ->get()
            ->map(function (Product $p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'tamil_name' => $this->getTamilName($p->name),
                    'sku' => $p->sku,
                    'category' => $p->category,
                    'price' => (float) $p->price,
                    'unit' => $p->unit,
                    'tamil_unit' => $this->getTamilUnit($p->unit),
                    'stock' => $p->latestStock?->balance_after ?? 30,
                    'image_url' => $p->image_url,
                    'freshness_days' => $p->shelf_life_days ?? 3,
                    'is_fresh_today' => true,
                ];
            });

        return response()->json([
            'store' => [
                'name' => $settings['shop_name'] ?? 'பூக்கள் (Pookal Flowers)',
                'tagline' => 'புதிய பூஜை பூக்கள் & மாலைகள் — காலை 6:00 AM டெலிவரி',
                'phone' => $settings['shop_phone'] ?? '9876543210',
                'delivery_slots' => [
                    '6:00 AM – 8:00 AM (காலை பூஜை)',
                    '8:00 AM – 10:00 AM',
                    '5:00 PM – 7:00 PM (மாலை பூஜை)',
                ],
            ],
            'categories' => [
                ['id' => 'All', 'name' => 'All Flowers', 'tamil_name' => 'அனைத்தும்', 'icon' => '🌸'],
                ['id' => 'Daily Pooja', 'name' => 'Daily Pooja', 'tamil_name' => 'பூஜை பூக்கள்', 'icon' => '🪔'],
                ['id' => 'Garland', 'name' => 'Garlands', 'tamil_name' => 'மாலைகள்', 'icon' => '🌺'],
                ['id' => 'Loose Flower', 'name' => 'Loose Flowers', 'tamil_name' => 'உதிரிப் பூக்கள்', 'icon' => '🌼'],
                ['id' => 'Combo', 'name' => 'Pooja Combos', 'tamil_name' => 'காம்போ பேக்', 'icon' => '✨'],
            ],
            'products' => $products,
        ]);
    }

    /**
     * Helpers for authentic Tamil translations
     */
    private function getTamilName(string $name): string
    {
        $map = [
            'Madurai Jasmine' => 'மதுரை மல்லிகை',
            'Jasmine String (1 m)' => 'மதுரை மல்லிகை பூ (முழம்)',
            'Red Rose Garland' => 'பன்னீர் ரோஜா மாலை',
            'Yellow Marigold' => 'மஞ்சள் சாமந்தி',
            'Marigold Garland' => 'சாமந்தி மாலை',
            'Tulasi Garland' => 'துளசி மாலை',
            'Lotus Flower' => 'செந்தாமரை & வெண்தாமரை',
            'Daily Pooja Combo Pack' => 'தினசரி பூஜை காம்போ பேக்',
            'Red Rose Bouquet' => 'சிவப்பு ரோஜா பூங்கொத்து',
            'White Lily Bouquet' => 'வெள்ளை லில்லி பூங்கொத்து',
            'Mixed Flower Basket' => 'கலவை மலர் கூடை',
            'Carnation Bouquet' => 'கார்னேஷன் கொத்து',
            'Tulip Bouquet' => 'டியூலிப் மலர் கொத்து',
            'Orchid Stem' => 'ஆர்க்கிட் மலர் தண்டு',
            'Sunflower Bunch' => 'சூரியகாந்தி பூங்கொத்து',
            'Chrysanthemum Bunch' => 'செவ்வந்தி மலர்கள்',
            'Rose Petals (100 g)' => 'ரோஜா இதழ்கள் (100 கிராம்)',
        ];

        foreach ($map as $eng => $tam) {
            if (stripos($name, $eng) !== false) {
                return $tam;
            }
        }

        return $name;
    }

    private function getTamilUnit(string $unit): string
    {
        $map = [
            'metre' => 'முழம் / மீட்டர்',
            'piece' => 'மாலை / எண்',
            'bunch' => 'கொத்து',
            '100g' => '100 கிராம்',
            '250g' => '250 கிராம்',
            'kg' => 'கிலோ',
            'stem' => 'தண்டு / பூ',
            'pack' => 'பேக்',
            'sheet' => 'தாள்',
            'roll' => 'ரோல்',
        ];

        return $map[strtolower($unit)] ?? $unit;
    }
}
