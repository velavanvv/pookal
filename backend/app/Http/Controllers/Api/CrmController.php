<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use Illuminate\Http\Request;

class CrmController
{
    public function customers(Request $request)
    {
        $uid   = $request->user()->shopOwnerId();
        $query = Customer::where('user_id', $uid);

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
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:20'],
            'email'             => ['nullable', 'email', 'max:255'],
            'segment'           => ['nullable', 'string', 'in:regular,vip,event'],
            'preferred_channel' => ['nullable', 'string', 'in:whatsapp,sms,email'],
        ]);

        $customer = Customer::create(array_merge([
            'user_id'           => $uid,
            'segment'           => 'regular',
            'loyalty_points'    => 0,
            'preferred_channel' => 'whatsapp',
        ], $data));

        return response()->json(['message' => 'Customer saved.', 'customer' => $customer], 201);
    }

    public function updateCustomer(Request $request, Customer $customer)
    {
        $uid = $request->user()->shopOwnerId();
        abort_if($customer->user_id !== $uid, 403);

        $data = $request->validate([
            'name'              => ['sometimes', 'string', 'max:255'],
            'phone'             => ['nullable', 'string', 'max:20'],
            'email'             => ['nullable', 'email', 'max:255'],
            'segment'           => ['nullable', 'string', 'in:regular,vip,event'],
            'loyalty_points'    => ['nullable', 'integer', 'min:0'],
            'preferred_channel' => ['nullable', 'string', 'in:whatsapp,sms,email'],
        ]);

        $customer->update($data);
        return response()->json(['message' => 'Customer updated.', 'customer' => $customer]);
    }

    public function adjustPoints(Request $request, Customer $customer)
    {
        $uid = $request->user()->shopOwnerId();
        abort_if($customer->user_id !== $uid, 403);

        $data = $request->validate([
            'points' => ['required', 'integer'], // can be positive (add) or negative (redeem)
        ]);

        $newPoints = max(0, ($customer->loyalty_points ?? 0) + $data['points']);
        $customer->update(['loyalty_points' => $newPoints]);

        return response()->json([
            'message' => 'Loyalty points updated.',
            'loyalty_points' => $newPoints,
            'customer' => $customer
        ]);
    }

    public function campaigns()
    {
        return response()->json([
            [
                'id' => 1,
                'name' => 'Weekend Flash Sale (Flat 15% OFF)',
                'template' => "🌟 *Weekend Special Sale!* 🌟\nEnjoy Flat 15% OFF on our best-selling collections this weekend.\nShop directly or order online:\n👉 {store_url}\nReply to this message for instant assistance!",
                'channel' => 'whatsapp',
                'target_segment' => 'all',
                'status' => 'ready',
            ],
            [
                'id' => 2,
                'name' => 'Fresh Stock Arrival Alert',
                'template' => "🛒 *Fresh New Arrivals Just In!* 🛒\nWe have just restocked fresh products today. Beat the rush and place your order early.\nBrowse stock:\n👉 {store_url}",
                'channel' => 'whatsapp',
                'target_segment' => 'vip',
                'status' => 'ready',
            ],
            [
                'id' => 3,
                'name' => 'VIP Exclusive Reward (₹100 OFF)',
                'template' => "🎁 *Exclusive VIP Reward for You!* 🎁\nThank you for being one of our top customers. Use coupon *VIP100* for ₹100 off your next order above ₹500.\nOrder online: {store_url}",
                'channel' => 'whatsapp',
                'target_segment' => 'vip',
                'status' => 'ready',
            ],
            [
                'id' => 4,
                'name' => 'Payment Due Reminder (Khata)',
                'template' => "📋 *Payment Reminder from {shop_name}* 📋\nHello {name}, your outstanding bill balance is *Rs. {due_amount}*. Kindly clear the payment via UPI to our shop. Thank you for your continued support!",
                'channel' => 'whatsapp',
                'target_segment' => 'regular',
                'status' => 'ready',
            ],
        ]);
    }
}
