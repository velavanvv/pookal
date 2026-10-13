<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class AiServiceClient
{
    protected string $baseUrl;
    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ai_service.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001'));
        $this->timeout = (int) config('services.ai_service.timeout', 45);
    }

    /**
     * Check if the Python AI service is reachable and healthy
     */
    public function health(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/v1/health");
            if ($response->successful()) {
                return $response->json();
            }
            return [
                'success' => false,
                'message' => 'AI Service responded with status ' . $response->status(),
                'error' => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::warning("AI Service health check failed: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI Microservice is currently offline or unreachable',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Forward invoice image to Python AI Vision service for structured extraction
     */
    public function parseInvoice(UploadedFile $file): array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName(), [
                    'Content-Type' => $file->getMimeType() ?: 'image/jpeg',
                ])
                ->post("{$this->baseUrl}/api/v1/invoice/parse");

            if ($response->successful()) {
                return $response->json();
            }

            Log::error("AI Invoice parse error: " . $response->body());
            return [
                'success' => false,
                'message' => 'Failed to parse invoice via AI service',
                'error' => $response->json()['detail'] ?? $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error("AI Service invoice parse exception: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI Vision engine exception',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Chat with merchant AI Copilot
     */
    public function chatWithCopilot(string $prompt, array $context = [], array $history = [], ?string $model = null, ?array $fallbacks = null): array
    {
        try {
            $payload = [
                'prompt' => $prompt,
                'context' => $context,
                'history' => $history,
            ];
            if ($model) {
                $payload['model'] = $model;
            }
            if ($fallbacks) {
                $payload['fallbacks'] = $fallbacks;
            }

            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/v1/copilot/chat", $payload);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error("AI Copilot error: " . $response->body());
            return [
                'success' => false,
                'message' => 'AI Copilot inference error',
                'error' => $response->json()['detail'] ?? $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error("AI Service copilot exception: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'AI Copilot engine exception',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * List available models accessible through OpenRouter
     */
    public function listModels(bool $freeOnly = false, ?string $family = null, ?string $modality = null): array
    {
        try {
            $params = [];
            if ($freeOnly) $params['free_only'] = 'true';
            if ($family) $params['family'] = $family;
            if ($modality) $params['modality'] = $modality;

            $response = Http::timeout(10)->get("{$this->baseUrl}/api/v1/models", $params);
            if ($response->successful()) {
                return $response->json();
            }
            return [
                'success' => false,
                'message' => 'Failed to retrieve models catalog',
                'error' => $response->body(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'AI models service unreachable',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get active model routing and fallback chains
     */
    public function routes(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/v1/models/routes");
            if ($response->successful()) {
                return $response->json();
            }
            return [
                'success' => false,
                'message' => 'Failed to fetch model routes',
                'error' => $response->body(),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'AI routes service unreachable',
                'error' => $e->getMessage(),
            ];
        }
    }
}
