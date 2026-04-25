<?php

namespace App\Models;

class OrderItem extends TenantModel
{
    protected $fillable = [
        'order_id',
        'product_id',
        'qty',
        'unit_price',
        'line_total',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
