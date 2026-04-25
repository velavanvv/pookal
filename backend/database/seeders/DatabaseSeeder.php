<?php

/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  POOKAL MULTI-TENANT ARCHITECTURE  (Shopify / Square model)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  TWO DATABASE LAYERS
 *  ─────────────────────────────────────────────────────────────────────────────
 *  1. PLATFORM DB  (one shared database — connection: 'platform')
 *     Who manages it: SuperAdmin only
 *     Tables : users, plans, subscriptions, branches, tenant_databases
 *     Models : User, Plan, Subscription, Branch, TenantDatabase  (extend PlatformModel)
 *
 *  2. TENANT DB  (one SQLite/MySQL file per shop — connection: 'tenant')
 *     Who manages it: Shop Admin + Staff
 *     Tables : products, customers, orders, order_items, stock_ledger,
 *              shop_settings, farmers, farmer_deliveries, farmer_payments,
 *              bulk_buyers, bulk_sales, bulk_sale_items
 *     Models : Product, Customer, Order … (extend TenantModel)
 *     Path   : storage/app/tenants/shop-{user_id}/main.sqlite
 *
 *  USER HIERARCHY
 *  ─────────────────────────────────────────────────────────────────────────────
 *  SuperAdmin  (role = 'superadmin')
 *    │  Lives only in platform DB.
 *    │  Can: create/edit/delete shops, branches, plans, subscriptions.
 *    │  Cannot: access any shop's operational data.
 *    │
 *    └─► Shop Admin  (role = 'admin', parent_user_id = null)
 *          │  One per shop. Has a TenantDatabase (the shop's data silo).
 *          │  Can: manage products, customers, orders, staff, vendor, reports.
 *          │  Can: view branch reports and switch branch context.
 *          │
 *          └─► Staff  (role = 'staff', parent_user_id = shop_admin.id)
 *                Created by the Shop Admin (within plan max_users limit).
 *                Inherits parent's TenantDatabase and plan modules.
 *                Cannot: manage users, branches, subscriptions.
 *
 *  BRANCH SYSTEM
 *  ─────────────────────────────────────────────────────────────────────────────
 *  • A Branch is a physical location under a shop.
 *  • Created ONLY by SuperAdmin (via AdminPage → tenant row → Branches button).
 *  • Each branch gets its own TenantDatabase row (scope='branch').
 *  • Orders carry an optional branch_id to tag which location made the sale.
 *  • Shop admin can filter all views (orders, reports) by branch via the
 *    sidebar branch context switcher.
 *  • Staff can be assigned to operate from a specific branch
 *    (future: branch_id on users for branch-level login routing).
 *
 *  REQUEST LIFECYCLE
 *  ─────────────────────────────────────────────────────────────────────────────
 *  1. HTTP request arrives.
 *  2. ResolveTenantContext middleware runs:
 *     • SuperAdmin: no tenant context → only platform models accessible.
 *     • Shop user:  activates main DB → if branch_code header present, activates branch DB.
 *     • Public storefront: activates by slug.
 *  3. TenantModel::getConnectionName() returns 'tenant' (the activated SQLite).
 *  4. All product/customer/order queries hit the shop's own SQLite file.
 *
 *  LOGIN CREDENTIALS (seeded below)
 *  ─────────────────────────────────────────────────────────────────────────────
 *  SuperAdmin   : superadmin@pookal.com  /  super@pookal
 *  Shop Admin   : admin@pookal.com       /  pookal123  (sees all data, can switch branches)
 *  Shop Staff   : staff@pookal.com       /  pookal123  (inherits main shop, can switch)
 *  Branch Login : annanagar@pookal.com   /  pookal123  (LOCKED to Anna Nagar branch DB)
 * ════════════════════════════════════════════════════════════════════════════════
 */

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BulkBuyer;
use App\Models\BulkSale;
use App\Models\BulkSaleItem;
use App\Models\Customer;
use App\Models\Farmer;
use App\Models\FarmerDelivery;
use App\Models\FarmerPayment;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Tenancy\TenantConnectionManager;
use App\Support\Tenancy\TenantProvisioner;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function __construct(
        private readonly TenantProvisioner       $provisioner,
        private readonly TenantConnectionManager $connectionManager,
    ) {}

    public function run(): void
    {
        // ════════════════════════════════════════════════════════════════════════
        //  PHASE 1 — PLATFORM DATABASE
        //  SuperAdmin, Plans, Shop accounts, Subscriptions, Branches
        // ════════════════════════════════════════════════════════════════════════

        // ── SuperAdmin ───────────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'superadmin@pookal.com'],
            [
                'name'      => 'Platform Admin',
                'role'      => 'superadmin',
                'shop_name' => 'Pookal HQ',
                'password'  => Hash::make('super@pookal'),
            ]
        );

        // ── Plans ────────────────────────────────────────────────────────────
        $allModules = ['pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'vendor', 'settings', 'website'];

        $plans = [];
        foreach ([
            [
                'name'          => 'Free Trial',
                'description'   => '14-day free trial — all modules, 1 user.',
                'price_monthly' => 0,
                'price_yearly'  => 0,
                'modules'       => $allModules,
                'max_users'     => 1,
            ],
            [
                'name'          => 'Starter',
                'description'   => 'POS + Inventory + Orders. Ideal for a single-counter shop.',
                'price_monthly' => 999,
                'price_yearly'  => 9_999,
                'modules'       => ['pos', 'inventory', 'orders', 'settings'],
                'max_users'     => 2,
            ],
            [
                'name'          => 'Pro',
                'description'   => 'All modules + CRM + Delivery + Reports + Storefront website.',
                'price_monthly' => 1_999,
                'price_yearly'  => 19_999,
                'modules'       => $allModules,
                'max_users'     => 5,
            ],
            [
                'name'          => 'Enterprise',
                'description'   => 'Multi-branch chain. Unlimited users, all modules, priority support.',
                'price_monthly' => 4_999,
                'price_yearly'  => 49_999,
                'modules'       => $allModules,
                'max_users'     => 999,
            ],
        ] as $p) {
            $plans[$p['name']] = Plan::firstOrCreate(
                ['name' => $p['name']],
                array_merge($p, ['is_active' => true])
            );
        }

        // ── Demo Shop Owner ───────────────────────────────────────────────────
        $shopAdmin = User::firstOrCreate(
            ['email' => 'admin@pookal.com'],
            [
                'name'      => 'Rajan Florist',
                'role'      => 'admin',
                'shop_name' => 'Pookal Flowers',
                'phone'     => '9876543210',
                'password'  => Hash::make('pookal123'),
            ]
        );

        // ── Demo Staff Member ─────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'staff@pookal.com'],
            [
                'name'           => 'Kavitha (Counter Staff)',
                'role'           => 'staff',
                'shop_name'      => 'Pookal Flowers',
                'phone'          => '9876543211',
                'password'       => Hash::make('pookal123'),
                'parent_user_id' => $shopAdmin->id,
            ]
        );

        // ── Subscription (Pro plan, active for 1 year) ────────────────────────
        if (! $shopAdmin->subscriptions()->exists()) {
            Subscription::create([
                'user_id'           => $shopAdmin->id,
                'plan_id'           => $plans['Pro']->id,
                'status'            => 'active',
                'billing_cycle'     => 'yearly',
                'amount_paid'       => 19_999,
                'start_date'        => now(),
                'end_date'          => now()->addYear(),
                'next_renewal_date' => now()->addYear(),
                'auto_renew'        => true,
                'notes'             => 'Initial setup — seeded',
            ]);
        }

        // ── Provision main tenant DB (creates SQLite + schema + basic settings) ─
        //    After this call, TenantContext is activated and all TenantModel
        //    queries go to this shop's SQLite file.
        $mainDb = $this->provisioner->provisionMainDatabase($shopAdmin);

        // Mark website live
        $mainDb->update([
            'storefront_slug' => 'pookal-flowers',
            'website_enabled' => true,
        ]);

        // ── Demo Branch (created on platform, provisioned as branch DB) ───────
        $branch = Branch::firstOrCreate(
            ['user_id' => $shopAdmin->id, 'code' => 'anna-nagar'],
            [
                'name'         => 'Anna Nagar Branch',
                'address'      => '45, Nelson Manickam Rd, Anna Nagar, Chennai 600 040',
                'phone'        => '9876543299',
                'manager_name' => 'Karthik Rajan',
                'is_active'    => true,
            ]
        );
        if (! $branch->databaseConfig) {
            $this->provisioner->provisionBranchDatabase($shopAdmin, $branch);
        }

        // ── Branch Login User — locked to Anna Nagar branch ───────────────────
        User::firstOrCreate(
            ['email' => 'annanagar@pookal.com'],
            [
                'name'           => 'Anna Nagar Counter',
                'role'           => 'staff',
                'shop_name'      => 'Pookal Flowers',
                'phone'          => '9876543212',
                'password'       => Hash::make('pookal123'),
                'parent_user_id' => $shopAdmin->id,
                'branch_id'      => $branch->id,
            ]
        );

        // Re-activate main DB (provisionBranch switches to branch DB)
        $this->connectionManager->activate($mainDb);

        $uid = $shopAdmin->id;

        // ════════════════════════════════════════════════════════════════════════
        //  PHASE 2 — TENANT DATABASE  (inside shop's SQLite after activation)
        //  All TenantModel writes now go to:
        //  storage/app/tenants/shop-{uid}/main.sqlite
        // ════════════════════════════════════════════════════════════════════════

        // ── Shop Settings ─────────────────────────────────────────────────────
        foreach ([
            'shop_name'               => 'Pookal Flowers',
            'shop_tagline'            => 'Fresh Blooms, Delivered with Love',
            'shop_phone'              => '9876543210',
            'shop_email'              => 'hello@pookalflowers.in',
            'shop_address'            => '12, Anna Salai, T. Nagar, Chennai 600 017',
            'gstin'                   => '33AABCU9603R1ZX',
            'tax_rate'                => '5',
            'currency'                => 'INR',
            'currency_symbol'         => 'Rs.',
            'receipt_footer'          => 'Thank you for choosing Pookal Flowers!',
            'website_enabled'         => '1',
            'website_slug'            => 'pookal-flowers',
            'website_theme'           => 'rose-luxury',
            'website_banner_title'    => 'Fresh Flowers, Delivered with Love',
            'website_banner_subtitle' => 'Premium blooms for every occasion — same-day delivery in Chennai',
            'website_intro'           => 'Order online from our curated collection of fresh flowers, bouquets, and gifts.',
            'website_primary_color'   => '#7d294a',
            'website_secondary_color' => '#25543a',
        ] as $key => $value) {
            ShopSetting::updateOrCreate(
                ['user_id' => $uid, 'key' => $key],
                ['value'   => $value]
            );
        }

        // ── Products ──────────────────────────────────────────────────────────
        $productRows = [
            // ── Bouquets & Arrangements
            ['name' => 'Red Rose Bouquet',       'sku' => 'ROSE-RED-001',   'category' => 'Bouquet',      'price' => 799,   'unit' => 'bunch',   'reorder_level' => 10, 'track_freshness' => true,  'freshness_days' => 3, 'stock' => 45],
            ['name' => 'White Lily Bouquet',      'sku' => 'LILY-WHT-001',   'category' => 'Bouquet',      'price' => 1_299, 'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 4, 'stock' => 22],
            ['name' => 'Mixed Flower Basket',     'sku' => 'MIX-BSKT-001',  'category' => 'Arrangement',  'price' => 1_499, 'unit' => 'piece',   'reorder_level' => 5,  'track_freshness' => true,  'freshness_days' => 3, 'stock' => 18],
            ['name' => 'Carnation Bouquet',       'sku' => 'CARN-BCH-001',   'category' => 'Bouquet',      'price' => 699,   'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 5, 'stock' => 19],
            ['name' => 'Tulip Bouquet',           'sku' => 'TULIP-BCH-001',  'category' => 'Bouquet',      'price' => 999,   'unit' => 'bunch',   'reorder_level' => 6,  'track_freshness' => true,  'freshness_days' => 4, 'stock' => 12],
            // ── Garlands & Strings
            ['name' => 'Jasmine String (1 m)',    'sku' => 'JASMINE-STR',    'category' => 'Garland',      'price' => 149,   'unit' => 'metre',   'reorder_level' => 50, 'track_freshness' => true,  'freshness_days' => 1, 'stock' => 180],
            ['name' => 'Marigold Garland',        'sku' => 'MARIGOLD-GRL',   'category' => 'Garland',      'price' => 249,   'unit' => 'piece',   'reorder_level' => 15, 'track_freshness' => true,  'freshness_days' => 2, 'stock' => 60],
            // ── Single Stems & Bunches
            ['name' => 'Orchid Stem',             'sku' => 'ORCHID-STM-001', 'category' => 'Stem',         'price' => 399,   'unit' => 'stem',    'reorder_level' => 12, 'track_freshness' => true,  'freshness_days' => 7, 'stock' => 35],
            ['name' => 'Sunflower Bunch',         'sku' => 'SUNFLWR-BCH',    'category' => 'Bunch',        'price' => 599,   'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 5, 'stock' => 7],
            ['name' => 'Lotus Flower',            'sku' => 'LOTUS-001',      'category' => 'Stem',         'price' => 299,   'unit' => 'stem',    'reorder_level' => 10, 'track_freshness' => true,  'freshness_days' => 2, 'stock' => 4],
            ['name' => 'Chrysanthemum Bunch',     'sku' => 'CHRYS-BCH',      'category' => 'Bunch',        'price' => 449,   'unit' => 'bunch',   'reorder_level' => 10, 'track_freshness' => true,  'freshness_days' => 4, 'stock' => 28],
            ['name' => 'Gerbera Bunch',           'sku' => 'GERB-BCH-001',   'category' => 'Bunch',        'price' => 499,   'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 5, 'stock' => 31],
            ['name' => "Baby's Breath",           'sku' => 'BABYBTH-001',    'category' => 'Bunch',        'price' => 349,   'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 4, 'stock' => 3],
            ['name' => 'Lavender Bundle',         'sku' => 'LAVNDR-001',     'category' => 'Bunch',        'price' => 549,   'unit' => 'bundle',  'reorder_level' => 6,  'track_freshness' => true,  'freshness_days' => 6, 'stock' => 14],
            // ── Loose Flowers
            ['name' => 'Rose Petals (100 g)',     'sku' => 'ROSE-PETALS',    'category' => 'Loose Flower', 'price' => 199,   'unit' => '100g',    'reorder_level' => 20, 'track_freshness' => true,  'freshness_days' => 2, 'stock' => 85],
            // ── Supplies & Packaging
            ['name' => 'Gold Wrapping Paper',     'sku' => 'WRAP-GOLD-01',   'category' => 'Supply',       'price' => 49,    'unit' => 'sheet',   'reorder_level' => 30, 'track_freshness' => false, 'freshness_days' => 0, 'stock' => 120],
            ['name' => 'Red Ribbon Bundle',       'sku' => 'RIBBON-RED',     'category' => 'Supply',       'price' => 89,    'unit' => 'roll',    'reorder_level' => 15, 'track_freshness' => false, 'freshness_days' => 0, 'stock' => 42],
            ['name' => 'Flower Box (Medium)',     'sku' => 'BOX-MED-001',    'category' => 'Supply',       'price' => 129,   'unit' => 'piece',   'reorder_level' => 20, 'track_freshness' => false, 'freshness_days' => 0, 'stock' => 55],
            // ── Accessories
            ['name' => 'Glass Vase (Medium)',     'sku' => 'VASE-GLASS-M',   'category' => 'Accessory',    'price' => 599,   'unit' => 'piece',   'reorder_level' => 5,  'track_freshness' => false, 'freshness_days' => 0, 'stock' => 18],
            ['name' => 'Flower Food Sachet',      'sku' => 'FOOD-SACHET',    'category' => 'Supply',       'price' => 29,    'unit' => 'sachet',  'reorder_level' => 40, 'track_freshness' => false, 'freshness_days' => 0, 'stock' => 200],
        ];

        $products = [];
        foreach ($productRows as $row) {
            $stock = $row['stock'];
            unset($row['stock']);
            $product = Product::updateOrCreate(
                ['sku' => $row['sku']],
                array_merge($row, ['user_id' => $uid])
            );
            // Opening stock entry (idempotent by reference)
            StockLedger::firstOrCreate(
                ['product_id' => $product->id, 'reference' => 'INITIAL-STOCK'],
                [
                    'txn_type'     => 'receive',
                    'qty_change'   => $stock,
                    'balance_after'=> $stock,
                    'notes'        => 'Opening stock (seeded)',
                ]
            );
            $products[] = $product;
        }

        // ── Customers (end-customers of the shop, NOT Pookal clients) ─────────
        $customerRows = [
            ['name' => 'Anitha Kumar',     'phone' => '9876543210', 'email' => 'anitha@example.com',     'segment' => 'vip',     'loyalty_points' => 240, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Saravanan Muthu',  'phone' => '9765432109', 'email' => 'saravanan@example.com',  'segment' => 'regular', 'loyalty_points' => 125, 'preferred_channel' => 'sms'],
            ['name' => 'Meena Rajan',      'phone' => '9654321098', 'email' => 'meena@example.com',      'segment' => 'vip',     'loyalty_points' => 580, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Rajesh Venkat',    'phone' => '9543210987', 'email' => 'rajesh@example.com',     'segment' => 'regular', 'loyalty_points' => 45,  'preferred_channel' => 'sms'],
            ['name' => 'Priya Sundar',     'phone' => '9432109876', 'email' => 'priya@example.com',      'segment' => 'event',   'loyalty_points' => 320, 'preferred_channel' => 'email'],
            ['name' => 'Karthik Selvam',   'phone' => '9321098765', 'email' => 'karthik@example.com',    'segment' => 'regular', 'loyalty_points' => 90,  'preferred_channel' => 'sms'],
            ['name' => 'Divya Mohan',      'phone' => '9210987654', 'email' => 'divya@example.com',      'segment' => 'vip',     'loyalty_points' => 710, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Suresh Babu',      'phone' => '9109876543', 'email' => 'suresh@example.com',     'segment' => 'regular', 'loyalty_points' => 30,  'preferred_channel' => 'sms'],
            ['name' => 'Lakshmi Nair',     'phone' => '9098765432', 'email' => 'lakshmi@example.com',    'segment' => 'event',   'loyalty_points' => 450, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Vijay Kumar',      'phone' => '8987654321', 'email' => 'vijay@example.com',      'segment' => 'regular', 'loyalty_points' => 15,  'preferred_channel' => 'sms'],
            ['name' => 'Padmini Devi',     'phone' => '8876543210', 'email' => 'padmini@example.com',    'segment' => 'vip',     'loyalty_points' => 890, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Arun Shankar',     'phone' => '8765432109', 'email' => 'arun@example.com',       'segment' => 'regular', 'loyalty_points' => 60,  'preferred_channel' => 'sms'],
            ['name' => 'Geetha Krishnan',  'phone' => '8654321098', 'email' => 'geetha@example.com',     'segment' => 'event',   'loyalty_points' => 275, 'preferred_channel' => 'email'],
            ['name' => 'Murugan Pillai',   'phone' => '8543210987', 'email' => 'murugan@example.com',    'segment' => 'regular', 'loyalty_points' => 10,  'preferred_channel' => 'sms'],
            ['name' => 'Nithya Balaji',    'phone' => '8432109876', 'email' => 'nithya@example.com',     'segment' => 'vip',     'loyalty_points' => 430, 'preferred_channel' => 'whatsapp'],
        ];

        foreach ($customerRows as $row) {
            Customer::updateOrCreate(
                ['user_id' => $uid, 'email' => $row['email']],
                array_merge($row, ['user_id' => $uid])
            );
        }

        $customerIds = Customer::where('user_id', $uid)->pluck('id')->toArray();

        // ── Orders (30 demo orders across channels) ────────────────────────────
        if (Order::where('user_id', $uid)->count() === 0) {
            $statusPool = array_merge(
                array_fill(0, 6,  'pending'),
                array_fill(0, 6,  'packed'),
                array_fill(0, 8,  'dispatched'),
                array_fill(0, 10, 'delivered')
            );
            shuffle($statusPool);

            $channels = ['store', 'online', 'whatsapp'];
            $slots    = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
            $orderNum = 1001;

            for ($i = 0; $i < 30; $i++) {
                $numItems = rand(1, 3);
                $indices  = array_keys($products);
                shuffle($indices);
                $selected = array_slice($indices, 0, $numItems);

                $subtotal  = 0;
                $lineItems = [];
                foreach ($selected as $idx) {
                    $p    = $products[$idx];
                    $qty  = rand(1, 3);
                    $line = round($qty * $p->price, 2);
                    $subtotal   += $line;
                    $lineItems[] = ['product' => $p, 'qty' => $qty, 'unit_price' => $p->price, 'line_total' => $line];
                }

                $taxTotal   = round($subtotal * 0.05, 2);
                $grandTotal = round($subtotal + $taxTotal, 2);
                $daysAgo    = rand(0, 60);

                $order = Order::create([
                    'user_id'        => $uid,
                    'order_number'   => 'ORD-' . $orderNum++,
                    'customer_id'    => $customerIds[array_rand($customerIds)],
                    'channel'        => $channels[array_rand($channels)],
                    'status'         => $statusPool[$i],
                    'subtotal'       => $subtotal,
                    'discount_total' => 0,
                    'tax_total'      => $taxTotal,
                    'grand_total'    => $grandTotal,
                    'delivery_date'  => Carbon::today()->subDays($daysAgo)->toDateString(),
                    'delivery_time_slot' => $slots[array_rand($slots)],
                    'created_at'     => Carbon::now()->subDays($daysAgo),
                    'updated_at'     => Carbon::now()->subDays($daysAgo),
                ]);

                foreach ($lineItems as $li) {
                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $li['product']->id,
                        'qty'        => $li['qty'],
                        'unit_price' => $li['unit_price'],
                        'line_total' => $li['line_total'],
                    ]);
                }
            }
        }

        // ── Farmers (vendor / flower suppliers) ───────────────────────────────
        if (Farmer::where('user_id', $uid)->count() === 0) {
            $farmerRows = [
                [
                    'name'          => 'Murugan Farms',
                    'phone'         => '9988776655',
                    'email'         => 'murugan@farms.com',
                    'address'       => 'Hosur Road, Krishnagiri District',
                    'payment_cycle' => 'biweekly',
                    'bank_name'     => 'Canara Bank',
                    'account_number'=> '111122223333',
                    'ifsc_code'     => 'CNRB0001234',
                    'is_active'     => true,
                ],
                [
                    'name'          => 'Selvam Rose Garden',
                    'phone'         => '9977665544',
                    'email'         => 'selvam@rosegarden.in',
                    'address'       => 'Ooty Road, Coimbatore',
                    'payment_cycle' => 'weekly',
                    'bank_name'     => 'SBI',
                    'account_number'=> '444455556666',
                    'ifsc_code'     => 'SBIN0004321',
                    'is_active'     => true,
                ],
                [
                    'name'          => 'Kamala Lily Nursery',
                    'phone'         => '9966554433',
                    'email'         => null,
                    'address'       => 'Palani Road, Dindigul',
                    'payment_cycle' => 'monthly',
                    'bank_name'     => null,
                    'account_number'=> null,
                    'ifsc_code'     => null,
                    'is_active'     => true,
                ],
            ];

            foreach ($farmerRows as $fr) {
                $farmer = Farmer::create(array_merge($fr, ['user_id' => $uid]));

                // 3 deliveries per farmer
                foreach (range(1, 3) as $d) {
                    $qty   = rand(10, 60);
                    $rate  = rand(20, 80);
                    $total = round($qty * $rate, 2);
                    FarmerDelivery::create([
                        'user_id'       => $uid,
                        'farmer_id'     => $farmer->id,
                        'flower_type'   => $d === 1 ? 'Rose' : ($d === 2 ? 'Lily' : 'Marigold'),
                        'quantity'      => $qty,
                        'unit'          => 'kg',
                        'rate_per_unit' => $rate,
                        'total_amount'  => $total,
                        'delivery_date' => Carbon::today()->subDays(rand(1, 30))->toDateString(),
                        'quality_grade' => ['A', 'B', 'A'][array_rand(['A', 'B', 'A'])],
                    ]);
                }

                // 1 payment per farmer
                FarmerPayment::create([
                    'user_id'      => $uid,
                    'farmer_id'    => $farmer->id,
                    'amount'       => rand(2000, 8000),
                    'period_start' => Carbon::today()->subDays(14)->toDateString(),
                    'period_end'   => Carbon::today()->toDateString(),
                    'status'       => 'paid',
                    'payment_date' => Carbon::today()->toDateString(),
                    'payment_mode' => 'bank',
                ]);
            }
        }

        // ── Bulk Buyers + Sales ────────────────────────────────────────────────
        if (BulkBuyer::where('user_id', $uid)->count() === 0) {
            $buyerRows = [
                ['name' => 'Chennai Events Co.',      'contact_person' => 'Ravi Kumar',  'phone' => '9876012345', 'type' => 'company', 'is_active' => true],
                ['name' => 'Koyambedu Flower Market', 'contact_person' => 'Market Agent','phone' => '9865012345', 'type' => 'market',  'is_active' => true],
                ['name' => 'Taj Hotel Catering',      'contact_person' => 'Sunita',      'phone' => '9854012345', 'type' => 'hotel',   'is_active' => true],
            ];

            $invoiceNum = 2001;
            foreach ($buyerRows as $br) {
                $buyer = BulkBuyer::create(array_merge($br, ['user_id' => $uid]));

                // 2 sales per buyer
                foreach (range(1, 2) as $s) {
                    $subtotal = rand(3000, 15000);
                    $discount = round($subtotal * 0.05, 2);
                    $grand    = round($subtotal - $discount, 2);

                    $sale = BulkSale::create([
                        'user_id'        => $uid,
                        'bulk_buyer_id'  => $buyer->id,
                        'invoice_number' => 'INV-' . $invoiceNum++,
                        'sale_date'      => Carbon::today()->subDays(rand(1, 30))->toDateString(),
                        'subtotal'       => $subtotal,
                        'discount'       => $discount,
                        'grand_total'    => $grand,
                        'status'         => $s === 1 ? 'paid' : 'confirmed',
                        'due_date'       => Carbon::today()->addDays(7)->toDateString(),
                    ]);

                    foreach (['Rose', 'Marigold', 'Lily'] as $flower) {
                        $qty  = rand(5, 30);
                        $rate = rand(15, 60);
                        BulkSaleItem::create([
                            'bulk_sale_id' => $sale->id,
                            'flower_type'  => $flower,
                            'quantity'     => $qty,
                            'unit'         => 'kg',
                            'rate_per_unit'=> $rate,
                            'total_amount' => round($qty * $rate, 2),
                        ]);
                    }
                }
            }
        }

        $this->command->info('✓ Platform: superadmin, plans, shop admin, staff, subscription, branch seeded.');
        $this->command->info('✓ Tenant DB: settings, 20 products, 15 customers, 30 orders, 3 farmers, 3 bulk buyers seeded.');
        $this->command->info('');
        $this->command->info('  Login credentials:');
        $this->command->info('  SuperAdmin     superadmin@pookal.com   /  super@pookal');
        $this->command->info('  Shop Admin     admin@pookal.com        /  pookal123');
        $this->command->info('  Shop Staff     staff@pookal.com        /  pookal123');
        $this->command->info('  Branch Login   annanagar@pookal.com    /  pookal123  (Anna Nagar branch — locked)');
    }
}
