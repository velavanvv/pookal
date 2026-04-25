<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Order extends TenantModel
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'order_number',
        'customer_id',
        'channel',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'delivery_slot',
        'delivery_date',
        'delivery_time_slot',
        'recipient_name',
        'recipient_phone',
        'recipient_address',
        'gift_message',
        'notes',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
