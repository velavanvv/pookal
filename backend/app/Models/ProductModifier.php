<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductModifier extends TenantModel
{
    use HasFactory;

    protected $table = 'product_modifiers';

    protected $fillable = [
        'product_id',
        'name',
        'price_delta',
        'is_required',
        'options',
    ];

    protected $casts = [
        'price_delta' => 'float',
        'is_required' => 'boolean',
        'options'     => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
