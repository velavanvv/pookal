<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('farmer_deliveries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->foreignId('farmer_id')->constrained()->cascadeOnDelete();
            $table->string('flower_type');
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('kg'); // kg|bunch|stems|boxes
            $table->decimal('rate_per_unit', 10, 2);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->date('delivery_date');
            $table->string('quality_grade')->nullable(); // A|B|C
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('farmer_deliveries'); }
};
