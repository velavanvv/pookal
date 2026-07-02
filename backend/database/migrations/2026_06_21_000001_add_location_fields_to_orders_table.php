<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_area')->nullable()->after('recipient_address');
            $table->decimal('customer_latitude', 10, 7)->nullable()->after('delivery_area');
            $table->decimal('customer_longitude', 10, 7)->nullable()->after('customer_latitude');
            $table->string('location_source', 30)->nullable()->after('customer_longitude');
            $table->timestamp('location_captured_at')->nullable()->after('location_source');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_area',
                'customer_latitude',
                'customer_longitude',
                'location_source',
                'location_captured_at',
            ]);
        });
    }
};
