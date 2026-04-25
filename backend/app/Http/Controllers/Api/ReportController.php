<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Product;
use App\Support\Tenancy\TenantConnectionManager;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ReportController
{
    public function __construct(
        private readonly TenantConnectionManager $connections,
    ) {}

    public function sales(Request $request): JsonResponse
    {
        $user = $request->user();
        $uid  = $user->shopOwnerId();

        $currentDb = TenantContext::current();

        // ── Branch context active → single-branch data ────────────────────
        if ($currentDb && $currentDb->scope === 'branch') {
            $data = $this->fetchSalesFromCurrentDb($uid);
            return response()->json(array_merge($data, [
                'view'        => 'branch',
                'branch_name' => $currentDb->branch?->name ?? 'Branch',
                'branches'    => [],
            ]));
        }

        // ── Main shop with no branch: aggregate main + all sub-branches ───
        $branches = Branch::where('user_id', $uid)
            ->where('is_active', true)
            ->with('databaseConfig')
            ->orderBy('name')
            ->get();

        // Main shop data (already in main DB context)
        $sources = [['name' => 'Main Shop', 'data' => $this->fetchSalesFromCurrentDb($uid)]];

        // Each branch DB
        foreach ($branches as $branch) {
            if (! $branch->databaseConfig) continue;
            $this->connections->activate($branch->databaseConfig);
            $sources[] = ['name' => $branch->name, 'data' => $this->fetchSalesFromCurrentDb($uid)];
        }

        // Restore main DB context
        $this->connections->activateMainForUser($user);

        // Aggregate daily
        $aggregatedDaily = collect($sources)
            ->flatMap(fn ($s) => $s['data']['daily'])
            ->groupBy('date')
            ->map(fn ($rows, $date) => [
                'date'    => $date,
                'orders'  => $rows->sum('orders'),
                'revenue' => $rows->sum('revenue'),
            ])
            ->sortByDesc('date')
            ->values();

        // Aggregate channels
        $aggregatedChannels = collect($sources)
            ->flatMap(fn ($s) => $s['data']['channels'])
            ->groupBy('channel')
            ->map(fn ($rows, $channel) => [
                'channel' => $channel,
                'orders'  => $rows->sum('orders'),
                'revenue' => $rows->sum('revenue'),
            ])
            ->values();

        // Per-branch summary for the breakdown table
        $branchBreakdown = collect($sources)->map(fn ($s) => [
            'name'    => $s['name'],
            'orders'  => collect($s['data']['daily'])->sum('orders'),
            'revenue' => collect($s['data']['daily'])->sum('revenue'),
        ])->values();

        $summary = [
            'gross_sales'     => $aggregatedDaily->sum('revenue'),
            'orders'          => $aggregatedDaily->sum('orders'),
            'avg_order_value' => $aggregatedDaily->sum('orders') > 0
                ? round($aggregatedDaily->sum('revenue') / $aggregatedDaily->sum('orders'))
                : 0,
        ];

        return response()->json([
            'view'              => 'all',
            'summary'           => $summary,
            'daily'             => $aggregatedDaily,
            'channel_breakdown' => $aggregatedChannels,
            'branches'          => $branchBreakdown,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $user = $request->user();
        $uid  = $user->shopOwnerId();

        $currentDb = TenantContext::current();

        // ── Branch context: single-branch inventory ───────────────────────
        if ($currentDb && $currentDb->scope === 'branch') {
            $data = $this->fetchInventoryFromCurrentDb($uid);
            return response()->json(array_merge($data, [
                'view'        => 'branch',
                'branch_name' => $currentDb->branch?->name ?? 'Branch',
                'branches'    => [],
            ]));
        }

        // ── Main shop: aggregate across all branches ──────────────────────
        $branches = Branch::where('user_id', $uid)
            ->where('is_active', true)
            ->with('databaseConfig')
            ->orderBy('name')
            ->get();

        $sources = [['name' => 'Main Shop', 'data' => $this->fetchInventoryFromCurrentDb($uid)]];

        foreach ($branches as $branch) {
            if (! $branch->databaseConfig) continue;
            $this->connections->activate($branch->databaseConfig);
            $sources[] = ['name' => $branch->name, 'data' => $this->fetchInventoryFromCurrentDb($uid)];
        }

        $this->connections->activateMainForUser($user);

        // Aggregate category breakdown
        $aggregatedCategories = collect($sources)
            ->flatMap(fn ($s) => $s['data']['category_breakdown'])
            ->groupBy('category')
            ->map(fn ($rows, $category) => [
                'category'   => $category,
                'total_stock'=> $rows->sum('total_stock'),
                'item_count' => $rows->sum('item_count'),
            ])
            ->values();

        // Per-branch inventory summary
        $branchBreakdown = collect($sources)->map(fn ($s) => [
            'name'            => $s['name'],
            'total_items'     => $s['data']['total_items'],
            'low_stock_items' => $s['data']['low_stock_items'],
        ])->values();

        return response()->json([
            'view'               => 'all',
            'total_items'        => collect($sources)->sum(fn ($s) => $s['data']['total_items']),
            'low_stock_items'    => collect($sources)->sum(fn ($s) => $s['data']['low_stock_items']),
            'wastage_value'      => 0,
            'category_breakdown' => $aggregatedCategories,
            'branches'           => $branchBreakdown,
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function fetchSalesFromCurrentDb(int $uid): array
    {
        $daily = Order::selectRaw('DATE(created_at) as date, COUNT(*) as orders, SUM(grand_total) as revenue')
            ->where('user_id', $uid)
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date', 'desc')
            ->get();

        $channels = Order::selectRaw('channel, COUNT(*) as orders, SUM(grand_total) as revenue')
            ->where('user_id', $uid)
            ->where('created_at', '>=', now()->subDays(30))
            ->whereIn('status', ['packed', 'dispatched', 'delivered'])
            ->groupBy('channel')
            ->get();

        $totalOrders = $daily->sum('orders');

        return [
            'summary' => [
                'gross_sales'     => $daily->sum('revenue'),
                'orders'          => $totalOrders,
                'avg_order_value' => $totalOrders > 0 ? round($daily->sum('revenue') / $totalOrders) : 0,
            ],
            'daily'    => $daily,
            'channels' => $channels,
        ];
    }

    private function fetchInventoryFromCurrentDb(int $uid): array
    {
        $products = Product::where('user_id', $uid)->with('latestStock')->get();
        $lowStock = $products->filter(fn ($p) => ($p->latestStock?->balance_after ?? 0) <= $p->reorder_level);

        $categoryBreakdown = $products->groupBy('category')->map(function ($items, $category) {
            return [
                'category'    => $category,
                'total_stock' => $items->sum(fn ($p) => $p->latestStock?->balance_after ?? 0),
                'item_count'  => $items->count(),
            ];
        })->values();

        return [
            'total_items'        => $products->count(),
            'low_stock_items'    => $lowStock->count(),
            'wastage_value'      => 0,
            'category_breakdown' => $categoryBreakdown,
        ];
    }
}
