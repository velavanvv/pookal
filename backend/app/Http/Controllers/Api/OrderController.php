<?php

namespace App\Http\Controllers\Api;

use App\Models\KitchenTicket;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;

class OrderController
{
    public function latestAlert(Request $request)
    {
        $uid = $request->user()->shopOwnerId();
        $afterId = (int) $request->query('after_id', 0);

        $query = Order::with(['items.product'])
            ->where('user_id', $uid)
            ->where('channel', 'online');

        if ($afterId > 0) {
            $query->where('id', '>', $afterId);
        }

        $latestOrder = $query->latest('id')->first();

        if (! $latestOrder) {
            return response()->json(['has_new' => false]);
        }

        return response()->json([
            'has_new' => true,
            'order' => [
                'id'                 => $latestOrder->id,
                'order_number'       => $latestOrder->order_number,
                'recipient_name'     => $latestOrder->recipient_name ?? 'Online Customer',
                'recipient_phone'    => $latestOrder->recipient_phone,
                'recipient_address'  => $latestOrder->recipient_address,
                'delivery_time_slot' => $latestOrder->delivery_time_slot,
                'grand_total'        => $latestOrder->grand_total,
                'item_count'         => $latestOrder->items->count(),
                'created_at'         => $latestOrder->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $uid   = $request->user()->shopOwnerId();
        $query = Order::with(['customer', 'table', 'items.product'])
            ->where('user_id', $uid);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($orderType = $request->query('order_type')) {
            $query->where('order_type', $orderType);
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
                'customer_phone'     => $order->customer?->phone ?? $order->recipient_phone,
                'channel'            => $order->channel,
                'order_type'         => $order->order_type,
                'table_id'           => $order->table_id,
                'table_name'         => $order->table?->name,
                'status'             => $order->status,
                'subtotal'           => $order->subtotal,
                'discount_total'     => $order->discount_total,
                'tax_total'          => $order->tax_total,
                'grand_total'        => $order->grand_total,
                'payment_method'     => $order->payment_method,
                'payments'           => $order->payments,
                'branch_id'          => $order->branch_id,
                'branch_name'        => $order->branch?->name,
                'delivery_slot'      => $order->delivery_slot,
                'delivery_date'      => $order->delivery_date,
                'delivery_time_slot' => $order->delivery_time_slot,
                'recipient_name'     => $order->recipient_name,
                'recipient_phone'    => $order->recipient_phone,
                'recipient_address'  => $order->recipient_address,
                'delivery_area'      => $order->delivery_area,
                'gift_message'       => $order->gift_message ?? ($order->metadata['gift_message'] ?? null),
                'metadata'           => $order->metadata,
                'items'              => $order->items,
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
            'channel'            => ['required', 'string', 'in:store,online,whatsapp,phone'],
            'order_type'         => ['nullable', 'string', 'in:in_store,dine_in,takeaway,delivery'],
            'table_id'           => ['nullable', 'integer'],
            'branch_id'          => ['nullable', 'integer', Rule::exists('platform.branches', 'id')],
            'payment_method'     => ['nullable', 'string', 'in:cash,card,upi,split,unpaid'],
            'payments'           => ['nullable', 'array'],
            'discount_total'     => ['nullable', 'numeric', 'min:0'],
            'metadata'           => ['nullable', 'array'],
            'create_kot'         => ['nullable', 'boolean'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('tenant.products', 'id')],
            'items.*.qty'        => ['required', 'numeric', 'min:0.01'],
            'items.*.weight'     => ['nullable', 'numeric', 'min:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.modifiers'  => ['nullable', 'array'],
            'items.*.notes'      => ['nullable', 'string'],
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

        $taxRate       = (float) ShopSetting::get('tax_rate', 5, $uid) / 100;
        $subtotal      = collect($data['items'])->sum(fn ($i) => $i['qty'] * $i['unit_price']);
        $discountTotal = (float) ($data['discount_total'] ?? 0);
        $taxableBase   = max(0, $subtotal - $discountTotal);
        $taxTotal      = round($taxableBase * $taxRate, 2);
        $grandTotal    = round($taxableBase + $taxTotal, 2);

        $orderType     = $data['order_type'] ?? 'in_store';
        $paymentMethod = $data['payment_method'] ?? 'cash';

        $order = Order::create([
            'user_id'        => $uid,
            'branch_id'      => $data['branch_id'] ?? null,
            'order_number'   => 'ORD-' . now()->format('YmdHis') . '-' . rand(100, 999),
            'customer_id'    => $data['customer_id'] ?? null,
            'table_id'       => $data['table_id'] ?? null,
            'channel'        => $data['channel'],
            'order_type'     => $orderType,
            'status'         => ($orderType === 'dine_in' && $paymentMethod === 'unpaid') ? 'pending' : 'completed',
            'subtotal'       => $subtotal,
            'discount_total' => $discountTotal,
            'tax_total'      => $taxTotal,
            'grand_total'    => $grandTotal,
            'payment_method' => $paymentMethod,
            'payments'       => $data['payments'] ?? null,
            'metadata'       => $data['metadata'] ?? null,
            'gift_message'   => $data['metadata']['gift_message'] ?? null,
            'delivery_slot'  => $data['metadata']['delivery_slot'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            OrderItem::create([
                'order_id'   => $order->id,
                'product_id' => $item['product_id'],
                'table_id'   => $data['table_id'] ?? null,
                'qty'        => $item['qty'],
                'weight'     => $item['weight'] ?? null,
                'unit_price' => $item['unit_price'],
                'line_total' => $item['qty'] * $item['unit_price'],
                'modifiers'  => $item['modifiers'] ?? null,
            ]);

            $latest  = StockLedger::where('product_id', $item['product_id'])->latest()->first();
            $balance = $latest ? $latest->balance_after : 0;

            StockLedger::create([
                'product_id'    => $item['product_id'],
                'txn_type'      => 'sale',
                'qty_change'    => -$item['qty'],
                'balance_after' => $balance - $item['qty'],
                'reason'        => 'sale',
                'reference'     => $order->order_number,
                'notes'         => "Order sale ({$orderType})",
            ]);
        }

        // Restaurant integration: auto generate KOT ticket if dine-in or requested
        if (! empty($data['create_kot']) || $orderType === 'dine_in') {
            $kotItems = [];
            foreach ($data['items'] as $item) {
                $p = Product::find($item['product_id']);
                $kotItems[] = [
                    'name'      => $p?->name ?? "Item #{$item['product_id']}",
                    'qty'       => $item['qty'],
                    'modifiers' => $item['modifiers'] ?? [],
                    'notes'     => $item['notes'] ?? null,
                ];
            }

            KitchenTicket::create([
                'user_id'       => $uid,
                'order_id'      => $order->id,
                'table_id'      => $data['table_id'] ?? null,
                'ticket_number' => 'KOT-' . strtoupper(substr(uniqid(), -5)),
                'status'        => 'pending',
                'station'       => 'kitchen',
                'items'         => $kotItems,
                'printed_at'    => now(),
            ]);

            if (! empty($data['table_id'])) {
                RestaurantTable::where('id', $data['table_id'])->update(['status' => 'occupied']);
            }
        }

        return response()->json([
            'message' => 'Order created successfully.',
            'order'   => $order->load(['items.product', 'table', 'customer']),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $uid   = $request->user()->shopOwnerId();
        $model = Order::where('id', $id)->where('user_id', $uid)->firstOrFail();
        $data  = $request->validate([
            'status'         => ['sometimes', 'required', 'string', 'in:pending,preparing,ready,packed,dispatched,delivered,completed,cancelled'],
            'payment_method' => ['sometimes', 'nullable', 'string'],
            'payments'       => ['sometimes', 'nullable', 'array'],
        ]);
        $model->update($data);

        // If order completed or cancelled and has a table, mark table vacant
        if (in_array($model->status, ['completed', 'cancelled'], true) && $model->table_id) {
            RestaurantTable::where('id', $model->table_id)->update(['status' => 'vacant']);
        }

        return response()->json(['message' => "Order {$id} updated.", 'order' => $model]);
    }
}

