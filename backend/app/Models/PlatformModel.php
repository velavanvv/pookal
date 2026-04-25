<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

abstract class PlatformModel extends Model
{
    protected $connection = 'platform';
}
