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
        'reference',
        'notes',
    ];
}
