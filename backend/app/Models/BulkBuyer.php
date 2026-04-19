<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class BulkBuyer extends Model {
    protected $fillable = [
        'user_id','name','contact_person','phone','email',
        'address','type','notes','is_active',
    ];
    public function sales() { return $this->hasMany(BulkSale::class); }
}
