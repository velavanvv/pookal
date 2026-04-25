<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;

class OrderController
{
    public function index(Request $request)
    {
        $uid   = $request->user()->shopOwnerId();
        $query = Order::with('customer')
            ->where('user_id', $uid);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($branchId = $request->query('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(25);

        $orders->getCollection()->transform(function ($order) {
            return [
                'id'                 => $order->id,
                'order_number'       => $order->order_number,
                'customer_name'      => $order->customer?->name ?? $order->recipient_name,
                'channel'            => $order->channel,
                'status'             => $order->status,
                'grand_total'        => $order->grand_total,
                'branch_id'          => $order->branch_id,
                'branch_name'        => $order->branch?->name,
                'delivery_slot'      => $order->delivery_slot,
                'delivery_date'      => $order->delivery_date,
                'delivery_time_slot' => $order->delivery_time_slot,
                'recipient_name'     => $order->recipient_name,
                'recipient_phone'    => $order->recipient_phone,
                'recipient_address'  => $order->recipient_address,
                'gift_message'       => $order->gift_message,
                'created_at'         => $order->created_at,
            ];
        });

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'customer_id'        => ['nullable', 'integer', Rule::exists('tenant.customers', 'id')],
            'channel'            => ['required', 'string', 'in:store,online,whatsapp'],
            'branch_id'          => ['nullable', 'integer', Rule::exists('platform.branches', 'id')],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('tenant.products', 'id')],
            'items.*.qty'        => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        if (! empty($data['branch_id'])) {
            $branchBelongsToShop = \App\Models\Branch::where('id', $data['branch_id'])
                ->where('user_id', $uid)
                ->exists();

            abort_unless($branchBelongsToShop, 403, 'Selected branch does not belong to your shop.');
        }

        // Verify all products belong to this shop
        $productIds = collect($data['items'])->pluck('product_id');
        $owned = Product::where('user_id', $uid)->whereIn('id', $productIds)->pluck('id');
        if ($owned->count() !== $productIds->unique()->count()) {
            return response()->json(['message' => 'One or more products do not belong to your shop.'], 403);
        }

        // Stock check
        $stockErrors = [];
        foreach ($data['items'] as $item) {
            $latest  = StockLedger::where('product_id', $item['product_id'])->latest()->first();
            $balance = $latest ? $latest->balance_after : 0;
            if ($item['qty'] > $balance) {
                $product       = Product::find($item['product_id']);
                $stockErrors[] = ($product?->name ?? "Product #{$item['product_id']}")
                    . ": requested {$item['qty']}, available {$balance}";
            }
        }
        if (! empty($stockErrors)) {
            return response()->json([
                'message' => 'Insufficient stock for one or more items.',
                'errors'  => ['stock' => $stockErrors],
            ], 422);
        }

        $taxRate    = (float) ShopSetting::get('tax_rate', 5, $uid) / 100;
        $subtotal   = collect($data['items'])->sum(fn ($i) => $i['qty'] * $i['unit_price']);
        $taxTotal   = round($subtotal * $taxRate, 2);
        $grandTotal = $subtotal + $taxTotal;

        $order = Order::create([
            'user_id'        => $uid,
            'branch_id'      => $data['branch_id'] ?? null,
            'order_number'   => 'ORD-' . now()->format('YmdHis') . '-' . rand(100, 999),
            'customer_id'    => $data['customer_id'] ?? null,
            'channel'        => $data['channel'],
            'status'         => 'pending',
            'subtotal'       => $subtotal,
            'discount_total' => 0,
            'tax_total'      => $taxTotal,
            'grand_total'    => $grandTotal,
            'delivery_slot'  => null,
        ]);

        foreach ($data['items'] as $item) {
            OrderItem::create([
                'order_id'   => $order->id,
                'product_id' => $item['product_id'],
                'qty'        => $item['qty'],
                'unit_price' => $item['unit_price'],
                'line_total' => $item['qty'] * $item['unit_price'],
            ]);

            $latest  = StockLedger::where('product_id', $item['product_id'])->latest()->first();
            $balance = $latest ? $latest->balance_after : 0;

            StockLedger::create([
                'product_id'    => $item['product_id'],
                'txn_type'      => 'sale',
                'qty_change'    => -$item['qty'],
                'balance_after' => $balance - $item['qty'],
                'reference'     => $order->order_number,
                'notes'         => 'POS sale',
            ]);
        }

        return response()->json([
            'message' => 'Order created.',
            'order'   => $order->load('items'),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $uid   = $request->user()->shopOwnerId();
        $model = Order::where('id', $id)->where('user_id', $uid)->firstOrFail();
        $data  = $request->validate([
            'status' => ['required', 'string', 'in:pending,packed,dispatched,delivered'],
        ]);
        $model->update($data);

        return response()->json(['message' => "Order {$id} updated.", 'order' => $model]);
    }
}
