<?php

use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->dropUnique(['key']);
            $table->unique(['user_id', 'key']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        $defaultOwner = User::where('role', 'admin')->orderBy('id')->first();
        if ($defaultOwner) {
            ShopSetting::query()->whereNull('user_id')->update(['user_id' => $defaultOwner->id]);
            Product::query()->whereNull('user_id')->update(['user_id' => $defaultOwner->id]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'key']);
            $table->unique('key');
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
