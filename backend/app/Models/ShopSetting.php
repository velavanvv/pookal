<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopSetting extends Model
{
    protected $fillable = ['user_id', 'key', 'value'];

    public static function get(string $key, mixed $default = null, ?int $userId = null): mixed
    {
        $query = static::query()->where('key', $key);

        if ($userId) {
            $scoped = (clone $query)->where('user_id', $userId)->value('value');
            if ($scoped !== null) {
                return $scoped;
            }
        }

        return $query->whereNull('user_id')->value('value') ?? $default;
    }

    public static function set(string $key, mixed $value, ?int $userId = null): void
    {
        static::updateOrCreate(
            ['user_id' => $userId, 'key' => $key],
            ['value' => $value]
        );
    }

    public static function allAsMap(?int $userId = null): array
    {
        $global = static::whereNull('user_id')->pluck('value', 'key')->toArray();

        if (! $userId) {
            return $global;
        }

        return array_merge($global, static::where('user_id', $userId)->pluck('value', 'key')->toArray());
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
