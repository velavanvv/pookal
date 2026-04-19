<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Replaces the storedAs generated column with a plain decimal column
// so the migration works on SQLite, MySQL, and PostgreSQL equally.
return new class extends Migration {
    public function up(): void {
        Schema::table('farmer_deliveries', function (Blueprint $table) {
            $table->dropColumn('total_amount');
        });
        Schema::table('farmer_deliveries', function (Blueprint $table) {
            $table->decimal('total_amount', 10, 2)->default(0)->after('rate_per_unit');
        });
    }
    public function down(): void {}
};
