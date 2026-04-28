<?php

namespace App\Http\Controllers\Api;

use App\Models\DemoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoController
{
    // Public — no auth required
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:120'],
            'email'         => ['required', 'email', 'max:120'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'business_name' => ['required', 'string', 'max:160'],
            'city'          => ['nullable', 'string', 'max:80'],
            'message'       => ['nullable', 'string', 'max:1000'],
        ]);

        DemoRequest::create($data);

        return response()->json(['message' => 'Demo request received. Our team will contact you shortly.'], 201);
    }

    // Superadmin only
    public function index(Request $request): JsonResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403);

        $requests = DemoRequest::latest()->paginate(25);

        return response()->json($requests);
    }

    public function update(Request $request, DemoRequest $demoRequest): JsonResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403);

        $data = $request->validate([
            'status' => ['required', 'in:new,contacted,converted,declined'],
        ]);

        $demoRequest->update($data);

        return response()->json(['message' => 'Status updated.', 'request' => $demoRequest]);
    }
}
