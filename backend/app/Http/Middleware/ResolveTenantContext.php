<?php

namespace App\Http\Middleware;

use App\Support\Tenancy\TenantConnectionManager;
use App\Support\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    public function __construct(
        private readonly TenantConnectionManager $connections,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        TenantContext::clear();

        if ($request->user() && ! $request->user()->isSuperAdmin()) {
            $user = $request->user();

            if ($user->isBranchUser()) {
                // Branch-assigned login → permanently locked to their branch DB.
                $this->connections->activateForBranchUser($user)
                    ?? $this->connections->activateMainForUser($user);
            } else {
                $branchCode = $request->header('X-Pookal-Branch-Code')
                    ?: $request->query('branch_code')
                    ?: $request->input('branch_code');

                if ($branchCode) {
                    $this->connections->activateBranchForUser($user, $branchCode)
                        ?? $this->connections->activateMainForUser($user);
                } else {
                    $this->connections->activateMainForUser($user);
                }
            }
        } elseif ($slug = $request->route('slug')) {
            $this->connections->activateForStorefrontSlug($slug);
        }

        return $next($request);
    }
}
