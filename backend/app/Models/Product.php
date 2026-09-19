<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends TenantModel
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'sku',
        'barcode',
        'category',
        'price',
        'pricing_mode',
        'unit',
        'reorder_level',
        'track_expiry',
        'image_url',
        'shelf_life_days',
        'tax_category',
        'attributes',
    ];

    protected $casts = [
        'track_expiry'    => 'boolean',
        'price'           => 'float',
        'shelf_life_days' => 'integer',
        'reorder_level'   => 'integer',
        'attributes'      => 'array',
    ];

    protected $appends = ['track_freshness', 'freshness_days'];

    public function getTrackFreshnessAttribute(): bool
    {
        return (bool) ($this->attributes['track_expiry'] ?? $this->attributes['track_freshness'] ?? false);
    }

    public function getFreshnessDaysAttribute(): int
    {
        return (int) ($this->attributes['shelf_life_days'] ?? $this->attributes['freshness_days'] ?? 3);
    }

    public function setTrackFreshnessAttribute($value): void
    {
        $this->attributes['track_expiry'] = (bool) $value;
    }

    public function setFreshnessDaysAttribute($value): void
    {
        $this->attributes['shelf_life_days'] = (int) $value;
    }

    public function modifiers()
    {
        return $this->hasMany(ProductModifier::class);
    }

    public function latestStock()
    {
        return $this->hasOne(StockLedger::class)->latestOfMany();
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
