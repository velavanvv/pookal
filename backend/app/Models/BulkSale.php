<?php
namespace App\Models;

class BulkSale extends TenantModel {
    protected $fillable = [
        'user_id','bulk_buyer_id','invoice_number','sale_date',
        'subtotal','discount','grand_total','status','due_date','notes',
    ];
    protected $casts = ['sale_date' => 'date', 'due_date' => 'date'];
    public function buyer() { return $this->belongsTo(BulkBuyer::class, 'bulk_buyer_id'); }
    public function items() { return $this->hasMany(BulkSaleItem::class); }
}
