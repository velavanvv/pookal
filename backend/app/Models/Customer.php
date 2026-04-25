<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Customer extends TenantModel
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'segment',
        'loyalty_points',
        'preferred_channel',
    ];
}
