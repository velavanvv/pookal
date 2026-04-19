<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockLedger extends Model
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
