<?php
namespace App\Models;

class Farmer extends TenantModel {
    protected $fillable = [
        'user_id','name','phone','email','address',
        'payment_cycle','bank_name','account_number','ifsc_code',
        'notes','is_active',
    ];
    public function deliveries() { return $this->hasMany(FarmerDelivery::class); }
    public function payments()   { return $this->hasMany(FarmerPayment::class); }
}
