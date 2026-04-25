<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController
{
    public function index(Request $request): JsonResponse
    {
        $uid      = $request->user()->shopOwnerId();
        $branches = Branch::where('user_id', $uid)
            ->orderBy('name')
            ->get();

        return response()->json($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $uid  = $request->user()->shopOwnerId();
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:120'],
            'address'      => ['nullable', 'string', 'max:300'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'manager_name' => ['nullable', 'string', 'max:120'],
            'is_active'    => ['nullable', 'boolean'],
        ]);

        $branch = Branch::create([...$data, 'user_id' => $uid]);

        return response()->json(['message' => 'Branch created.', 'branch' => $branch], 201);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $uid = $request->user()->shopOwnerId();
        abort_if($branch->user_id !== $uid, 403, 'Forbidden.');

        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:120'],
            'address'      => ['sometimes', 'nullable', 'string', 'max:300'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'manager_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $branch->update($data);

        return response()->json(['message' => 'Branch updated.', 'branch' => $branch]);
    }

    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        $uid = $request->user()->shopOwnerId();
        abort_if($branch->user_id !== $uid, 403, 'Forbidden.');

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }
}
