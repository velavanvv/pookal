<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FarmerDelivery extends Model {
    protected $fillable = [
        'user_id','farmer_id','flower_type','quantity','unit',
        'rate_per_unit','delivery_date','quality_grade','notes',
    ];
    protected $casts = ['delivery_date' => 'date'];
    public function farmer() { return $this->belongsTo(Farmer::class); }

}
