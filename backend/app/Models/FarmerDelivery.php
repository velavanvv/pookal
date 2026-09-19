<?php

namespace App\Models;

class FarmerDelivery extends TenantModel
{
    protected $fillable = [
        'user_id', 'farmer_id', 'item_name', 'flower_type', 'quantity', 'unit',
        'rate_per_unit', 'delivery_date', 'quality_grade', 'notes',
    ];

    protected $casts = ['delivery_date' => 'date'];

    protected $appends = ['flower_type'];

    public function getFlowerTypeAttribute(): ?string
    {
        return $this->attributes['item_name'] ?? $this->attributes['flower_type'] ?? null;
    }

    public function setItemNameAttribute($value): void
    {
        $this->attributes['item_name'] = $value;
    }

    public function farmer()
    {
        return $this->belongsTo(Farmer::class);
    }
}
