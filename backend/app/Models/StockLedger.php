<?php

namespace App\Models;

class StockLedger extends TenantModel
{
    protected $table = 'stock_ledger';

    protected $fillable = [
        'product_id',
        'txn_type',
        'qty_change',
        'balance_after',
        'batch_code',
        'expiry_date',
        'reason',
        'reference',
        'notes',
    ];

    protected $casts = [
        'qty_change'    => 'integer',
        'balance_after' => 'integer',
        'expiry_date'   => 'date',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
