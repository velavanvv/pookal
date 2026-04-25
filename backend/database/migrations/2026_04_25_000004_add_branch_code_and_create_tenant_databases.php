<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('code')->nullable()->after('name');
        });

        Schema::create('tenant_databases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('scope')->default('main');
            $table->string('label');
            $table->string('driver')->default('sqlite');
            $table->string('database');
            $table->string('host')->nullable();
            $table->string('port')->nullable();
            $table->string('username')->nullable();
            $table->text('password')->nullable();
            $table->string('storefront_slug')->nullable();
            $table->boolean('website_enabled')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'scope', 'branch_id']);
            $table->unique('storefront_slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_databases');

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
