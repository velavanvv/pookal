<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'sku',
        'category',
        'price',
        'unit',
        'reorder_level',
        'track_freshness',
        'image_url',
        'freshness_days',
    ];

    public function latestStock()
    {
        return $this->hasOne(StockLedger::class)->latestOfMany();
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
