<?php

namespace App\Support\Tenancy;

use App\Models\Branch;
use App\Models\ShopSetting;
use App\Models\TenantDatabase;
use App\Models\User;
use Illuminate\Support\Str;

class TenantProvisioner
{
    public function __construct(
        private readonly TenantConnectionManager $connections,
        private readonly TenantSchemaManager $schema,
    ) {
    }

    public function provisionMainDatabase(User $owner): TenantDatabase
    {
        $database = TenantDatabase::updateOrCreate(
            [
                'user_id' => $owner->id,
                'branch_id' => null,
                'scope' => 'main',
            ],
            [
                'label' => 'Main Shop Database',
                'driver' => 'sqlite',
                'database' => "tenants/shop-{$owner->id}/main.sqlite",
                'storefront_slug' => Str::slug($owner->shop_name ?: $owner->name ?: "shop-{$owner->id}"),
                'website_enabled' => false,
                'is_active' => true,
            ]
        );

        $this->connections->activate($database);
        $this->schema->ensureSchema();
        $this->bootstrapSettings($owner);

        return $database;
    }

    public function provisionBranchDatabase(User $owner, Branch $branch): TenantDatabase
    {
        $database = TenantDatabase::updateOrCreate(
            [
                'user_id' => $owner->id,
                'branch_id' => $branch->id,
                'scope' => 'branch',
            ],
            [
                'label' => "{$branch->name} Branch Database",
                'driver' => 'sqlite',
                'database' => "tenants/shop-{$owner->id}/branch-{$branch->code}.sqlite",
                'is_active' => true,
            ]
        );

        $this->connections->activate($database);
        $this->schema->ensureSchema();
        $this->bootstrapSettings($owner, $branch);

        return $database;
    }

    private function bootstrapSettings(User $owner, ?Branch $branch = null): void
    {
        $settings = [
            'shop_name' => $branch?->name ?: ($owner->shop_name ?: $owner->name),
            'shop_phone' => $branch?->phone ?: ($owner->phone ?: ''),
            'shop_email' => $owner->email,
            'currency' => 'INR',
            'currency_symbol' => 'Rs.',
            'tax_rate' => '5',
            'website_enabled' => '0',
        ];

        foreach ($settings as $key => $value) {
            ShopSetting::set($key, $value, $owner->id);
        }
    }
}
