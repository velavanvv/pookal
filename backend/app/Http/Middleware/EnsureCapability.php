<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCapability
{
    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $shopProfile = $user->shopProfile ?? $user->parentShop?->shopProfile;
        $branchPlan  = $user->branch?->plan;
        $sub         = $user->subscription ?? $user->parentShop?->subscription;

        $planModules = $branchPlan
            ? $branchPlan->resolvedModules()
            : ($sub?->plan?->resolvedModules() ?? []);

        $legacyAliases = [
            'suppliers' => 'vendor',
            'vendor'    => 'suppliers',
        ];

        $hasProfileCap = $shopProfile && $shopProfile->hasCapability($capability);
        $hasPlanModule = in_array($capability, $planModules, true) ||
            (isset($legacyAliases[$capability]) && in_array($legacyAliases[$capability], $planModules, true));

        // Allow access if enabled in shop profile or subscription plan
        if ($hasProfileCap || $hasPlanModule) {
            return $next($request);
        }

        return response()->json([
            'message' => "The '{$capability}' capability is not enabled for this shop profile or plan.",
            'required_capability' => $capability,
        ], 403);
    }
}
