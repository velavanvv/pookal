<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\User;
use App\Support\Tenancy\TenantProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BranchController
{
    public function __construct(
        private readonly TenantProvisioner $provisioner,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            $tenantId = $request->query('user_id');
            abort_if(! $tenantId, 422, 'user_id query param required.');
            $branches = Branch::where('user_id', $tenantId)->with('databaseConfig', 'plan')->orderBy('name')->get();
        } else {
            $branches = Branch::where('user_id', $user->shopOwnerId())->with('databaseConfig', 'plan')->orderBy('name')->get();
        }

        return response()->json($branches->map(fn (Branch $branch) => $this->formatBranch($branch)));
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        $data = $request->validate([
            'user_id'      => ['nullable', 'exists:platform.users,id'],
            'plan_id'      => ['nullable', 'exists:platform.plans,id'],
            'name'         => ['required', 'string', 'max:120'],
            'address'      => ['nullable', 'string', 'max:300'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'manager_name' => ['nullable', 'string', 'max:120'],
            'is_active'    => ['nullable', 'boolean'],
        ]);

        $owner = $actor->isSuperAdmin()
            ? User::findOrFail($data['user_id'])
            : ($actor->parentShop ?: $actor);

        $branch = Branch::create([
            'user_id'      => $owner->id,
            'plan_id'      => $data['plan_id'] ?? null,
            'name'         => $data['name'],
            'code'         => $this->nextBranchCode($owner, $data['name']),
            'address'      => $data['address'] ?? null,
            'phone'        => $data['phone'] ?? null,
            'manager_name' => $data['manager_name'] ?? null,
            'is_active'    => $data['is_active'] ?? true,
        ]);

        $this->provisioner->provisionBranchDatabase($owner, $branch);
        $branch->load('databaseConfig', 'plan');

        return response()->json(['message' => 'Branch created.', 'branch' => $this->formatBranch($branch)], 201);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeAccess($request, $branch);

        $data = $request->validate([
            'plan_id'      => ['sometimes', 'nullable', 'exists:platform.plans,id'],
            'name'         => ['sometimes', 'string', 'max:120'],
            'address'      => ['sometimes', 'nullable', 'string', 'max:300'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'manager_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $branch->update($data);
        $branch->load('databaseConfig', 'plan');

        return response()->json(['message' => 'Branch updated.', 'branch' => $this->formatBranch($branch)]);
    }

    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeAccess($request, $branch);

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }

    private function authorizeAccess(Request $request, Branch $branch): void
    {
        $actor = $request->user();

        if ($actor->isSuperAdmin()) {
            return;
        }

        abort_if($branch->user_id !== $actor->shopOwnerId(), 403, 'This branch does not belong to your shop.');
    }

    private function formatBranch(Branch $branch): array
    {
        return array_merge($branch->toArray(), [
            'database' => $branch->databaseConfig ? [
                'label'    => $branch->databaseConfig->label,
                'driver'   => $branch->databaseConfig->driver,
                'database' => $branch->databaseConfig->database,
            ] : null,
            'plan' => $branch->plan ? [
                'id'       => $branch->plan->id,
                'name'     => $branch->plan->name,
                'modules'  => $branch->plan->modules ?? [],
                'max_users'=> $branch->plan->max_users,
            ] : null,
        ]);
    }

    private function nextBranchCode(User $owner, string $name): string
    {
        $base = Str::slug($name);
        $code = $base;
        $i = 1;

        while (Branch::where('user_id', $owner->id)->where('code', $code)->exists()) {
            $code = "{$base}-{$i}";
            $i++;
        }

        return $code;
    }
}
