<?php

namespace App\Http\Controllers\Api;

use App\Models\DemoRequest;
use App\Models\User;
use App\Support\Tenancy\TenantProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController
{
    public function __construct(
        private readonly TenantProvisioner $provisioner,
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'role' => 'admin',
            'shop_name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $this->provisioner->provisionMainDatabase($user);

        $token = $user->createToken('pookal-web')->plainTextToken;

        return response()->json([
            'message' => 'Registration completed.',
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('pookal-web')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(
            'subscription.plan',
            'parentShop.subscription.plan',
            'mainDatabase',
            'branch.plan'  // branch users → their branch plan determines module access
        );

        // Module resolution priority:
        // 1. Branch user  → branch.plan (if set), else parent shop subscription plan
        // 2. Staff user   → parent shop subscription plan
        // 3. Shop owner   → own subscription plan
        $branchPlan   = $user->branch?->plan;
        $sub          = $user->subscription ?? $user->parentShop?->subscription;
        $mainDatabase = $user->mainDatabase ?? $user->parentShop?->mainDatabase;

        if ($branchPlan) {
            $subscriptionData = [
                'plan_name' => $branchPlan->name,
                'modules'   => $branchPlan->modules ?? [],
                'max_users' => $branchPlan->max_users,
                'status'    => $sub?->status ?? 'active',
                'end_date'  => $sub?->end_date?->toDateString() ?? now()->addYear()->toDateString(),
                'days_left' => $sub?->daysUntilRenewal() ?? 365,
            ];
        } elseif ($sub) {
            $subscriptionData = [
                'plan_name' => $sub->plan?->name,
                'modules'   => $sub->plan?->modules ?? [],
                'max_users' => $sub->plan?->max_users,
                'status'    => $sub->status,
                'end_date'  => $sub->end_date->toDateString(),
                'days_left' => $sub->daysUntilRenewal(),
            ];
        } else {
            $subscriptionData = null;
        }

        return response()->json([
            'user' => array_merge($user->toArray(), [
                'database' => $mainDatabase ? [
                    'scope'           => $mainDatabase->scope,
                    'label'           => $mainDatabase->label,
                    'storefront_slug' => $mainDatabase->storefront_slug,
                    'website_enabled' => $mainDatabase->website_enabled,
                ] : null,
                'subscription' => $subscriptionData,
                // Branch users are locked to their branch — expose it to the frontend.
                'locked_branch' => $user->branch ? [
                    'id'      => $user->branch->id,
                    'name'    => $user->branch->name,
                    'code'    => $user->branch->code,
                    'plan_id' => $user->branch->plan_id,
                    'modules' => $branchPlan?->modules ?? null,
                ] : null,
                // Superadmin only: unread demo request count for notification badge.
                'unread_demo_requests' => $user->isSuperAdmin()
                    ? DemoRequest::where('status', 'new')->count()
                    : null,
            ]),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
