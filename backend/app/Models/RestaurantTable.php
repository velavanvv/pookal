<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class RestaurantTable extends TenantModel
{
    use HasFactory;

    protected $table = 'restaurant_tables';

    protected $fillable = [
        'user_id',
        'branch_id',
        'name',
        'capacity',
        'status', // vacant | occupied | reserved | billing
        'section',
        'notes',
    ];

    protected $casts = [
        'capacity' => 'integer',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class, 'table_id');
    }

    public function activeOrder()
    {
        return $this->hasOne(Order::class, 'table_id')
            ->whereIn('status', ['pending', 'processing', 'preparing'])
            ->latest('id');
    }
}
