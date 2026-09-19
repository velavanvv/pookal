<?php

namespace App\Http\Controllers\Api;

use App\Models\KitchenTicket;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestaurantController
{
    // ── Table Management ─────────────────────────────────────────────────────

    public function listTables(Request $request): JsonResponse
    {
        $tables = RestaurantTable::query()
            ->with(['activeOrder.customer', 'activeOrder.items.product'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $tables]);
    }

    public function storeTable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:64'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'section'  => ['nullable', 'string', 'max:64'],
            'notes'    => ['nullable', 'string', 'max:255'],
        ]);

        $data['user_id'] = $request->user()->shopOwnerId();
        $data['capacity'] = $data['capacity'] ?? 4;
        $data['status'] = 'vacant';

        $table = RestaurantTable::create($data);

        return response()->json([
            'message' => 'Table created successfully.',
            'table'   => $table,
        ], 201);
    }

    public function updateTable(Request $request, RestaurantTable $table): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['sometimes', 'required', 'string', 'max:64'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'section'  => ['nullable', 'string', 'max:64'],
            'status'   => ['sometimes', 'required', 'in:vacant,occupied,reserved,billing'],
            'notes'    => ['nullable', 'string', 'max:255'],
        ]);

        $table->update($data);

        return response()->json([
            'message' => 'Table updated successfully.',
            'table'   => $table,
        ]);
    }

    public function updateTableStatus(Request $request, RestaurantTable $table): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:vacant,occupied,reserved,billing'],
        ]);

        $table->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Table status updated.',
            'table'   => $table,
        ]);
    }

    public function destroyTable(RestaurantTable $table): JsonResponse
    {
        $table->delete();

        return response()->json(['message' => 'Table deleted successfully.']);
    }

    // ── Kitchen Order Tickets (KOT) ──────────────────────────────────────────

    public function listKitchenTickets(Request $request): JsonResponse
    {
        $query = KitchenTicket::query()
            ->with(['order.customer', 'table'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($station = $request->query('station')) {
            $query->where('station', $station);
        }

        $tickets = $query->limit(50)->get();

        return response()->json(['data' => $tickets]);
    }

    public function storeKitchenTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'      => ['required', 'integer'],
            'table_id'      => ['nullable', 'integer'],
            'station'       => ['nullable', 'string', 'max:32'],
            'ticket_number' => ['nullable', 'string', 'max:32'],
            'items'         => ['required', 'array'],
            'notes'         => ['nullable', 'string', 'max:255'],
        ]);

        $data['user_id'] = $request->user()->shopOwnerId();
        $data['station'] = $data['station'] ?? 'kitchen';
        $data['status']  = 'pending';
        $data['ticket_number'] = $data['ticket_number'] ?? ('KOT-' . strtoupper(substr(uniqid(), -5)));
        $data['printed_at'] = now();

        $ticket = KitchenTicket::create($data);

        // Auto mark table as occupied if table_id is provided
        if (! empty($data['table_id'])) {
            RestaurantTable::where('id', $data['table_id'])->update(['status' => 'occupied']);
        }

        return response()->json([
            'message' => 'Kitchen ticket created.',
            'ticket'  => $ticket->load(['order', 'table']),
        ], 201);
    }

    public function updateTicketStatus(Request $request, KitchenTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,preparing,ready,served,cancelled'],
        ]);

        $ticket->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Ticket status updated.',
            'ticket'  => $ticket,
        ]);
    }

    // ── Product Modifiers ────────────────────────────────────────────────────

    public function listModifiers(Request $request): JsonResponse
    {
        $productId = $request->query('product_id');

        $query = ProductModifier::query()->with('product');
        if ($productId) {
            $query->where('product_id', $productId);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function storeModifier(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id'  => ['required', 'integer'],
            'name'        => ['required', 'string', 'max:128'],
            'price_delta' => ['nullable', 'numeric'],
            'is_required' => ['nullable', 'boolean'],
            'options'     => ['nullable', 'array'],
        ]);

        $data['price_delta'] = $data['price_delta'] ?? 0;
        $data['is_required'] = $data['is_required'] ?? false;

        $modifier = ProductModifier::create($data);

        return response()->json([
            'message'  => 'Modifier created.',
            'modifier' => $modifier->load('product'),
        ], 201);
    }

    public function updateModifier(Request $request, ProductModifier $modifier): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:128'],
            'price_delta' => ['nullable', 'numeric'],
            'is_required' => ['nullable', 'boolean'],
            'options'     => ['nullable', 'array'],
        ]);

        $modifier->update($data);

        return response()->json([
            'message'  => 'Modifier updated.',
            'modifier' => $modifier,
        ]);
    }

    public function destroyModifier(ProductModifier $modifier): JsonResponse
    {
        $modifier->delete();

        return response()->json(['message' => 'Modifier deleted.']);
    }

    // ── Stats ────────────────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $totalTables = RestaurantTable::count();
        $occupiedTables = RestaurantTable::where('status', 'occupied')->count();
        $billingTables = RestaurantTable::where('status', 'billing')->count();
        $vacantTables = RestaurantTable::where('status', 'vacant')->count();

        $pendingKots = KitchenTicket::where('status', 'pending')->count();
        $preparingKots = KitchenTicket::where('status', 'preparing')->count();
        $readyKots = KitchenTicket::where('status', 'ready')->count();

        return response()->json([
            'total_tables'    => $totalTables,
            'occupied_tables' => $occupiedTables,
            'billing_tables'  => $billingTables,
            'vacant_tables'   => $vacantTables,
            'pending_kots'    => $pendingKots,
            'preparing_kots'  => $preparingKots,
            'ready_kots'      => $readyKots,
        ]);
    }
}
