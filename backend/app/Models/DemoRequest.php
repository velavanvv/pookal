<?php

namespace App\Models;

class DemoRequest extends PlatformModel
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'business_name',
        'city',
        'message',
        'status',
    ];
}
