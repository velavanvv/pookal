<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            $tenantId = $request->query('user_id');
            abort_if(! $tenantId, 422, 'user_id query param required.');
            $branches = Branch::where('user_id', $tenantId)->orderBy('name')->get();
        } else {
            $branches = Branch::where('user_id', $user->shopOwnerId())->orderBy('name')->get();
        }

        return response()->json($branches);
    }

    public function store(Request $request): JsonResponse
    {
        abort_if(! $request->user()->isSuperAdmin(), 403, 'Only super-admin can create branches.');

        $data = $request->validate([
            'user_id'      => ['required', 'exists:users,id'],
            'name'         => ['required', 'string', 'max:120'],
            'address'      => ['nullable', 'string', 'max:300'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'manager_name' => ['nullable', 'string', 'max:120'],
            'is_active'    => ['nullable', 'boolean'],
        ]);

        $branch = Branch::create($data);

        return response()->json(['message' => 'Branch created.', 'branch' => $branch], 201);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        abort_if(! $request->user()->isSuperAdmin(), 403, 'Only super-admin can update branches.');

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
        abort_if(! $request->user()->isSuperAdmin(), 403, 'Only super-admin can delete branches.');

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }
}
