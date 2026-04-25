<?php

namespace App\Http\Controllers\Api;

use App\Models\BulkBuyer;
use App\Models\BulkSale;
use App\Models\BulkSaleItem;
use App\Models\Farmer;
use App\Models\FarmerDelivery;
use App\Models\FarmerPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VendorController
{
    private function uid(Request $r): int { return $r->user()->shopOwnerId(); }

    // ══ FARMERS ══════════════════════════════════════════════════════════════

    public function listFarmers(Request $request): JsonResponse
    {
        $farmers = Farmer::where('user_id', $this->uid($request))
            ->withCount('deliveries')
            ->withSum('payments as total_paid', 'amount')
            ->orderBy('name')
            ->get();
        return response()->json($farmers);
    }

    public function storeFarmer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:120'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'email'          => ['nullable', 'email', 'max:120'],
            'address'        => ['nullable', 'string', 'max:300'],
            'payment_cycle'  => ['sometimes', 'in:weekly,biweekly,monthly'],
            'bank_name'      => ['nullable', 'string', 'max:80'],
            'account_number' => ['nullable', 'string', 'max:40'],
            'ifsc_code'      => ['nullable', 'string', 'max:20'],
            'notes'          => ['nullable', 'string', 'max:400'],
            'is_active'      => ['nullable', 'boolean'],
        ]);
        $farmer = Farmer::create(array_merge($data, ['user_id' => $this->uid($request)]));
        return response()->json(['message' => 'Farmer added.', 'farmer' => $farmer], 201);
    }

    public function updateFarmer(Request $request, Farmer $farmer): JsonResponse
    {
        abort_if($farmer->user_id !== $this->uid($request), 403);
        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:120'],
            'phone'          => ['sometimes', 'nullable', 'string', 'max:20'],
            'email'          => ['sometimes', 'nullable', 'email'],
            'address'        => ['sometimes', 'nullable', 'string', 'max:300'],
            'payment_cycle'  => ['sometimes', 'in:weekly,biweekly,monthly'],
            'bank_name'      => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_number' => ['sometimes', 'nullable', 'string', 'max:40'],
            'ifsc_code'      => ['sometimes', 'nullable', 'string', 'max:20'],
            'notes'          => ['sometimes', 'nullable', 'string', 'max:400'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);
        $farmer->update($data);
        return response()->json(['message' => 'Farmer updated.', 'farmer' => $farmer]);
    }

    public function deleteFarmer(Request $request, Farmer $farmer): JsonResponse
    {
        abort_if($farmer->user_id !== $this->uid($request), 403);
        $farmer->delete();
        return response()->json(['message' => 'Farmer deleted.']);
    }

    // Bulk import farmers from Excel (parsed JSON on frontend)
    public function importFarmers(Request $request): JsonResponse
    {
        $rows = $request->validate(['rows' => ['required', 'array', 'min:1']])['rows'];
        $created = 0;
        foreach ($rows as $row) {
            if (empty($row['name'])) continue;
            Farmer::firstOrCreate(
                ['user_id' => $this->uid($request), 'name' => trim($row['name']), 'phone' => trim($row['phone'] ?? '')],
                [
                    'email'          => $row['email']          ?? null,
                    'address'        => $row['address']        ?? null,
                    'payment_cycle'  => $row['payment_cycle']  ?? 'biweekly',
                    'bank_name'      => $row['bank_name']      ?? null,
                    'account_number' => $row['account_number'] ?? null,
                    'ifsc_code'      => $row['ifsc_code']      ?? null,
                ]
            );
            $created++;
        }
        return response()->json(['message' => "{$created} farmers imported."]);
    }

    // ══ DAILY DELIVERIES ═════════════════════════════════════════════════════

    public function listDeliveries(Request $request): JsonResponse
    {
        $query = FarmerDelivery::where('user_id', $this->uid($request))
            ->with('farmer:id,name')
            ->orderBy('delivery_date', 'desc');

        if ($date = $request->query('date')) {
            $query->whereDate('delivery_date', $date);
        }
        if ($farmer_id = $request->query('farmer_id')) {
            $query->where('farmer_id', $farmer_id);
        }

        return response()->json($query->limit(200)->get()->map(fn ($d) => [
            'id'            => $d->id,
            'farmer_id'     => $d->farmer_id,
            'farmer_name'   => $d->farmer->name,
            'flower_type'   => $d->flower_type,
            'quantity'      => $d->quantity,
            'unit'          => $d->unit,
            'rate_per_unit' => $d->rate_per_unit,
            'total_amount'  => $d->total_amount,
            'delivery_date' => $d->delivery_date->toDateString(),
            'quality_grade' => $d->quality_grade,
            'notes'         => $d->notes,
        ]));
    }

    public function storeDelivery(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farmer_id'     => ['required', Rule::exists('tenant.farmers', 'id')],
            'flower_type'   => ['required', 'string', 'max:80'],
            'quantity'      => ['required', 'numeric', 'min:0.01'],
            'unit'          => ['required', 'in:kg,bunch,stems,boxes,nos'],
            'rate_per_unit' => ['required', 'numeric', 'min:0'],
            'delivery_date' => ['required', 'date'],
            'quality_grade' => ['nullable', 'in:A,B,C'],
            'notes'         => ['nullable', 'string', 'max:300'],
        ]);

        // Verify farmer belongs to this user
        abort_unless(
            Farmer::where('id', $data['farmer_id'])->where('user_id', $this->uid($request))->exists(),
            403
        );

        $data['total_amount'] = round($data['quantity'] * $data['rate_per_unit'], 2);
        $delivery = FarmerDelivery::create(array_merge($data, ['user_id' => $this->uid($request)]));

        return response()->json([
            'message'  => 'Delivery recorded.',
            'delivery' => array_merge($delivery->toArray(), ['total_amount' => $delivery->total_amount]),
        ], 201);
    }

    public function deleteDelivery(Request $request, FarmerDelivery $delivery): JsonResponse
    {
        abort_if($delivery->user_id !== $this->uid($request), 403);
        $delivery->delete();
        return response()->json(['message' => 'Delivery deleted.']);
    }

    // ══ FARMER PAYMENTS ══════════════════════════════════════════════════════

    public function listPayments(Request $request): JsonResponse
    {
        $payments = FarmerPayment::where('user_id', $this->uid($request))
            ->with('farmer:id,name,payment_cycle')
            ->orderBy('period_end', 'desc')
            ->get()
            ->map(fn ($p) => [
                'id'           => $p->id,
                'farmer_id'    => $p->farmer_id,
                'farmer_name'  => $p->farmer->name,
                'amount'       => $p->amount,
                'period_start' => $p->period_start->toDateString(),
                'period_end'   => $p->period_end->toDateString(),
                'status'       => $p->status,
                'payment_date' => $p->payment_date?->toDateString(),
                'payment_mode' => $p->payment_mode,
                'notes'        => $p->notes,
            ]);
        return response()->json($payments);
    }

    // Auto-generate payment from deliveries in a date range
    public function generatePayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farmer_id'    => ['required', Rule::exists('tenant.farmers', 'id')],
            'period_start' => ['required', 'date'],
            'period_end'   => ['required', 'date', 'after_or_equal:period_start'],
            'notes'        => ['nullable', 'string', 'max:300'],
        ]);

        abort_unless(
            Farmer::where('id', $data['farmer_id'])->where('user_id', $this->uid($request))->exists(),
            403
        );

        $total = FarmerDelivery::where('farmer_id', $data['farmer_id'])
            ->where('user_id', $this->uid($request))
            ->whereBetween('delivery_date', [$data['period_start'], $data['period_end']])
            ->get()
            ->sum(fn ($d) => $d->total_amount);

        $payment = FarmerPayment::create([
            'user_id'      => $this->uid($request),
            'farmer_id'    => $data['farmer_id'],
            'amount'       => $total,
            'period_start' => $data['period_start'],
            'period_end'   => $data['period_end'],
            'status'       => 'pending',
            'notes'        => $data['notes'] ?? null,
        ]);

        return response()->json(['message' => 'Payment generated.', 'payment' => $payment], 201);
    }

    public function markPaymentPaid(Request $request, FarmerPayment $payment): JsonResponse
    {
        abort_if($payment->user_id !== $this->uid($request), 403);
        $data = $request->validate([
            'payment_mode' => ['required', 'in:cash,bank,upi'],
            'payment_date' => ['required', 'date'],
        ]);
        $payment->update(['status' => 'paid', ...$data]);
        return response()->json(['message' => 'Payment marked as paid.', 'payment' => $payment]);
    }

    // ══ BULK BUYERS ══════════════════════════════════════════════════════════

    public function listBuyers(Request $request): JsonResponse
    {
        return response()->json(
            BulkBuyer::where('user_id', $this->uid($request))->orderBy('name')->get()
        );
    }

    public function storeBuyer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:120'],
            'contact_person' => ['nullable', 'string', 'max:80'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'email'          => ['nullable', 'email'],
            'address'        => ['nullable', 'string', 'max:300'],
            'type'           => ['nullable', 'in:company,market,hotel,retailer,other'],
            'notes'          => ['nullable', 'string', 'max:300'],
        ]);
        $buyer = BulkBuyer::create(array_merge($data, ['user_id' => $this->uid($request)]));
        return response()->json(['message' => 'Buyer added.', 'buyer' => $buyer], 201);
    }

    public function updateBuyer(Request $request, BulkBuyer $buyer): JsonResponse
    {
        abort_if($buyer->user_id !== $this->uid($request), 403);
        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:120'],
            'contact_person' => ['sometimes', 'nullable', 'string', 'max:80'],
            'phone'          => ['sometimes', 'nullable', 'string', 'max:20'],
            'email'          => ['sometimes', 'nullable', 'email'],
            'address'        => ['sometimes', 'nullable', 'string', 'max:300'],
            'type'           => ['sometimes', 'in:company,market,hotel,retailer,other'],
            'notes'          => ['sometimes', 'nullable', 'string', 'max:300'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);
        $buyer->update($data);
        return response()->json(['message' => 'Buyer updated.', 'buyer' => $buyer]);
    }

    public function deleteBuyer(Request $request, BulkBuyer $buyer): JsonResponse
    {
        abort_if($buyer->user_id !== $this->uid($request), 403);
        $buyer->delete();
        return response()->json(['message' => 'Buyer deleted.']);
    }

    // ══ BULK SALES ═══════════════════════════════════════════════════════════

    public function listSales(Request $request): JsonResponse
    {
        $sales = BulkSale::where('user_id', $this->uid($request))
            ->with(['buyer:id,name,type', 'items'])
            ->orderBy('sale_date', 'desc')
            ->limit(100)
            ->get()
            ->map(fn ($s) => [
                'id'             => $s->id,
                'invoice_number' => $s->invoice_number,
                'buyer_id'       => $s->bulk_buyer_id,
                'buyer_name'     => $s->buyer->name,
                'buyer_type'     => $s->buyer->type,
                'sale_date'      => $s->sale_date->toDateString(),
                'subtotal'       => $s->subtotal,
                'discount'       => $s->discount,
                'grand_total'    => $s->grand_total,
                'status'         => $s->status,
                'due_date'       => $s->due_date?->toDateString(),
                'notes'          => $s->notes,
                'items'          => $s->items,
            ]);
        return response()->json($sales);
    }

    public function storeSale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bulk_buyer_id' => ['required', Rule::exists('tenant.bulk_buyers', 'id')],
            'sale_date'     => ['required', 'date'],
            'discount'      => ['nullable', 'numeric', 'min:0'],
            'due_date'      => ['nullable', 'date'],
            'notes'         => ['nullable', 'string', 'max:400'],
            'items'         => ['required', 'array', 'min:1'],
            'items.*.flower_type'   => ['required', 'string', 'max:80'],
            'items.*.quantity'      => ['required', 'numeric', 'min:0.01'],
            'items.*.unit'          => ['required', 'string'],
            'items.*.rate_per_unit' => ['required', 'numeric', 'min:0'],
        ]);

        abort_unless(
            BulkBuyer::where('id', $data['bulk_buyer_id'])->where('user_id', $this->uid($request))->exists(),
            403
        );

        $subtotal = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['rate_per_unit']);
        $discount = $data['discount'] ?? 0;
        $grand    = round($subtotal - $discount, 2);

        $sale = BulkSale::create([
            'user_id'        => $this->uid($request),
            'bulk_buyer_id'  => $data['bulk_buyer_id'],
            'invoice_number' => 'INV-' . now()->format('YmdHis') . '-' . rand(10, 99),
            'sale_date'      => $data['sale_date'],
            'subtotal'       => $subtotal,
            'discount'       => $discount,
            'grand_total'    => $grand,
            'status'         => 'confirmed',
            'due_date'       => $data['due_date'] ?? null,
            'notes'          => $data['notes'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            BulkSaleItem::create([
                'bulk_sale_id'  => $sale->id,
                'flower_type'   => $item['flower_type'],
                'quantity'      => $item['quantity'],
                'unit'          => $item['unit'],
                'rate_per_unit' => $item['rate_per_unit'],
                'total_amount'  => round($item['quantity'] * $item['rate_per_unit'], 2),
            ]);
        }

        return response()->json(['message' => 'Bulk sale created.', 'sale' => $sale->load('items')], 201);
    }

    public function updateSaleStatus(Request $request, BulkSale $sale): JsonResponse
    {
        abort_if($sale->user_id !== $this->uid($request), 403);
        $data = $request->validate(['status' => ['required', 'in:draft,confirmed,paid']]);
        $sale->update($data);
        return response()->json(['message' => 'Status updated.', 'sale' => $sale]);
    }

    public function deleteSale(Request $request, BulkSale $sale): JsonResponse
    {
        abort_if($sale->user_id !== $this->uid($request), 403);
        $sale->delete();
        return response()->json(['message' => 'Sale deleted.']);
    }

    // ══ STATS ════════════════════════════════════════════════════════════════

    public function stats(Request $request): JsonResponse
    {
        $uid = $this->uid($request);
        $farmerDeliveries = FarmerDelivery::where('user_id', $uid)
            ->whereMonth('delivery_date', now()->month)
            ->get();

        return response()->json([
            'total_farmers'           => Farmer::where('user_id', $uid)->where('is_active', true)->count(),
            'monthly_intake_value'    => $farmerDeliveries->sum(fn ($d) => $d->total_amount),
            'monthly_intake_count'    => $farmerDeliveries->count(),
            'pending_farmer_payments' => FarmerPayment::where('user_id', $uid)->where('status', 'pending')->sum('amount'),
            'total_bulk_buyers'       => BulkBuyer::where('user_id', $uid)->where('is_active', true)->count(),
            'monthly_bulk_sales'      => BulkSale::where('user_id', $uid)->whereMonth('sale_date', now()->month)->sum('grand_total'),
            'unpaid_bulk_sales'       => BulkSale::where('user_id', $uid)->whereIn('status', ['confirmed'])->sum('grand_total'),
        ]);
    }
}
