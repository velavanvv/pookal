<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('bulk_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bulk_sale_id')->constrained()->cascadeOnDelete();
            $table->string('flower_type');
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('kg');
            $table->decimal('rate_per_unit', 10, 2);
            $table->decimal('total_amount', 10, 2);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('bulk_sale_items'); }
};
