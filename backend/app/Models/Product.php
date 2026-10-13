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
        'item_type',
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

    protected $appends = ['track_freshness', 'freshness_days', 'is_dish', 'is_raw_material'];

    public function getTrackFreshnessAttribute(): bool
    {
        return (bool) ($this->attributes['track_expiry'] ?? $this->attributes['track_freshness'] ?? false);
    }

    public function getFreshnessDaysAttribute(): int
    {
        return (int) ($this->attributes['shelf_life_days'] ?? $this->attributes['freshness_days'] ?? 0);
    }

    public function getIsDishAttribute(): bool
    {
        return ($this->attributes['item_type'] ?? 'product') === 'dish';
    }

    public function getIsRawMaterialAttribute(): bool
    {
        return ($this->attributes['item_type'] ?? 'product') === 'raw_material';
    }

    public function setShelfLifeDaysAttribute($value): void
    {
        $this->attributes['shelf_life_days'] = ($value !== null && $value !== '') ? (int) $value : 0;
    }

    public function setTrackExpiryAttribute($value): void
    {
        $this->attributes['track_expiry'] = (bool) $value;
    }

    public function setTrackFreshnessAttribute($value): void
    {
        $this->attributes['track_expiry'] = (bool) $value;
    }

    public function setFreshnessDaysAttribute($value): void
    {
        $this->attributes['shelf_life_days'] = ($value !== null && $value !== '') ? (int) $value : 0;
    }

    public function setTaxCategoryAttribute($value): void
    {
        $this->attributes['tax_category'] = !empty($value) ? (string) $value : 'standard';
    }

    public function setPricingModeAttribute($value): void
    {
        $this->attributes['pricing_mode'] = !empty($value) ? (string) $value : 'fixed';
    }

    public function setUnitAttribute($value): void
    {
        $this->attributes['unit'] = !empty($value) ? (string) $value : 'piece';
    }

    public function setReorderLevelAttribute($value): void
    {
        $this->attributes['reorder_level'] = ($value !== null && $value !== '') ? (int) $value : 0;
    }

    public function setItemTypeAttribute($value): void
    {
        $this->attributes['item_type'] = !empty($value) ? (string) $value : 'product';
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
