<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->date('delivery_date')->nullable()->after('delivery_slot');
            $table->string('delivery_time_slot')->nullable()->after('delivery_date');
            $table->string('recipient_name')->nullable()->after('delivery_time_slot');
            $table->string('recipient_phone', 20)->nullable()->after('recipient_name');
            $table->text('recipient_address')->nullable()->after('recipient_phone');
            $table->text('gift_message')->nullable()->after('recipient_address');
            $table->text('notes')->nullable()->after('gift_message');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'user_id', 'delivery_date', 'delivery_time_slot',
                'recipient_name', 'recipient_phone', 'recipient_address',
                'gift_message', 'notes',
            ]);
        });
    }
};
