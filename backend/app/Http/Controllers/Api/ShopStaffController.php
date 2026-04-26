<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ShopStaffController
{
    private function ownerId(Request $request): int
    {
        return $request->user()->shopOwnerId();
    }

    public function index(Request $request): JsonResponse
    {
        $staff = User::where('parent_user_id', $this->ownerId($request))
            ->with('branch:id,name,code')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'role', 'branch_id', 'created_at']);

        return response()->json($staff);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->isSuperAdmin(), 403, 'Use the admin panel to manage tenants.');
        abort_if($user->isStaff(), 403, 'Staff members cannot create other staff.');

        $ownerId = $this->ownerId($request);
        $owner   = User::with('subscription.plan')->findOrFail($ownerId);
        $maxUsers = $owner->subscription?->plan?->max_users;

        if ($maxUsers !== null) {
            // Only count main-shop users (no branch_id) toward the main plan limit
            $currentCount = 1 + User::where('parent_user_id', $ownerId)->whereNull('branch_id')->count();
            if ($currentCount >= $maxUsers) {
                return response()->json([
                    'message' => "Your plan allows a maximum of {$maxUsers} user(s). Upgrade your plan to add more staff.",
                ], 422);
            }
        }

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone'    => ['nullable', 'string', 'max:20'],
        ]);

        $staff = User::create([
            'name'           => $data['name'],
            'email'          => $data['email'],
            'password'       => Hash::make($data['password']),
            'phone'          => $data['phone'] ?? null,
            'role'           => 'staff',
            'shop_name'      => $owner->shop_name,
            'parent_user_id' => $ownerId,
        ]);

        return response()->json([
            'message' => 'Staff member added.',
            'staff'   => $staff->only(['id', 'name', 'email', 'phone', 'role', 'branch_id', 'created_at']),
        ], 201);
    }

    public function storeBranchStaff(Request $request, Branch $branch): JsonResponse
    {
        $user    = $request->user();
        $ownerId = $this->ownerId($request);
        abort_if($user->isStaff(), 403, 'Staff members cannot create other staff.');
        abort_if($branch->user_id !== $ownerId, 403, 'Branch does not belong to your shop.');

        $branch->load('plan');
        $owner    = User::with('subscription.plan')->findOrFail($ownerId);
        $maxUsers = $branch->plan?->max_users ?? $owner->subscription?->plan?->max_users;

        if ($maxUsers !== null) {
            $currentCount = User::where('parent_user_id', $ownerId)
                ->where('branch_id', $branch->id)
                ->count();
            if ($currentCount >= $maxUsers) {
                return response()->json([
                    'message' => "Branch plan allows a maximum of {$maxUsers} user(s).",
                ], 422);
            }
        }

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone'    => ['nullable', 'string', 'max:20'],
        ]);

        $staff = User::create([
            'name'           => $data['name'],
            'email'          => $data['email'],
            'password'       => Hash::make($data['password']),
            'phone'          => $data['phone'] ?? null,
            'role'           => 'staff',
            'shop_name'      => $branch->name,
            'parent_user_id' => $ownerId,
            'branch_id'      => $branch->id,
        ]);

        return response()->json([
            'message' => 'Branch staff member added.',
            'staff'   => $staff->only(['id', 'name', 'email', 'phone', 'role', 'branch_id', 'created_at']),
        ], 201);
    }

    public function update(Request $request, User $staffUser): JsonResponse
    {
        $ownerId = $this->ownerId($request);
        abort_if($staffUser->parent_user_id !== $ownerId, 403, 'Forbidden.');

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:120'],
            'phone'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $staffUser->update($data);

        return response()->json([
            'message' => 'Staff member updated.',
            'staff'   => $staffUser->only(['id', 'name', 'email', 'phone', 'role', 'branch_id', 'created_at']),
        ]);
    }

    public function destroy(Request $request, User $staffUser): JsonResponse
    {
        $ownerId = $this->ownerId($request);
        abort_if($staffUser->parent_user_id !== $ownerId, 403, 'Forbidden.');

        $staffUser->delete();

        return response()->json(['message' => 'Staff member removed.']);
    }
}
