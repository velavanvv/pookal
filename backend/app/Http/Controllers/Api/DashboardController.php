<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;

class DashboardController
{
    public function summary(Request $request)
    {
        $uid = $request->user()->shopOwnerId();

        $salesToday = Order::where('user_id', $uid)
            ->whereDate('created_at', today())
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->sum('grand_total');

        $pendingOrders = Order::where('user_id', $uid)
            ->where('status', 'pending')
            ->count();

        $deliveryQueue = Order::where('user_id', $uid)
            ->whereIn('status', ['packed', 'dispatched'])
            ->count();

        $lowStock = Product::where('user_id', $uid)
            ->with('latestStock')
            ->get()
            ->filter(fn ($p) => ($p->latestStock?->balance_after ?? 0) <= $p->reorder_level)
            ->count();

        return response()->json([
            'sales_today'    => number_format((float) $salesToday, 0, '.', ','),
            'pending_orders' => $pendingOrders,
            'delivery_queue' => $deliveryQueue,
            'low_stock'      => $lowStock,
        ]);
    }
}
