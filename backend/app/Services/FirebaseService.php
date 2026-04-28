<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    public function notifyShopOwner(int $ownerId, string $title, string $body, array $data = []): void
    {
        $user = User::find($ownerId);
        if (! $user?->fcm_token) {
            return;
        }

        $serverKey = config('services.fcm.server_key');
        if (! $serverKey) {
            return;
        }

        try {
            Http::withHeaders([
                'Authorization' => "key={$serverKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://fcm.googleapis.com/fcm/send', [
                'to'           => $user->fcm_token,
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                    'icon'  => '/icon-192.png',
                    'click_action' => rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/orders',
                ],
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::error('FCM send failed: ' . $e->getMessage());
        }
    }
}
