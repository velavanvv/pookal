<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('platform')->table('branches', function (Blueprint $table) {
            $table->unsignedBigInteger('plan_id')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::connection('platform')->table('branches', function (Blueprint $table) {
            $table->dropColumn('plan_id');
        });
    }
};
