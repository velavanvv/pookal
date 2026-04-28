<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $connection = 'platform';

    protected $fillable = [
        'name',
        'role',
        'shop_name',
        'phone',
        'email',
        'password',
        'parent_user_id',
        'branch_id',
        'fcm_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isStaff(): bool
    {
        return $this->parent_user_id !== null;
    }

    public function isBranchUser(): bool
    {
        return $this->branch_id !== null;
    }

    /**
     * Returns the shop-owner ID for tenant isolation.
     * Staff and branch users inherit their parent shop's data.
     */
    public function shopOwnerId(): int
    {
        return $this->parent_user_id ?? $this->id;
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function shopSettings()
    {
        return $this->hasMany(ShopSetting::class);
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function parentShop()
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function staffMembers()
    {
        return $this->hasMany(User::class, 'parent_user_id');
    }

    public function tenantDatabases()
    {
        return $this->hasMany(TenantDatabase::class);
    }

    public function mainDatabase()
    {
        return $this->hasOne(TenantDatabase::class)->where('scope', 'main')->whereNull('branch_id');
    }
}
