<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\StockLedger;
use Illuminate\Http\Request;

class InventoryController
{
    public function index()
    {
        $items = Product::with('latestStock')->get()->map(function ($p) {
            return [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'name'            => $p->name,
                'category'        => $p->category,
                'unit'            => $p->unit,
                'price'           => $p->price,
                'stock'           => $p->latestStock?->balance_after ?? 0,
                'reorder_level'   => $p->reorder_level,
                'track_freshness' => $p->track_freshness,
                'image_url'       => $p->image_url,
                'freshness_days'  => $p->freshness_days,
            ];
        });

        return response()->json($items);
    }

    public function receive(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'qty'        => ['required', 'integer', 'min:1'],
            'notes'      => ['nullable', 'string'],
        ]);

        $latest  = StockLedger::where('product_id', $data['product_id'])->latest()->first();
        $balance = $latest ? $latest->balance_after : 0;

        StockLedger::create([
            'product_id'    => $data['product_id'],
            'txn_type'      => 'receive',
            'qty_change'    => $data['qty'],
            'balance_after' => $balance + $data['qty'],
            'reference'     => 'GRN-' . now()->format('YmdHis'),
            'notes'         => $data['notes'] ?? 'Goods receipt',
        ]);

        return response()->json(['message' => 'Goods receipt recorded.']);
    }

    public function adjust(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'qty_change' => ['required', 'integer'],
            'reason'     => ['nullable', 'string'],
        ]);

        $latest  = StockLedger::where('product_id', $data['product_id'])->latest()->first();
        $balance = $latest ? $latest->balance_after : 0;

        StockLedger::create([
            'product_id'    => $data['product_id'],
            'txn_type'      => 'adjustment',
            'qty_change'    => $data['qty_change'],
            'balance_after' => $balance + $data['qty_change'],
            'reference'     => 'ADJ-' . now()->format('YmdHis'),
            'notes'         => $data['reason'] ?? 'Manual adjustment',
        ]);

        return response()->json(['message' => 'Stock adjustment saved.']);
    }
}
