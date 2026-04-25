<?php
namespace App\Models;

class FarmerDelivery extends TenantModel {
    protected $fillable = [
        'user_id','farmer_id','flower_type','quantity','unit',
        'rate_per_unit','delivery_date','quality_grade','notes',
    ];
    protected $casts = ['delivery_date' => 'date'];
    public function farmer() { return $this->belongsTo(Farmer::class); }

}
