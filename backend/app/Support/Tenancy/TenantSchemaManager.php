<?php

namespace App\Support\Tenancy;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class TenantSchemaManager
{
    public function ensureSchema(string $connection = 'tenant'): void
    {
        $schema = Schema::connection($connection);

        if (! $schema->hasTable('products')) {
            $schema->create('products', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('name');
                $table->string('sku')->unique();
                $table->string('category');
                $table->decimal('price', 10, 2);
                $table->string('unit')->default('piece');
                $table->unsignedInteger('reorder_level')->default(0);
                $table->boolean('track_freshness')->default(true);
                $table->string('image_url')->nullable();
                $table->unsignedSmallInteger('freshness_days')->default(3);
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('customers')) {
            $schema->create('customers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('name');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('segment')->nullable();
                $table->unsignedInteger('loyalty_points')->default(0);
                $table->string('preferred_channel')->default('whatsapp');
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('shop_settings')) {
            $schema->create('shop_settings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('key');
                $table->text('value')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'key']);
            });
        }

        if (! $schema->hasTable('orders')) {
            $schema->create('orders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('branch_id')->nullable();
                $table->string('order_number')->unique();
                $table->unsignedBigInteger('customer_id')->nullable();
                $table->string('channel')->default('store');
                $table->string('status')->default('pending');
                $table->decimal('subtotal', 10, 2)->default(0);
                $table->decimal('discount_total', 10, 2)->default(0);
                $table->decimal('tax_total', 10, 2)->default(0);
                $table->decimal('grand_total', 10, 2)->default(0);
                $table->string('delivery_slot')->nullable();
                $table->date('delivery_date')->nullable();
                $table->string('delivery_time_slot')->nullable();
                $table->string('recipient_name')->nullable();
                $table->string('recipient_phone', 20)->nullable();
                $table->text('recipient_address')->nullable();
                $table->text('gift_message')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('order_items')) {
            $schema->create('order_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('product_id');
                $table->unsignedInteger('qty')->default(1);
                $table->decimal('unit_price', 10, 2);
                $table->decimal('line_total', 10, 2);
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('stock_ledger')) {
            $schema->create('stock_ledger', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id');
                $table->string('txn_type');
                $table->integer('qty_change');
                $table->integer('balance_after');
                $table->string('reference')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('farmers')) {
            $schema->create('farmers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('name');
                $table->string('phone', 20)->nullable();
                $table->string('email')->nullable();
                $table->text('address')->nullable();
                $table->string('payment_cycle')->default('biweekly');
                $table->string('bank_name')->nullable();
                $table->string('account_number')->nullable();
                $table->string('ifsc_code')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('farmer_deliveries')) {
            $schema->create('farmer_deliveries', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('farmer_id');
                $table->string('flower_type');
                $table->decimal('quantity', 10, 2);
                $table->string('unit')->default('kg');
                $table->decimal('rate_per_unit', 10, 2);
                $table->decimal('total_amount', 10, 2)->default(0);
                $table->date('delivery_date');
                $table->string('quality_grade')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('farmer_payments')) {
            $schema->create('farmer_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('farmer_id');
                $table->decimal('amount', 10, 2);
                $table->date('period_start');
                $table->date('period_end');
                $table->string('status')->default('pending');
                $table->date('payment_date')->nullable();
                $table->string('payment_mode')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('bulk_buyers')) {
            $schema->create('bulk_buyers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('name');
                $table->string('contact_person')->nullable();
                $table->string('phone', 20)->nullable();
                $table->string('email')->nullable();
                $table->text('address')->nullable();
                $table->string('type')->default('company');
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('bulk_sales')) {
            $schema->create('bulk_sales', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('bulk_buyer_id');
                $table->string('invoice_number')->unique();
                $table->date('sale_date');
                $table->decimal('subtotal', 10, 2)->default(0);
                $table->decimal('discount', 10, 2)->default(0);
                $table->decimal('grand_total', 10, 2)->default(0);
                $table->string('status')->default('draft');
                $table->date('due_date')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('bulk_sale_items')) {
            $schema->create('bulk_sale_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bulk_sale_id');
                $table->string('flower_type');
                $table->decimal('quantity', 10, 2);
                $table->string('unit')->default('kg');
                $table->decimal('rate_per_unit', 10, 2);
                $table->decimal('total_amount', 10, 2);
                $table->timestamps();
            });
        }
    }
}
