<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryController
{
    public function index(Request $request)
    {
        $uid = $request->user()->shopOwnerId();

        $items = Product::where('user_id', $uid)
            ->with('latestStock')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'barcode'         => $p->barcode,
                'name'            => $p->name,
                'category'        => $p->category,
                'unit'            => $p->unit,
                'price'           => $p->price,
                'pricing_mode'    => $p->pricing_mode ?? 'fixed',
                'stock'           => $p->latestStock?->balance_after ?? 0,
                'batch_code'      => $p->latestStock?->batch_code,
                'expiry_date'     => $p->latestStock?->expiry_date?->toDateString(),
                'reorder_level'   => $p->reorder_level,
                'track_expiry'    => $p->track_expiry ?? $p->track_freshness,
                'track_freshness' => $p->track_freshness,
                'image_url'       => $p->image_url,
                'shelf_life_days' => $p->shelf_life_days ?? $p->freshness_days,
                'freshness_days'  => $p->freshness_days,
            ]);

        return response()->json($items);
    }

    public function receive(Request $request)
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'product_id'  => ['required', 'integer', Rule::exists('tenant.products', 'id')],
            'qty'         => ['required', 'numeric', 'min:0.01'],
            'batch_code'  => ['nullable', 'string', 'max:64'],
            'expiry_date' => ['nullable', 'date'],
            'notes'       => ['nullable', 'string'],
        ]);

        abort_if(
            Product::where('id', $data['product_id'])->where('user_id', $uid)->doesntExist(),
            403, 'Product does not belong to your shop.'
        );

        $latest  = StockLedger::where('product_id', $data['product_id'])->latest()->first();
        $balance = $latest ? $latest->balance_after : 0;

        StockLedger::create([
            'product_id'    => $data['product_id'],
            'txn_type'      => 'receive',
            'qty_change'    => $data['qty'],
            'balance_after' => $balance + $data['qty'],
            'batch_code'    => $data['batch_code'] ?? null,
            'expiry_date'   => $data['expiry_date'] ?? null,
            'reason'        => 'purchase',
            'reference'     => 'GRN-' . now()->format('YmdHis'),
            'notes'         => $data['notes'] ?? 'Goods receipt',
        ]);

        return response()->json(['message' => 'Goods receipt recorded.']);
    }

    public function adjust(Request $request)
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('tenant.products', 'id')],
            'qty_change' => ['required', 'numeric'],
            'reason'     => ['nullable', 'string', 'in:spoilage,wastage,damaged,recount,return,other'],
            'notes'      => ['nullable', 'string'],
        ]);

        abort_if(
            Product::where('id', $data['product_id'])->where('user_id', $uid)->doesntExist(),
            403, 'Product does not belong to your shop.'
        );

        $latest  = StockLedger::where('product_id', $data['product_id'])->latest()->first();
        $balance = $latest ? $latest->balance_after : 0;
        $reason  = $data['reason'] ?? 'adjustment';

        StockLedger::create([
            'product_id'    => $data['product_id'],
            'txn_type'      => 'adjustment',
            'qty_change'    => $data['qty_change'],
            'balance_after' => $balance + $data['qty_change'],
            'reason'        => $reason,
            'reference'     => 'ADJ-' . now()->format('YmdHis'),
            'notes'         => $data['notes'] ?? ucfirst($reason) . ' adjustment',
        ]);

        return response()->json(['message' => 'Stock adjustment saved.']);
    }
}

