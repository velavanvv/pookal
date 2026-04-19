<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\StockLedger;

class ReportController
{
    public function sales()
    {
        $daily = Order::selectRaw('DATE(created_at) as date, COUNT(*) as orders, SUM(grand_total) as revenue')
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date', 'desc')
            ->get();

        $summary = [
            'gross_sales'     => $daily->sum('revenue'),
            'orders'          => $daily->sum('orders'),
            'avg_order_value' => $daily->sum('orders') > 0
                ? round($daily->sum('revenue') / $daily->sum('orders'))
                : 0,
        ];

        $channelBreakdown = Order::selectRaw('channel, COUNT(*) as orders, SUM(grand_total) as revenue')
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->groupBy('channel')
            ->get();

        return response()->json([
            'summary'           => $summary,
            'daily'             => $daily,
            'channel_breakdown' => $channelBreakdown,
        ]);
    }

    public function inventory()
    {
        $products = Product::with('latestStock')->get();
        $lowStock = $products->filter(fn ($p) => ($p->latestStock?->balance_after ?? 0) <= $p->reorder_level);

        // Stock grouped by category
        $categoryBreakdown = $products->groupBy('category')->map(function ($items, $category) {
            return [
                'category'    => $category,
                'total_stock' => $items->sum(fn ($p) => $p->latestStock?->balance_after ?? 0),
                'item_count'  => $items->count(),
            ];
        })->values();

        return response()->json([
            'total_items'        => $products->count(),
            'low_stock_items'    => $lowStock->count(),
            'wastage_value'      => 0,
            'category_breakdown' => $categoryBreakdown,
        ]);
    }
}
