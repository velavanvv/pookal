<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;

class DashboardController
{
    public function summary()
    {
        $salesToday = Order::whereDate('created_at', today())
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->sum('grand_total');

        $pendingOrders = Order::where('status', 'pending')->count();
        $deliveryQueue = Order::whereIn('status', ['packed', 'dispatched'])->count();

        $lowStock = Product::with('latestStock')->get()->filter(function ($p) {
            return ($p->latestStock?->balance_after ?? 0) <= $p->reorder_level;
        })->count();

        return response()->json([
            'sales_today'    => number_format((float) $salesToday, 0, '.', ','),
            'pending_orders' => $pendingOrders,
            'delivery_queue' => $deliveryQueue,
            'low_stock'      => $lowStock,
        ]);
    }
}
