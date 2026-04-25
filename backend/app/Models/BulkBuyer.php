<?php
namespace App\Models;

class BulkBuyer extends TenantModel {
    protected $fillable = [
        'user_id','name','contact_person','phone','email',
        'address','type','notes','is_active',
    ];
    public function sales() { return $this->hasMany(BulkSale::class); }
}
