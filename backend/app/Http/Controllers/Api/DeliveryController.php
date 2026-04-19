<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use Illuminate\Http\Request;

class DeliveryController
{
    public function board()
    {
        $orders = Order::with('customer')
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->orderBy('delivery_slot')
            ->get()
            ->map(fn ($o) => [
                'order_id'      => $o->id,
                'order_number'  => $o->order_number,
                'customer_name' => $o->customer?->name,
                'slot'          => $o->delivery_slot,
                'status'        => $o->status,
            ]);

        return response()->json($orders);
    }

    public function dispatch(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'status'   => ['required', 'string', 'in:dispatched,delivered'],
        ]);

        $order = Order::findOrFail($data['order_id']);
        $order->update(['status' => $data['status']]);

        return response()->json(['message' => 'Dispatch updated.', 'order' => $order]);
    }
}
