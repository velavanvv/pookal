<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeliveryController
{
    public function board(Request $request)
    {
        $uid    = $request->user()->shopOwnerId();
        $orders = Order::with('customer')
            ->where('user_id', $uid)
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->orderBy('delivery_slot')
            ->get()
            ->map(fn ($o) => [
                'order_id'      => $o->id,
                'order_number'  => $o->order_number,
                'customer_name' => $o->customer?->name,
                'slot'          => $o->delivery_slot,
                'status'        => $o->status,
                'branch_name'   => $o->branch?->name,
            ]);

        return response()->json($orders);
    }

    public function dispatch(Request $request)
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'order_id' => ['required', 'integer', Rule::exists('tenant.orders', 'id')],
            'status'   => ['required', 'string', 'in:dispatched,delivered'],
        ]);

        $order = Order::where('id', $data['order_id'])->where('user_id', $uid)->firstOrFail();
        $order->update(['status' => $data['status']]);

        return response()->json(['message' => 'Dispatch updated.', 'order' => $order]);
    }
}
