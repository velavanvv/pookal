<?php

namespace App\Http\Controllers\Api;

use App\Models\Plan;
use App\Models\ShopSetting;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController
{
    // ── Guard ────────────────────────────────────────────────────────────────

    private function requireSuperAdmin(Request $request): ?JsonResponse
    {
        if (! $request->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden. Super-admin access required.'], 403);
        }
        return null;
    }

    // ══ PLANS ════════════════════════════════════════════════════════════════

    public function listPlans(): JsonResponse
    {
        return response()->json(Plan::orderBy('price_yearly')->get());
    }

    public function storePlan(Request $request): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:80'],
            'description'   => ['nullable', 'string', 'max:300'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly'  => ['required', 'numeric', 'min:0'],
            'modules'       => ['required', 'array', 'min:1'],
            'modules.*'     => ['string', 'in:pos,inventory,orders,crm,delivery,reports,settings,website'],
            'max_users'     => ['nullable', 'integer', 'min:1'],
            'is_active'     => ['nullable', 'boolean'],
        ]);

        $plan = Plan::create($data);
        return response()->json(['message' => 'Plan created.', 'plan' => $plan], 201);
    }

    public function updatePlan(Request $request, Plan $plan): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $data = $request->validate([
            'name'          => ['sometimes', 'string', 'max:80'],
            'description'   => ['sometimes', 'nullable', 'string', 'max:300'],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_yearly'  => ['sometimes', 'numeric', 'min:0'],
            'modules'       => ['sometimes', 'array', 'min:1'],
            'modules.*'     => ['string', 'in:pos,inventory,orders,crm,delivery,reports,settings,website'],
            'max_users'     => ['sometimes', 'integer', 'min:1'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $plan->update($data);
        return response()->json(['message' => 'Plan updated.', 'plan' => $plan]);
    }

    public function deletePlan(Request $request, Plan $plan): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        if ($plan->subscriptions()->exists()) {
            return response()->json(['message' => 'Cannot delete a plan with active subscriptions.'], 422);
        }
        $plan->delete();
        return response()->json(['message' => 'Plan deleted.']);
    }

    // ══ TENANTS (CUSTOMERS / SHOP OWNERS) ════════════════════════════════════

    public function listTenants(Request $request): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $tenants = User::where('role', '!=', 'superadmin')
            ->with(['subscription.plan', 'parentShop'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($u) => $this->formatTenant($u));

        return response()->json($tenants);
    }

    public function storeTenant(Request $request): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $type = $request->input('type', 'new_shop'); // 'new_shop' | 'staff'

        if ($type === 'staff') {
            // Add a staff user to an existing shop
            $data = $request->validate([
                'name'           => ['required', 'string', 'max:120'],
                'email'          => ['required', 'email', 'unique:users,email'],
                'password'       => ['required', 'string', 'min:8'],
                'phone'          => ['nullable', 'string', 'max:20'],
                'parent_user_id' => ['required', 'exists:users,id'],
            ]);

            $parent = User::findOrFail($data['parent_user_id']);
            if ($parent->isSuperAdmin()) {
                return response()->json(['message' => 'Cannot add staff to super-admin.'], 422);
            }

            $user = User::create([
                'name'           => $data['name'],
                'email'          => $data['email'],
                'password'       => Hash::make($data['password']),
                'role'           => 'staff',
                'phone'          => $data['phone'] ?? null,
                'parent_user_id' => $data['parent_user_id'],
                'shop_name'      => $parent->shop_name,
            ]);

            return response()->json([
                'message' => 'Staff member added to shop.',
                'tenant'  => $this->formatTenant($user->load('subscription.plan')),
            ], 201);
        }

        // Default: create a new independent shop
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:120'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:8'],
            'shop_name'     => ['nullable', 'string', 'max:120'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'role'          => ['sometimes', 'string', 'in:admin,staff'],
            'plan_id'       => ['required', 'exists:plans,id'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            'start_date'    => ['required', 'date'],
            'notes'         => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => $data['role'] ?? 'admin',
            'shop_name' => $data['shop_name'] ?? null,
            'phone'     => $data['phone'] ?? null,
        ]);

        $plan   = Plan::findOrFail($data['plan_id']);
        $start  = Carbon::parse($data['start_date']);
        $end    = $data['billing_cycle'] === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();
        $amount = $data['billing_cycle'] === 'yearly' ? $plan->price_yearly : $plan->price_monthly;

        Subscription::create([
            'user_id'           => $user->id,
            'plan_id'           => $plan->id,
            'status'            => 'active',
            'billing_cycle'     => $data['billing_cycle'],
            'amount_paid'       => $amount,
            'start_date'        => $start,
            'end_date'          => $end,
            'next_renewal_date' => $end,
            'auto_renew'        => true,
            'notes'             => $data['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Shop created.',
            'tenant'  => $this->formatTenant($user->load('subscription.plan')),
        ], 201);
    }

    public function updateTenant(Request $request, User $user): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:120'],
            'shop_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:20'],
            'role'      => ['sometimes', 'in:admin,staff'],
            'password'  => ['sometimes', 'string', 'min:8'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        return response()->json(['message' => 'Customer updated.', 'tenant' => $this->formatTenant($user->load('subscription.plan'))]);
    }

    public function deleteTenant(Request $request, User $user): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Cannot delete super-admin.'], 422);
        }
        $user->delete();
        return response()->json(['message' => 'Customer deleted.']);
    }

    // ══ SUBSCRIPTIONS ════════════════════════════════════════════════════════

    public function renewSubscription(Request $request, User $user): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $data = $request->validate([
            'plan_id'       => ['required', 'exists:plans,id'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            'start_date'    => ['required', 'date'],
            'notes'         => ['nullable', 'string', 'max:500'],
        ]);

        $plan   = Plan::findOrFail($data['plan_id']);
        $start  = Carbon::parse($data['start_date']);
        $end    = $data['billing_cycle'] === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();
        $amount = $data['billing_cycle'] === 'yearly' ? $plan->price_yearly : $plan->price_monthly;

        // Expire any previous active subscription
        $user->subscriptions()->whereIn('status', ['active', 'trial'])->update(['status' => 'expired']);

        $sub = Subscription::create([
            'user_id'           => $user->id,
            'plan_id'           => $plan->id,
            'status'            => 'active',
            'billing_cycle'     => $data['billing_cycle'],
            'amount_paid'       => $amount,
            'start_date'        => $start,
            'end_date'          => $end,
            'next_renewal_date' => $end,
            'auto_renew'        => true,
            'notes'             => $data['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Subscription renewed.',
            'tenant'  => $this->formatTenant($user->load('subscription.plan')),
        ]);
    }

    public function suspendSubscription(Request $request, User $user): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $user->subscriptions()->whereIn('status', ['active', 'trial'])->update(['status' => 'suspended']);
        return response()->json(['message' => 'Subscription suspended.', 'tenant' => $this->formatTenant($user->fresh()->load('subscription.plan'))]);
    }

    public function toggleWebsite(Request $request, User $user): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $data = $request->validate(['enabled' => ['required', 'boolean']]);

        ShopSetting::set('website_enabled', $data['enabled'] ? '1' : '0', $user->id);

        if ($data['enabled']) {
            $existing = ShopSetting::get('website_slug', null, $user->id);
            if (!$existing) {
                $base = Str::slug($user->shop_name ?: $user->name ?: 'store');
                $slug = $base;
                $i    = 1;
                while (ShopSetting::query()->where('key', 'website_slug')->where('value', $slug)->where('user_id', '!=', $user->id)->exists()) {
                    $slug = $base . '-' . $i++;
                }
                ShopSetting::set('website_slug', $slug, $user->id);
            }
        }

        return response()->json([
            'message' => $data['enabled'] ? 'Website enabled.' : 'Website disabled.',
            'tenant'  => $this->formatTenant($user->fresh()->load('subscription.plan')),
        ]);
    }

    public function listSubscriptions(Request $request): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $subs = Subscription::with(['user', 'plan'])
            ->orderBy('end_date', 'asc')
            ->get()
            ->map(fn ($s) => [
                'id'                => $s->id,
                'user_id'           => $s->user_id,
                'user_name'         => $s->user->name,
                'user_email'        => $s->user->email,
                'shop_name'         => $s->user->shop_name,
                'plan_name'         => $s->plan->name,
                'status'            => $s->status,
                'billing_cycle'     => $s->billing_cycle,
                'amount_paid'       => $s->amount_paid,
                'start_date'        => $s->start_date->toDateString(),
                'end_date'          => $s->end_date->toDateString(),
                'next_renewal_date' => $s->next_renewal_date?->toDateString(),
                'days_left'         => $s->daysUntilRenewal(),
                'auto_renew'        => $s->auto_renew,
                'notes'             => $s->notes,
            ]);

        return response()->json($subs);
    }

    // ── Dashboard stats ──────────────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        if ($err = $this->requireSuperAdmin($request)) return $err;

        $total       = User::where('role', '!=', 'superadmin')->count();
        $activeSubs  = Subscription::where('status', 'active')->count();
        $expiringSoon = Subscription::where('status', 'active')
            ->whereBetween('end_date', [now(), now()->addDays(30)])
            ->count();
        $expired     = Subscription::where('status', 'expired')->count();
        $mrr         = Subscription::where('status', 'active')
            ->where('billing_cycle', 'monthly')->sum('amount_paid');
        $arr         = Subscription::where('status', 'active')
            ->where('billing_cycle', 'yearly')->sum('amount_paid');

        return response()->json([
            'total_customers'  => $total,
            'active_subs'      => $activeSubs,
            'expiring_soon'    => $expiringSoon,
            'expired_subs'     => $expired,
            'mrr'              => $mrr,
            'arr'              => $arr,
        ]);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private function formatTenant(User $u): array
    {
        $sub      = $u->subscription;
        $settings = ShopSetting::allAsMap($u->id);
        $webEnabled = filter_var($settings['website_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $webSlug    = $settings['website_slug'] ?? Str::slug($u->shop_name ?: $u->name ?: 'store');
        $webUrl     = rtrim(env('FRONTEND_URL', 'http://127.0.0.1:5173'), '/') . '/store/' . $webSlug;

        return [
            'id'              => $u->id,
            'name'            => $u->name,
            'email'           => $u->email,
            'shop_name'       => $u->shop_name,
            'phone'           => $u->phone,
            'role'            => $u->role,
            'parent_user_id'  => $u->parent_user_id,
            'parent_shop_name'=> $u->parentShop?->shop_name ?? $u->parentShop?->name,
            'created_at'      => $u->created_at,
            'website_enabled' => $webEnabled,
            'website_url'     => $webUrl,
            'website_slug'    => $webSlug,
            'subscription' => $sub ? [
                'id'                => $sub->id,
                'plan_id'           => $sub->plan_id,
                'plan_name'         => $sub->plan?->name,
                'modules'           => $sub->plan?->modules ?? [],
                'status'            => $sub->status,
                'billing_cycle'     => $sub->billing_cycle,
                'amount_paid'       => $sub->amount_paid,
                'start_date'        => $sub->start_date->toDateString(),
                'end_date'          => $sub->end_date->toDateString(),
                'next_renewal_date' => $sub->next_renewal_date?->toDateString(),
                'days_left'         => $sub->daysUntilRenewal(),
                'auto_renew'        => $sub->auto_renew,
            ] : null,
        ];
    }
}
