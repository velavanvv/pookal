<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiServiceClient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AiController extends Controller
{
    protected AiServiceClient $aiClient;

    public function __construct(AiServiceClient $aiClient)
    {
        $this->aiClient = $aiClient;
    }

    /**
     * GET /api/ai/health
     */
    public function health(): JsonResponse
    {
        $result = $this->aiClient->health();
        return response()->json($result, $result['success'] ? 200 : 503);
    }

    /**
     * POST /api/ai/invoice/parse
     * Upload an image of an invoice or receipt and get structured items
     */
    public function parseInvoice(Request $request): JsonResponse
    {
        @set_time_limit(120);

        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,webp|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $result = $this->aiClient->parseInvoice($file);

        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }


    /**
     * POST /api/ai/copilot/chat
     * Merchant Copilot with automatic shop context injection
     */
    public function copilotChat(Request $request): JsonResponse
    {
        @set_time_limit(120);

        $request->validate([
            'prompt' => 'required|string|max:2000',

            'history' => 'nullable|array',
            'model' => 'nullable|string|max:100',
            'fallbacks' => 'nullable|array',
        ]);

        $user = $request->user();
        $shopOwnerId = method_exists($user, 'shopOwnerId') ? $user->shopOwnerId() : $user->id;

        // Assemble live store intelligence from database
        $lowStockSummary = [];
        $todayRevenue = 0;
        $todayOrdersCount = 0;
        $totalProducts = 0;

        try {
            if (class_exists(\App\Models\Product::class)) {
                $products = \App\Models\Product::where('user_id', $shopOwnerId)->with('latestStock')->get();
                $totalProducts = $products->count();

                $lowStock = $products->filter(function ($p) {
                    $stock = $p->latestStock?->balance_after ?? 0;
                    return $stock <= ($p->reorder_level ?? 5);
                })->take(6);

                foreach ($lowStock as $p) {
                    $stock = $p->latestStock?->balance_after ?? 0;
                    $lowStockSummary[] = "{$p->name}: {$stock} {$p->unit} remaining (reorder threshold: {$p->reorder_level})";
                }
            }

            if (class_exists(\App\Models\Order::class)) {
                $todayRevenue = (float) \App\Models\Order::whereDate('created_at', today())->sum('total_amount');
                $todayOrdersCount = (int) \App\Models\Order::whereDate('created_at', today())->count();
            }
        } catch (\Throwable $e) {
            // Silently fallback if tenant context is unmigrated
        }

        // Assemble shop context dynamically from current tenant & live metrics
        $context = [
            'shop_name'           => $user->shop_name ?? $user->name ?? 'Universal Business Platform Store',
            'vertical'            => $user->business_type ?? 'retail',
            'user_role'           => $user->role ?? 'admin',
            'total_products'      => $totalProducts,
            'today_revenue'       => $todayRevenue,
            'today_orders_count'  => $todayOrdersCount,
            'low_stock_items'     => $lowStockSummary,
        ];

        $result = $this->aiClient->chatWithCopilot(
            $request->input('prompt'),
            $context,
            $request->input('history', []),
            $request->input('model'),
            $request->input('fallbacks')
        );

        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }

    /**
     * POST /api/ai/invoice/intake
     * Intake items parsed from AI Vision OCR into the shop's live product and stock ledger
     */
    public function intakeInvoice(Request $request): JsonResponse
    {
        $request->validate([
            'merchant_name'  => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:100',
            'items'          => 'required|array|min:1',
            'items.*.name'   => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit'   => 'nullable|string|max:20',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();
        $shopOwnerId = method_exists($user, 'shopOwnerId') ? $user->shopOwnerId() : $user->id;
        $merchant = $request->input('merchant_name', 'Vendor OCR Intake');
        $invNumber = $request->input('invoice_number', 'INV-OCR-' . date('YmdHis'));

        $created = 0;
        $updated = 0;
        $intakeResults = [];

        foreach ($request->input('items') as $item) {
            $name = trim($item['name']);
            $qty = (float) $item['quantity'];
            $unit = $item['unit'] ?? 'pcs';
            $unitPrice = (float) ($item['unit_price'] ?? 0);

            // Find existing product or create new
            $product = \App\Models\Product::where('user_id', $shopOwnerId)
                ->where('name', 'like', $name)
                ->first();

            if (!$product) {
                $sku = 'PRD-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 4)) . '-' . rand(100, 999);
                $product = \App\Models\Product::create([
                    'user_id'       => $shopOwnerId,
                    'name'          => $name,
                    'sku'           => $sku,
                    'category'      => $item['category'] ?? 'General',
                    'unit'          => $unit,
                    'price'         => $unitPrice > 0 ? round($unitPrice * 1.25, 2) : 100.0, // 25% margin default
                    'reorder_level' => 5,
                    'pricing_mode'  => 'fixed',
                ]);
                $created++;
            } else {
                $updated++;
            }

            // Record stock intake into StockLedger
            $latest = \App\Models\StockLedger::where('product_id', $product->id)->latest()->first();
            $currentBal = $latest ? $latest->balance_after : 0;
            $newBal = $currentBal + $qty;

            \App\Models\StockLedger::create([
                'product_id'    => $product->id,
                'txn_type'      => 'receive',
                'qty_change'    => $qty,
                'balance_after' => $newBal,
                'batch_code'    => 'OCR-' . date('Ymd'),
                'reference'     => $invNumber,
                'notes'         => "AI OCR Intake from {$merchant}",
            ]);

            $intakeResults[] = [
                'product_id' => $product->id,
                'name'       => $product->name,
                'received'   => $qty,
                'new_stock'  => $newBal,
            ];
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully intaked {$request->input('items', [])} items into stock ledger",
            'data'    => [
                'created_products' => $created,
                'updated_products' => $updated,
                'total_intaked'    => count($intakeResults),
                'items'            => $intakeResults,
            ]
        ]);
    }


    /**
     * GET /api/ai/models
     * Get available models from OpenRouter
     */
    public function models(Request $request): JsonResponse
    {
        $freeOnly = $request->boolean('free_only', false);
        $family = $request->query('family');
        $modality = $request->query('modality');

        $result = $this->aiClient->listModels($freeOnly, $family, $modality);
        return response()->json($result, ($result['success'] ?? false) ? 200 : 503);
    }

    /**
     * GET /api/ai/models/routes
     * Get active model routing configuration
     */
    public function routes(): JsonResponse
    {
        $result = $this->aiClient->routes();
        return response()->json($result, ($result['success'] ?? false) ? 200 : 503);
    }
}

