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
        'table_id',
        'channel',
        'order_type',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'payment_method',
        'payments',
        'delivery_slot',
        'delivery_date',
        'delivery_time_slot',
        'recipient_name',
        'recipient_phone',
        'recipient_address',
        'delivery_area',
        'customer_latitude',
        'customer_longitude',
        'location_source',
        'location_captured_at',
        'gift_message',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'subtotal'       => 'float',
        'discount_total' => 'float',
        'tax_total'      => 'float',
        'grand_total'    => 'float',
        'payments'       => 'array',
        'metadata'       => 'array',
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

    public function table()
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function kitchenTickets()
    {
        return $this->hasMany(KitchenTicket::class);
    }
}
