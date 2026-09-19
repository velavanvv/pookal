<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class KitchenTicket extends TenantModel
{
    use HasFactory;

    protected $table = 'kitchen_tickets';

    protected $fillable = [
        'user_id',
        'order_id',
        'table_id',
        'ticket_number',
        'status', // pending | preparing | ready | served | cancelled
        'station',
        'items',
        'printed_at',
        'notes',
    ];

    protected $casts = [
        'items'      => 'array',
        'printed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function table()
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }
}
