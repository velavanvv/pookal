<?php
namespace App\Models;

class BulkSaleItem extends TenantModel {
    protected $fillable = [
        'bulk_sale_id','flower_type','quantity','unit','rate_per_unit','total_amount',
    ];
}
