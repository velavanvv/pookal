<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Branch extends PlatformModel
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'plan_id',
        'name',
        'code',
        'address',
        'phone',
        'manager_name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function databaseConfig()
    {
        return $this->hasOne(TenantDatabase::class);
    }
}
