<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use Illuminate\Http\Request;

class CrmController
{
    public function customers(Request $request)
    {
        $query = Customer::query();

        if ($segment = $request->query('segment')) {
            $query->where('segment', $segment);
        }

        if ($phone = $request->query('phone')) {
            $query->where('phone', 'like', "%{$phone}%");
        }

        $customers = $query->orderByDesc('loyalty_points')->paginate(25);

        return response()->json($customers);
    }

    public function storeCustomer(Request $request)
    {
        $data = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:20'],
            'email'             => ['nullable', 'email', 'max:255'],
            'segment'           => ['nullable', 'string', 'in:regular,vip,event'],
            'preferred_channel' => ['nullable', 'string', 'in:whatsapp,sms,email'],
        ]);

        $customer = Customer::create(array_merge([
            'segment'           => 'regular',
            'loyalty_points'    => 0,
            'preferred_channel' => 'whatsapp',
        ], $data));

        return response()->json(['message' => 'Customer saved.', 'customer' => $customer], 201);
    }

    public function campaigns()
    {
        return response()->json([
            ['name' => 'Aadi Festival Offer',    'channel' => 'whatsapp', 'status' => 'draft'],
            ['name' => 'Wedding Season Blast',   'channel' => 'sms',      'status' => 'scheduled'],
            ['name' => 'Loyalty Points Reminder','channel' => 'whatsapp', 'status' => 'scheduled'],
            ['name' => 'New Arrival — Tulips',   'channel' => 'email',    'status' => 'draft'],
        ]);
    }
}
