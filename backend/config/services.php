<?php

return [
    'fcm' => [
        'server_key' => env('FCM_SERVER_KEY'),
    ],
    'ai_service' => [
        'url' => env('AI_SERVICE_URL', 'http://127.0.0.1:8001'),
        'timeout' => (int) env('AI_SERVICE_TIMEOUT', 45),
    ],
];
