<?php

use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\ShopStaffController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\CrmController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DemoController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StorefrontController;
use App\Http\Controllers\Api\WebsiteConfigController;
use App\Http\Middleware\ResolveTenantContext;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'app' => 'Pookal']));

// Public — sales demo request (no login required)
Route::post('/demo/request', [DemoController::class, 'store']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(ResolveTenantContext::class)->group(function () {
    Route::get('/storefront/{slug}', [StorefrontController::class, 'show']);
    Route::post('/storefront/{slug}/order', [StorefrontController::class, 'placeOrder']);
});

Route::middleware(['auth:sanctum', ResolveTenantContext::class])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/fcm-token', [AuthController::class, 'saveFcmToken']);

    Route::prefix('dashboard')->group(function () {
        Route::get('/summary', [DashboardController::class, 'summary']);
    });

    Route::prefix('catalog')->group(function () {
        Route::get('/products', [CatalogController::class, 'index']);
        Route::post('/products', [CatalogController::class, 'store']);
    });

    Route::prefix('inventory')->group(function () {
        Route::get('/items', [InventoryController::class, 'index']);
        Route::post('/receive', [InventoryController::class, 'receive']);
        Route::post('/adjust', [InventoryController::class, 'adjust']);
    });

    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::patch('/{order}', [OrderController::class, 'update']);
    });

    Route::prefix('crm')->group(function () {
        Route::get('/customers', [CrmController::class, 'customers']);
        Route::post('/customers', [CrmController::class, 'storeCustomer']);
        Route::get('/campaigns', [CrmController::class, 'campaigns']);
    });

    Route::prefix('delivery')->group(function () {
        Route::get('/board', [DeliveryController::class, 'board']);
        Route::post('/dispatch', [DeliveryController::class, 'dispatch']);
    });

    Route::prefix('reports')->group(function () {
        Route::get('/sales', [ReportController::class, 'sales']);
        Route::get('/inventory', [ReportController::class, 'inventory']);
    });

    Route::prefix('settings')->group(function () {
        Route::get('/', [SettingsController::class, 'index']);
        Route::post('/', [SettingsController::class, 'update']);
    });

    Route::prefix('website-config')->group(function () {
        Route::get('/', [WebsiteConfigController::class, 'index']);
        Route::post('/', [WebsiteConfigController::class, 'update']);
    });

    Route::prefix('catalog')->group(function () {
        Route::patch('/products/{product}', [CatalogController::class, 'update']);
    });

    // ── Vendor / Farmer management ─────────────────────────────────────────
    Route::prefix('vendor')->group(function () {
        Route::get('/stats',                               [VendorController::class, 'stats']);

        Route::get('/farmers',                             [VendorController::class, 'listFarmers']);
        Route::post('/farmers',                            [VendorController::class, 'storeFarmer']);
        Route::patch('/farmers/{farmer}',                  [VendorController::class, 'updateFarmer']);
        Route::delete('/farmers/{farmer}',                 [VendorController::class, 'deleteFarmer']);
        Route::post('/farmers/import',                     [VendorController::class, 'importFarmers']);

        Route::get('/deliveries',                          [VendorController::class, 'listDeliveries']);
        Route::post('/deliveries',                         [VendorController::class, 'storeDelivery']);
        Route::delete('/deliveries/{delivery}',            [VendorController::class, 'deleteDelivery']);

        Route::get('/payments',                            [VendorController::class, 'listPayments']);
        Route::post('/payments/generate',                  [VendorController::class, 'generatePayment']);
        Route::patch('/payments/{payment}/mark-paid',      [VendorController::class, 'markPaymentPaid']);

        Route::get('/buyers',                              [VendorController::class, 'listBuyers']);
        Route::post('/buyers',                             [VendorController::class, 'storeBuyer']);
        Route::patch('/buyers/{buyer}',                    [VendorController::class, 'updateBuyer']);
        Route::delete('/buyers/{buyer}',                   [VendorController::class, 'deleteBuyer']);

        Route::get('/sales',                               [VendorController::class, 'listSales']);
        Route::post('/sales',                              [VendorController::class, 'storeSale']);
        Route::patch('/sales/{sale}/status',               [VendorController::class, 'updateSaleStatus']);
        Route::delete('/sales/{sale}',                     [VendorController::class, 'deleteSale']);
    });

    // ── Branch routes (write: superadmin only; read: any auth user) ───────
    Route::prefix('branches')->group(function () {
        Route::get('/',             [BranchController::class, 'index']);
        Route::post('/',            [BranchController::class, 'store']);
        Route::patch('/{branch}',   [BranchController::class, 'update']);
        Route::delete('/{branch}',  [BranchController::class, 'destroy']);
    });

    // ── Shop staff routes (shop admin manages their own staff) ─────────────
    Route::prefix('shop')->group(function () {
        Route::get('/staff',                          [ShopStaffController::class, 'index']);
        Route::post('/staff',                         [ShopStaffController::class, 'store']);
        Route::post('/staff/branch/{branch}',         [ShopStaffController::class, 'storeBranchStaff']);
        Route::patch('/staff/{staffUser}',            [ShopStaffController::class, 'update']);
        Route::delete('/staff/{staffUser}',           [ShopStaffController::class, 'destroy']);
    });

    // ── Demo requests (superadmin reads/updates) ───────────────────────────
    Route::get('/demo/requests',                        [DemoController::class, 'index']);
    Route::patch('/demo/requests/{demoRequest}',        [DemoController::class, 'update']);

    // ── Super-admin routes ──────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/stats',                             [AdminController::class, 'stats']);

        Route::get('/plans',                            [AdminController::class, 'listPlans']);
        Route::post('/plans',                           [AdminController::class, 'storePlan']);
        Route::patch('/plans/{plan}',                   [AdminController::class, 'updatePlan']);
        Route::delete('/plans/{plan}',                  [AdminController::class, 'deletePlan']);

        Route::get('/tenants',                          [AdminController::class, 'listTenants']);
        Route::post('/tenants',                         [AdminController::class, 'storeTenant']);
        Route::patch('/tenants/{user}',                 [AdminController::class, 'updateTenant']);
        Route::delete('/tenants/{user}',                [AdminController::class, 'deleteTenant']);

        Route::post('/tenants/{user}/renew',            [AdminController::class, 'renewSubscription']);
        Route::post('/tenants/{user}/suspend',          [AdminController::class, 'suspendSubscription']);
        Route::post('/tenants/{user}/website-toggle',   [AdminController::class, 'toggleWebsite']);
        Route::get('/subscriptions',                    [AdminController::class, 'listSubscriptions']);

        // Branch users — created/deleted by superadmin only
        Route::get('/branches/{branch}/users',          [AdminController::class, 'listBranchUsers']);
        Route::post('/branches/{branch}/users',         [AdminController::class, 'storeBranchUser']);
        Route::delete('/branches/{branch}/users/{user}',[AdminController::class, 'destroyBranchUser']);
    });
});
