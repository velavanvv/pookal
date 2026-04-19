<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class BulkSaleItem extends Model {
    protected $fillable = [
        'bulk_sale_id','flower_type','quantity','unit','rate_per_unit','total_amount',
    ];
}
