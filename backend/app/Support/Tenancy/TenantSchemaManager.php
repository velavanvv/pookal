<?php

namespace App\Support\Tenancy;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class TenantSchemaManager
{
    public function ensureSchema(string $connection = 'tenant'): void
    {
        $schema = Schema::connection($connection);

        $this->upgradeSchema($connection);

        if (! $schema->hasTable('products')) {
            $schema->create('products', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('name');
                $table->string('sku')->unique();
                $table->string('barcode')->nullable()->index();
                $table->string('category');
                $table->decimal('price', 10, 2);
                $table->string('pricing_mode')->default('fixed'); // fixed | weight
                $table->string('unit')->default('piece');
                $table->unsignedInteger('reorder_level')->default(0);
                $table->boolean('track_expiry')->default(false);
                $table->string('image_url')->nullable();
                $table->unsignedSmallInteger('shelf_life_days')->default(3);
                $table->string('tax_category')->default('standard');
                $table->json('attributes')->nullable();
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
                $table->unsignedBigInteger('table_id')->nullable();
                $table->string('channel')->default('store');
                $table->string('order_type')->default('in_store'); // in_store | dine_in | takeaway | delivery
                $table->string('status')->default('pending');
                $table->decimal('subtotal', 10, 2)->default(0);
                $table->decimal('discount_total', 10, 2)->default(0);
                $table->decimal('tax_total', 10, 2)->default(0);
                $table->decimal('grand_total', 10, 2)->default(0);
                $table->string('payment_method')->default('cash'); // cash | card | upi | split
                $table->json('payments')->nullable();
                $table->string('delivery_slot')->nullable();
                $table->date('delivery_date')->nullable();
                $table->string('delivery_time_slot')->nullable();
                $table->string('recipient_name')->nullable();
                $table->string('recipient_phone', 20)->nullable();
                $table->text('recipient_address')->nullable();
                $table->string('delivery_area')->nullable();
                $table->decimal('customer_latitude', 10, 7)->nullable();
                $table->decimal('customer_longitude', 10, 7)->nullable();
                $table->string('location_source')->nullable();
                $table->timestamp('location_captured_at')->nullable();
                $table->text('gift_message')->nullable();
                $table->json('metadata')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('order_items')) {
            $schema->create('order_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('product_id');
                $table->unsignedBigInteger('table_id')->nullable();
                $table->unsignedInteger('qty')->default(1);
                $table->decimal('weight', 10, 3)->nullable();
                $table->decimal('unit_price', 10, 2);
                $table->decimal('line_total', 10, 2);
                $table->json('modifiers')->nullable();
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
                $table->string('batch_code')->nullable();
                $table->date('expiry_date')->nullable();
                $table->string('reason')->nullable(); // sale | purchase | wastage | spoilage | adjustment | return
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
                $table->string('item_name');
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
                $table->string('item_name');
                $table->decimal('quantity', 10, 2);
                $table->string('unit')->default('kg');
                $table->decimal('rate_per_unit', 10, 2);
                $table->decimal('total_amount', 10, 2);
                $table->timestamps();
            });
        }

        // ── Restaurant Tables ────────────────────────────────────────────────
        if (! $schema->hasTable('restaurant_tables')) {
            $schema->create('restaurant_tables', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('branch_id')->nullable();
                $table->string('name');
                $table->unsignedSmallInteger('capacity')->default(4);
                $table->string('status')->default('vacant'); // vacant | occupied | reserved | billing
                $table->string('section')->nullable(); // Ground, Rooftop, Patio, AC Hall
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // ── Kitchen Order Tickets (KOT) ──────────────────────────────────────
        if (! $schema->hasTable('kitchen_tickets')) {
            $schema->create('kitchen_tickets', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('order_id');
                $table->unsignedBigInteger('table_id')->nullable();
                $table->string('ticket_number');
                $table->string('status')->default('pending'); // pending | preparing | ready | served | cancelled
                $table->string('station')->default('kitchen'); // kitchen | bar | dessert | tandoor
                $table->json('items');
                $table->timestamp('printed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // ── Product Modifiers ────────────────────────────────────────────────
        if (! $schema->hasTable('product_modifiers')) {
            $schema->create('product_modifiers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('product_id');
                $table->string('name');
                $table->decimal('price_delta', 10, 2)->default(0);
                $table->boolean('is_required')->default(false);
                $table->json('options')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Migrate legacy florist-specific columns on existing tenant databases.
     */
    public function upgradeSchema(string $connection = 'tenant'): void
    {
        $schema = Schema::connection($connection);

        if ($schema->hasTable('products')) {
            if ($schema->hasColumn('products', 'track_freshness') && ! $schema->hasColumn('products', 'track_expiry')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->boolean('track_expiry')->default(false)->after('reorder_level');
                });
                \DB::connection($connection)->statement('UPDATE products SET track_expiry = track_freshness');
            }

            if ($schema->hasColumn('products', 'freshness_days') && ! $schema->hasColumn('products', 'shelf_life_days')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->unsignedSmallInteger('shelf_life_days')->default(3)->after('image_url');
                });
                \DB::connection($connection)->statement('UPDATE products SET shelf_life_days = freshness_days');
            }

            if (! $schema->hasColumn('products', 'barcode')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->string('barcode')->nullable()->after('sku');
                });
            }

            if (! $schema->hasColumn('products', 'pricing_mode')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->string('pricing_mode')->default('fixed')->after('price');
                });
            }

            if (! $schema->hasColumn('products', 'tax_category')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->string('tax_category')->default('standard')->after('shelf_life_days');
                });
            }

            if (! $schema->hasColumn('products', 'attributes')) {
                $schema->table('products', function (Blueprint $table) {
                    $table->json('attributes')->nullable()->after('tax_category');
                });
            }
        }

        if ($schema->hasTable('orders')) {
            if (! $schema->hasColumn('orders', 'order_type')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->string('order_type')->default('in_store')->after('channel');
                });
            }

            if (! $schema->hasColumn('orders', 'table_id')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->unsignedBigInteger('table_id')->nullable()->after('customer_id');
                });
            }

            if (! $schema->hasColumn('orders', 'payment_method')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->string('payment_method')->default('cash')->after('grand_total');
                });
            }

            if (! $schema->hasColumn('orders', 'payments')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->json('payments')->nullable()->after('payment_method');
                });
            }

            if (! $schema->hasColumn('orders', 'delivery_area')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->string('delivery_area')->nullable()->after('recipient_address');
                });
            }

            if (! $schema->hasColumn('orders', 'customer_latitude')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->decimal('customer_latitude', 10, 7)->nullable()->after('delivery_area');
                });
            }

            if (! $schema->hasColumn('orders', 'customer_longitude')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->decimal('customer_longitude', 10, 7)->nullable()->after('customer_latitude');
                });
            }

            if (! $schema->hasColumn('orders', 'location_source')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->string('location_source')->nullable()->after('customer_longitude');
                });
            }

            if (! $schema->hasColumn('orders', 'location_captured_at')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->timestamp('location_captured_at')->nullable()->after('location_source');
                });
            }

            if (! $schema->hasColumn('orders', 'metadata')) {
                $schema->table('orders', function (Blueprint $table) {
                    $table->json('metadata')->nullable()->after('gift_message');
                });
            }
        }

        if ($schema->hasTable('order_items')) {
            if (! $schema->hasColumn('order_items', 'table_id')) {
                $schema->table('order_items', function (Blueprint $table) {
                    $table->unsignedBigInteger('table_id')->nullable()->after('product_id');
                });
            }

            if (! $schema->hasColumn('order_items', 'weight')) {
                $schema->table('order_items', function (Blueprint $table) {
                    $table->decimal('weight', 10, 3)->nullable()->after('qty');
                });
            }

            if (! $schema->hasColumn('order_items', 'modifiers')) {
                $schema->table('order_items', function (Blueprint $table) {
                    $table->json('modifiers')->nullable()->after('line_total');
                });
            }
        }

        if ($schema->hasTable('stock_ledger')) {
            if (! $schema->hasColumn('stock_ledger', 'batch_code')) {
                $schema->table('stock_ledger', function (Blueprint $table) {
                    $table->string('batch_code')->nullable()->after('balance_after');
                });
            }

            if (! $schema->hasColumn('stock_ledger', 'expiry_date')) {
                $schema->table('stock_ledger', function (Blueprint $table) {
                    $table->date('expiry_date')->nullable()->after('batch_code');
                });
            }

            if (! $schema->hasColumn('stock_ledger', 'reason')) {
                $schema->table('stock_ledger', function (Blueprint $table) {
                    $table->string('reason')->nullable()->after('expiry_date');
                });
            }
        }

        if ($schema->hasTable('farmer_deliveries') && $schema->hasColumn('farmer_deliveries', 'flower_type') && ! $schema->hasColumn('farmer_deliveries', 'item_name')) {
            $schema->table('farmer_deliveries', function (Blueprint $table) {
                $table->string('item_name')->nullable()->after('farmer_id');
            });
            \DB::connection($connection)->statement('UPDATE farmer_deliveries SET item_name = flower_type WHERE item_name IS NULL');
        }

        if ($schema->hasTable('bulk_sale_items') && $schema->hasColumn('bulk_sale_items', 'flower_type') && ! $schema->hasColumn('bulk_sale_items', 'item_name')) {
            $schema->table('bulk_sale_items', function (Blueprint $table) {
                $table->string('item_name')->nullable()->after('bulk_sale_id');
            });
            \DB::connection($connection)->statement('UPDATE bulk_sale_items SET item_name = flower_type WHERE item_name IS NULL');
        }
    }

    /**
     * Write both canonical and legacy column names when either exists.
     *
     * @param  array<string, string>  $map  canonical => legacy
     */
    public static function syncLegacyColumns(string $table, array $data, array $map, string $connection = 'tenant'): array
    {
        $schema = Schema::connection($connection);

        foreach ($map as $canonical => $legacy) {
            $value = $data[$canonical] ?? $data[$legacy] ?? null;

            if ($schema->hasColumn($table, $canonical)) {
                if ($value !== null) {
                    $data[$canonical] = $value;
                }
            } else {
                unset($data[$canonical]);
            }

            if ($schema->hasColumn($table, $legacy)) {
                if ($value !== null) {
                    $data[$legacy] = $value;
                }
            } else {
                unset($data[$legacy]);
            }
        }

        return $data;
    }
}
