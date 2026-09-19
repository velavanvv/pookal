<?php

namespace App\Models;

class OrderItem extends TenantModel
{
    protected $fillable = [
        'order_id',
        'product_id',
        'table_id',
        'qty',
        'weight',
        'unit_price',
        'line_total',
        'modifiers',
    ];

    protected $casts = [
        'qty'        => 'integer',
        'weight'     => 'float',
        'unit_price' => 'float',
        'line_total' => 'float',
        'modifiers'  => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
