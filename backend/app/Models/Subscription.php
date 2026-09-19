<?php

namespace App\Models;

class Subscription extends PlatformModel
{
    protected $fillable = [
        'user_id', 'plan_id', 'status', 'billing_cycle',
        'amount_paid', 'start_date', 'end_date',
        'next_renewal_date', 'auto_renew', 'notes',
    ];

    protected $casts = [
        'start_date'        => 'date',
        'end_date'          => 'date',
        'next_renewal_date' => 'date',
        'auto_renew'        => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function isExpired(): bool
    {
        return $this->end_date?->isPast() ?? false;
    }

    public function daysUntilRenewal(): int
    {
        if (! $this->end_date) {
            return 0;
        }

        return max(0, (int) now()->diffInDays($this->end_date, false));
    }
}
