<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FarmerPayment extends Model {
    protected $fillable = [
        'user_id','farmer_id','amount','period_start','period_end',
        'status','payment_date','payment_mode','notes',
    ];
    protected $casts = [
        'period_start'  => 'date',
        'period_end'    => 'date',
        'payment_date'  => 'date',
    ];
    public function farmer() { return $this->belongsTo(Farmer::class); }
}
