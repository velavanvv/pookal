<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'platform';

    public function up(): void
    {
        Schema::connection('platform')->table('users', function (Blueprint $table) {
            $table->string('fcm_token')->nullable()->after('branch_id');
        });
    }

    public function down(): void
    {
        Schema::connection('platform')->table('users', function (Blueprint $table) {
            $table->dropColumn('fcm_token');
        });
    }
};
