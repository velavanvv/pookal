<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogController
{
    public function index(Request $request)
    {
        $uid   = $request->user()->shopOwnerId();
        $query = Product::query()->where('user_id', $uid);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $perPage  = (int) $request->query('per_page', 50);
        $products = $query->with('latestStock')->orderBy('name')->paginate($perPage);

        $products->getCollection()->transform(function ($p) {
            $p->stock = $p->latestStock?->balance_after ?? 0;
            unset($p->latestStock);
            return $p;
        });

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'sku'             => ['required', 'string', Rule::unique('tenant.products', 'sku')],
            'category'        => ['required', 'string'],
            'price'           => ['required', 'numeric', 'min:0'],
            'unit'            => ['nullable', 'string'],
            'reorder_level'   => ['nullable', 'integer', 'min:0'],
            'track_freshness' => ['nullable', 'boolean'],
            'image_url'       => ['nullable', 'url', 'max:500'],
            'freshness_days'  => ['nullable', 'integer', 'min:1', 'max:365'],
            'initial_stock'   => ['nullable', 'integer', 'min:0'],
        ]);

        $initialStock = (int) ($data['initial_stock'] ?? 0);
        unset($data['initial_stock']);

        $product = Product::create([...$data, 'user_id' => $uid]);

        if ($initialStock > 0) {
            StockLedger::create([
                'product_id'    => $product->id,
                'txn_type'      => 'receive',
                'qty_change'    => $initialStock,
                'balance_after' => $initialStock,
                'reference'     => 'OPEN-' . now()->format('YmdHis'),
                'notes'         => 'Opening stock',
            ]);
        }

        return response()->json(['message' => 'Product created.', 'product' => $product], 201);
    }

    public function import(Request $request)
    {
        $uid = $request->user()->shopOwnerId();
        $rows = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
        ])['rows'];

        $created = 0;
        $updated = 0;

        foreach ($rows as $index => $row) {
            $payload = validator($row, [
                'name'            => ['required', 'string', 'max:255'],
                'sku'             => ['required', 'string', 'max:100'],
                'category'        => ['required', 'string', 'max:120'],
                'price'           => ['required', 'numeric', 'min:0'],
                'unit'            => ['nullable', 'string', 'max:60'],
                'reorder_level'   => ['nullable', 'integer', 'min:0'],
                'track_freshness' => ['nullable', 'boolean'],
                'image_url'       => ['nullable', 'url', 'max:500'],
                'freshness_days'  => ['nullable', 'integer', 'min:1', 'max:365'],
                'initial_stock'   => ['nullable', 'integer', 'min:0'],
            ])->validate();

            $initialStock = (int) ($payload['initial_stock'] ?? 0);
            unset($payload['initial_stock']);

            $product = Product::where('user_id', $uid)
                ->where('sku', $payload['sku'])
                ->first();

            if ($product) {
                $product->update($payload);
                $updated++;
                continue;
            }

            $product = Product::create([
                ...$payload,
                'user_id' => $uid,
            ]);
            $created++;

            if ($initialStock > 0) {
                StockLedger::create([
                    'product_id'    => $product->id,
                    'txn_type'      => 'receive',
                    'qty_change'    => $initialStock,
                    'balance_after' => $initialStock,
                    'reference'     => 'IMP-' . now()->format('YmdHis') . '-' . ($index + 1),
                    'notes'         => 'Imported opening stock',
                ]);
            }
        }

        return response()->json([
            'message' => "Import completed. {$created} created, {$updated} updated.",
            'created' => $created,
            'updated' => $updated,
        ], 201);
    }

    public function update(Request $request, Product $product)
    {
        $uid = $request->user()->shopOwnerId();
        abort_if($product->user_id !== $uid, 403, 'Forbidden.');

        $data = $request->validate([
            'name'            => ['sometimes', 'string', 'max:255'],
            'price'           => ['sometimes', 'numeric', 'min:0'],
            'unit'            => ['sometimes', 'string'],
            'category'        => ['sometimes', 'string'],
            'reorder_level'   => ['sometimes', 'integer', 'min:0'],
            'track_freshness' => ['sometimes', 'boolean'],
            'image_url'       => ['sometimes', 'nullable', 'url', 'max:500'],
            'freshness_days'  => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);

        $product->update($data);

        return response()->json(['message' => 'Product updated.', 'product' => $product]);
    }
}
