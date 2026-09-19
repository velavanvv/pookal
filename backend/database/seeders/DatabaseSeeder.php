<?php

/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  POOKAL DEMO SEED
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  LOGIN CREDENTIALS
 *  ─────────────────────────────────────────────────────────────────────────────
 *  superadmin@pookal.com  /  super@pookal   → Platform admin (no shop data)
 *  admin@pookal.com       /  pookal123      → Shop owner — T. Nagar main shop
 *  staff@pookal.com       /  pookal123      → Main-shop staff  (same data as admin)
 *  annanagar@pookal.com   /  pookal123      → Anna Nagar branch ONLY (locked)
 *
 *  WHAT EACH USER SEES
 *  ─────────────────────────────────────────────────────────────────────────────
 *  admin / staff  → main.sqlite  → shop_name "Pookal Flowers"
 *                                  20 products · 15 customers · 30 orders
 *                                  3 farmers · 3 bulk buyers
 *
 *  annanagar      → branch-anna-nagar.sqlite  → shop_name "Anna Nagar Branch"
 *                                               10 products · 8 customers · 15 orders
 *
 *  superadmin     → platform DB only (PostgreSQL/SQLite), no tenant data
 *
 *  ARCHITECTURE
 *  ─────────────────────────────────────────────────────────────────────────────
 *  Platform DB  (connection: 'platform')
 *    Tables: users, plans, subscriptions, branches, tenant_databases
 *    Models: User, Plan, Subscription, Branch, TenantDatabase  (→ PlatformModel)
 *
 *  Tenant DB  (connection: 'tenant' — per-shop SQLite)
 *    Tables: products, customers, orders, order_items, stock_ledger,
 *            shop_settings, farmers, farmer_deliveries, farmer_payments,
 *            bulk_buyers, bulk_sales, bulk_sale_items
 *    Models: Product, Customer, Order, ShopSetting … (→ TenantModel)
 *    Path:   database/tenants/shop-{owner_id}/main.sqlite
 *            database/tenants/shop-{owner_id}/branch-{code}.sqlite
 *
 *  Shop profiles (platform): business_type + capabilities
 *    retail | fresh_perishable | restaurant | service | hybrid
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
use App\Models\KitchenTicket;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\RestaurantTable;
use App\Models\ShopProfile;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Tenancy\TenantConnectionManager;
use App\Support\Tenancy\TenantProvisioner;
use App\Support\Tenancy\TenantSchemaManager;
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
        // ════════════════════════════════════════════════════════════════════
        //  PHASE 1 — PLATFORM DATABASE
        //  All models here use $connection = 'platform' (User, Plan, etc.)
        // ════════════════════════════════════════════════════════════════════

        User::firstOrCreate(
            ['email' => 'superadmin@pookal.com'],
            [
                'name'      => 'Platform Admin',
                'role'      => 'superadmin',
                'shop_name' => 'Pookal HQ',
                'password'  => Hash::make('super@pookal'),
            ]
        );

        $allModules = ['products', 'pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'suppliers', 'settings', 'website'];

        $plans = [];
        foreach ([
            ['name' => 'Free Trial',   'desc' => '7-day free trial — all modules, 1 user.',                               'pm' => 0,     'py' => 0,      'modules' => $allModules,                                    'max' => 1],
            ['name' => 'Starter',      'desc' => 'Products + POS + Inventory + Orders. Ideal for a single-counter shop.', 'pm' => 999,   'py' => 9_999,  'modules' => ['products','pos','inventory','orders','settings'], 'max' => 2],
            ['name' => 'Pro',          'desc' => 'All modules + CRM + Delivery + Reports + Storefront website.',          'pm' => 1_999, 'py' => 19_999, 'modules' => $allModules,                                    'max' => 5],
            ['name' => 'Enterprise',   'desc' => 'Multi-branch chain. Unlimited users, all modules, priority support.',   'pm' => 4_999, 'py' => 49_999, 'modules' => $allModules,                                    'max' => 999],
        ] as $p) {
            $plans[$p['name']] = Plan::firstOrCreate(
                ['name' => $p['name']],
                ['description' => $p['desc'], 'price_monthly' => $p['pm'], 'price_yearly' => $p['py'],
                 'modules' => $p['modules'], 'max_users' => $p['max'], 'is_active' => true]
            );
        }

        // ── Shop owner (T. Nagar main shop) ──────────────────────────────────
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

        ShopProfile::firstOrCreate(
            ['user_id' => $shopAdmin->id],
            [
                'business_type' => 'fresh_perishable',
                'capabilities' => ['suppliers'],
                'settings' => [
                    'default_units' => ['kg', 'bunch', 'piece'],
                    'default_categories' => ['Bouquets', 'Roses', 'Seasonal'],
                    'track_expiry_default' => true,
                ],
            ]
        );

      

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

        // ── Branch record on platform DB ─────────────────────────────────────
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

        // ════════════════════════════════════════════════════════════════════
        //  PHASE 2 — MAIN SHOP TENANT DB
        //  After provisionMainDatabase, all TenantModel writes go to:
        //  database/tenants/shop-{shopAdmin->id}/main.sqlite
        // ════════════════════════════════════════════════════════════════════

        $mainDb = $this->provisioner->provisionMainDatabase($shopAdmin);
        $mainDb->update(['storefront_slug' => 'pookal-flowers', 'website_enabled' => true]);

        $uid = $shopAdmin->id;

        // ── Main shop settings ────────────────────────────────────────────────
        $this->seedSettings($uid, [
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
        ]);

        // ── Main shop products (Pookal Tamil Floral Catalog) ──────────────────
        $mainProducts = $this->seedProducts($uid, [
            [
                'name' => 'Madurai Jasmine (மதுரை மல்லிகை)',
                'sku' => 'JASMINE-MADURAI-01',
                'category' => 'Loose Flower',
                'price' => 180,
                'unit' => 'metre',
                'reorder_level' => 30,
                'track_freshness' => true,
                'freshness_days' => 1,
                'stock' => 120,
                'image_url' => 'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'name' => 'Red Rose Garland (பன்னீர் ரோஜா மாலை)',
                'sku' => 'GARLAND-ROSE-RED-01',
                'category' => 'Garland',
                'price' => 450,
                'unit' => 'piece',
                'reorder_level' => 15,
                'track_freshness' => true,
                'freshness_days' => 2,
                'stock' => 50,
                'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'name' => 'Yellow Marigold (மஞ்சள் சாமந்தி)',
                'sku' => 'MARIGOLD-YELLOW-250G',
                'category' => 'Loose Flower',
                'price' => 120,
                'unit' => '250g',
                'reorder_level' => 25,
                'track_freshness' => true,
                'freshness_days' => 2,
                'stock' => 80,
                'image_url' => 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'name' => 'Tulasi Garland (துளசி மாலை)',
                'sku' => 'TULASI-GARLAND-01',
                'category' => 'Garland',
                'price' => 150,
                'unit' => 'piece',
                'reorder_level' => 20,
                'track_freshness' => true,
                'freshness_days' => 2,
                'stock' => 65,
                'image_url' => 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'name' => 'Lotus Flower (செந்தாமரை & வெண்தாமரை)',
                'sku' => 'LOTUS-POOJA-PAIR',
                'category' => 'Stem',
                'price' => 60,
                'unit' => 'piece',
                'reorder_level' => 10,
                'track_freshness' => true,
                'freshness_days' => 2,
                'stock' => 40,
                'image_url' => 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80',
            ],
            [
                'name' => 'Daily Pooja Combo Pack (தினசரி பூஜை காம்போ)',
                'sku' => 'POOJA-COMBO-DAILY-01',
                'category' => 'Combo',
                'price' => 299,
                'unit' => 'pack',
                'reorder_level' => 15,
                'track_freshness' => true,
                'freshness_days' => 2,
                'stock' => 35,
                'image_url' => 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
            ],
            ['name' => 'Red Rose Bouquet',       'sku' => 'ROSE-RED-001',   'category' => 'Bouquet',      'price' => 799,   'unit' => 'bunch',   'reorder_level' => 10, 'track_freshness' => true,  'freshness_days' => 3, 'stock' => 45, 'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'White Lily Bouquet',      'sku' => 'LILY-WHT-001',   'category' => 'Bouquet',      'price' => 1_299, 'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 4, 'stock' => 22, 'image_url' => 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Mixed Flower Basket',     'sku' => 'MIX-BSKT-001',  'category' => 'Arrangement',  'price' => 1_499, 'unit' => 'piece',   'reorder_level' => 5,  'track_freshness' => true,  'freshness_days' => 3, 'stock' => 18, 'image_url' => 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Rose Petals (100 g)',     'sku' => 'ROSE-PETALS',    'category' => 'Loose Flower', 'price' => 99,    'unit' => '100g',    'reorder_level' => 20, 'track_freshness' => true,  'freshness_days' => 2, 'stock' => 85, 'image_url' => 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80'],
        ]);

        // ── Main shop customers ───────────────────────────────────────────────
        $mainCustomers = $this->seedCustomers($uid, [
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
        ]);

        // ── Main shop orders ──────────────────────────────────────────────────
        if (Order::where('user_id', $uid)->count() === 0) {
            $this->seedOrders($uid, $mainProducts, $mainCustomers, 30);
        }

        // ── Main shop vendors ─────────────────────────────────────────────────
        if (Farmer::where('user_id', $uid)->count() === 0) {
            $this->seedFarmers($uid, $mainProducts);
        }

        if (BulkBuyer::where('user_id', $uid)->count() === 0) {
            $this->seedBulkBuyers($uid, $mainProducts);
        }

        $this->seedRestaurantData($uid, $mainProducts);

        // ════════════════════════════════════════════════════════════════════
        //  PHASE 3 — BRANCH TENANT DB  (Anna Nagar)
        //  provisionBranchDatabase activates the branch SQLite connection.
        //  All TenantModel writes after this go to:
        //  database/tenants/shop-{shopAdmin->id}/branch-anna-nagar.sqlite
        // ════════════════════════════════════════════════════════════════════

        // Always provision — updateOrCreate is idempotent; ensureSchema() is safe to re-run.
        $this->provisioner->provisionBranchDatabase($shopAdmin, $branch);

        // ── Anna Nagar branch settings ────────────────────────────────────────
        $this->seedSettings($uid, [
            'shop_name'     => 'Anna Nagar Branch',
            'shop_tagline'  => 'Flowers for Every Occasion',
            'shop_phone'    => '9876543299',
            'shop_email'    => 'annanagar@pookalflowers.in',
            'shop_address'  => '45, Nelson Manickam Rd, Anna Nagar, Chennai 600 040',
            'gstin'         => '33AABCU9603R1ZX',
            'tax_rate'      => '5',
            'currency'      => 'INR',
            'currency_symbol' => 'Rs.',
            'receipt_footer'  => 'Thank you — Anna Nagar Branch',
        ]);

        // ── Anna Nagar products ───────────────────────────────────────────────
        $branchProducts = $this->seedProducts($uid, [
            ['name' => 'Madurai Jasmine (மதுரை மல்லிகை)', 'sku' => 'JASMINE-MADURAI-BR', 'category' => 'Loose Flower', 'price' => 180, 'unit' => 'metre', 'reorder_level' => 20, 'track_freshness' => true, 'freshness_days' => 1, 'stock' => 80, 'image_url' => 'https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Red Rose Garland (பன்னீர் ரோஜா மாலை)', 'sku' => 'GARLAND-ROSE-BR', 'category' => 'Garland', 'price' => 450, 'unit' => 'piece', 'reorder_level' => 10, 'track_freshness' => true, 'freshness_days' => 2, 'stock' => 30, 'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Yellow Marigold (மஞ்சள் சாமந்தி)', 'sku' => 'MARIGOLD-YELLOW-BR', 'category' => 'Loose Flower', 'price' => 120, 'unit' => '250g', 'reorder_level' => 15, 'track_freshness' => true, 'freshness_days' => 2, 'stock' => 45, 'image_url' => 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Tulasi Garland (துளசி மாலை)', 'sku' => 'TULASI-GARLAND-BR', 'category' => 'Garland', 'price' => 150, 'unit' => 'piece', 'reorder_level' => 10, 'track_freshness' => true, 'freshness_days' => 2, 'stock' => 40, 'image_url' => 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Lotus Flower (செந்தாமரை & வெண்தாமரை)', 'sku' => 'LOTUS-POOJA-BR', 'category' => 'Stem', 'price' => 60, 'unit' => 'piece', 'reorder_level' => 8, 'track_freshness' => true, 'freshness_days' => 2, 'stock' => 25, 'image_url' => 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Daily Pooja Combo Pack (தினசரி பூஜை காம்போ)', 'sku' => 'POOJA-COMBO-BR', 'category' => 'Combo', 'price' => 299, 'unit' => 'pack', 'reorder_level' => 10, 'track_freshness' => true, 'freshness_days' => 2, 'stock' => 20, 'image_url' => 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Red Rose Bouquet',     'sku' => 'ROSE-RED-001',  'category' => 'Bouquet',  'price' => 799,   'unit' => 'bunch', 'reorder_level' => 8,  'track_freshness' => true,  'freshness_days' => 3, 'stock' => 30, 'image_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'White Lily Bouquet',   'sku' => 'LILY-WHT-001',  'category' => 'Bouquet',  'price' => 1_299, 'unit' => 'bunch', 'reorder_level' => 5,  'track_freshness' => true,  'freshness_days' => 4, 'stock' => 10, 'image_url' => 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Sunflower Bunch',      'sku' => 'SUNFLWR-BCH',   'category' => 'Bunch',    'price' => 599,   'unit' => 'bunch', 'reorder_level' => 6,  'track_freshness' => true,  'freshness_days' => 5, 'stock' => 14, 'image_url' => 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Rose Petals (100 g)',  'sku' => 'ROSE-PETALS',   'category' => 'Loose Flower','price' => 99, 'unit' => '100g', 'reorder_level' => 15, 'track_freshness' => true,  'freshness_days' => 2, 'stock' => 50, 'image_url' => 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80'],
        ]);

        // ── Anna Nagar customers ──────────────────────────────────────────────
        $branchCustomers = $this->seedCustomers($uid, [
            ['name' => 'Senthil Kumar',    'phone' => '9811223344', 'email' => 'senthil@example.com',    'segment' => 'vip',     'loyalty_points' => 310, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Revathi Mohan',    'phone' => '9822334455', 'email' => 'revathi@example.com',    'segment' => 'regular', 'loyalty_points' => 80,  'preferred_channel' => 'sms'],
            ['name' => 'Balamurugan T.',   'phone' => '9833445566', 'email' => 'balu@example.com',       'segment' => 'event',   'loyalty_points' => 520, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Sangeetha Raj',    'phone' => '9844556677', 'email' => 'sangeetha@example.com',  'segment' => 'vip',     'loyalty_points' => 190, 'preferred_channel' => 'email'],
            ['name' => 'Venkatesh P.',     'phone' => '9855667788', 'email' => 'venkatesh@example.com',  'segment' => 'regular', 'loyalty_points' => 55,  'preferred_channel' => 'sms'],
            ['name' => 'Usha Devi',        'phone' => '9866778899', 'email' => 'usha@example.com',       'segment' => 'vip',     'loyalty_points' => 640, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Arjun Natarajan',  'phone' => '9877889900', 'email' => 'arjun@example.com',      'segment' => 'regular', 'loyalty_points' => 35,  'preferred_channel' => 'sms'],
            ['name' => 'Malathi Krishnan', 'phone' => '9888990011', 'email' => 'malathi@example.com',    'segment' => 'event',   'loyalty_points' => 275, 'preferred_channel' => 'whatsapp'],
        ]);

        // ── Anna Nagar orders ─────────────────────────────────────────────────
        if (Order::where('user_id', $uid)->count() === 0) {
            $this->seedOrders($uid, $branchProducts, $branchCustomers, 15);
        }

        // ── Switch back to main DB so any subsequent code is safe ─────────────
        $this->connectionManager->activate($mainDb);

        // ════════════════════════════════════════════════════════════════════
        //  PHASE 4 — BRANCH STAFF USER (platform DB — User always uses 'platform')
        // ════════════════════════════════════════════════════════════════════


        $this->command->info('');
        $this->command->info('  ┌──────────────────────────────────────────────────────────────┐');
        $this->command->info('  │  POOKAL DEMO SEED COMPLETE                                   │');
        $this->command->info('  ├──────────────────────────────────────────────────────────────┤');
        $this->command->info('  │  superadmin@pookal.com  /  super@pookal                      │');
        $this->command->info('  │    → Platform admin only, no shop data                       │');
        $this->command->info('  │                                                              │');
        $this->command->info('  │  admin@pookal.com       /  pookal123                         │');
        $this->command->info('  │    → Main shop (T. Nagar): 20 products, 15 customers,        │');
        $this->command->info('  │      30 orders, 3 farmers, 3 bulk buyers                     │');
        $this->command->info('  │    → Can switch to Anna Nagar branch via sidebar              │');
        $this->command->info('  │                                                              │');
        $this->command->info('  │  staff@pookal.com       /  pookal123                         │');
        $this->command->info('  │    → Same main shop data as admin (read/write ops only)      │');
        $this->command->info('  │    → Cannot manage users, branches, or subscriptions         │');
        $this->command->info('  │                                                              │');
        $this->command->info('  │  annanagar@pookal.com   /  pookal123                         │');
        $this->command->info('  │    → Anna Nagar branch ONLY: 10 products, 8 customers,       │');
        $this->command->info('  │      15 orders. Cannot see main shop data.                   │');
        $this->command->info('  └──────────────────────────────────────────────────────────────┘');
        $this->command->info('');
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function seedSettings(int $uid, array $settings): void
    {
        foreach ($settings as $key => $value) {
            ShopSetting::updateOrCreate(
                ['user_id' => $uid, 'key' => $key],
                ['value'   => $value]
            );
        }
    }

    /** @return Product[] */
    private function seedProducts(int $uid, array $rows): array
    {
        $products = [];
        foreach ($rows as $row) {
            $stock = $row['stock'];
            unset($row['stock']);
            if (array_key_exists('track_freshness', $row)) {
                $row['track_expiry'] = (bool) $row['track_freshness'];
                unset($row['track_freshness']);
            }
            if (array_key_exists('freshness_days', $row)) {
                $row['shelf_life_days'] = (int) ($row['freshness_days'] ?: 3);
                unset($row['freshness_days']);
            }
            $product = Product::updateOrCreate(
                ['sku' => $row['sku']],
                array_merge($row, ['user_id' => $uid])
            );
            StockLedger::firstOrCreate(
                ['product_id' => $product->id, 'reference' => 'INITIAL-STOCK'],
                [
                    'txn_type'      => 'receive',
                    'qty_change'    => $stock,
                    'balance_after' => $stock,
                    'notes'         => 'Opening stock (seeded)',
                ]
            );
            $products[] = $product;
        }
        return $products;
    }

    /** @return int[] customer IDs */
    private function seedCustomers(int $uid, array $rows): array
    {
        foreach ($rows as $row) {
            Customer::updateOrCreate(
                ['user_id' => $uid, 'email' => $row['email']],
                array_merge($row, ['user_id' => $uid])
            );
        }
        return Customer::where('user_id', $uid)->pluck('id')->toArray();
    }

    private function seedOrders(int $uid, array $products, array $customerIds, int $count): void
    {
        $statusPool = array_merge(
            array_fill(0, (int) ($count * 0.2), 'pending'),
            array_fill(0, (int) ($count * 0.2), 'packed'),
            array_fill(0, (int) ($count * 0.27), 'dispatched'),
            array_fill(0, $count,                'delivered'),    // pad to at least $count
        );
        shuffle($statusPool);

        $channels = ['store', 'online', 'whatsapp'];
        $slots    = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
        $orderNum = Order::where('user_id', $uid)->max('order_number')
            ? (int) str_replace('ORD-', '', Order::where('user_id', $uid)->max('order_number')) + 1
            : 1001;

        for ($i = 0; $i < $count; $i++) {
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
                'user_id'            => $uid,
                'order_number'       => 'ORD-' . $orderNum++,
                'customer_id'        => $customerIds[array_rand($customerIds)],
                'channel'            => $channels[array_rand($channels)],
                'status'             => $statusPool[$i] ?? 'delivered',
                'subtotal'           => $subtotal,
                'discount_total'     => 0,
                'tax_total'          => $taxTotal,
                'grand_total'        => $grandTotal,
                'delivery_date'      => Carbon::today()->subDays($daysAgo)->toDateString(),
                'delivery_time_slot' => $slots[array_rand($slots)],
                'created_at'         => Carbon::now()->subDays($daysAgo),
                'updated_at'         => Carbon::now()->subDays($daysAgo),
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

    private function seedFarmers(int $uid, array $products): void
    {
        foreach ([
            ['name' => 'Murugan Farms',       'phone' => '9988776655', 'email' => 'murugan@farms.com',       'address' => 'Hosur Road, Krishnagiri District', 'payment_cycle' => 'biweekly', 'bank_name' => 'Canara Bank', 'account_number' => '111122223333', 'ifsc_code' => 'CNRB0001234'],
            ['name' => 'Selvam Rose Garden',  'phone' => '9977665544', 'email' => 'selvam@rosegarden.in',    'address' => 'Ooty Road, Coimbatore',            'payment_cycle' => 'weekly',   'bank_name' => 'SBI',         'account_number' => '444455556666', 'ifsc_code' => 'SBIN0004321'],
            ['name' => 'Kamala Lily Nursery', 'phone' => '9966554433', 'email' => null,                      'address' => 'Palani Road, Dindigul',            'payment_cycle' => 'monthly',  'bank_name' => null,          'account_number' => null,           'ifsc_code' => null],
        ] as $fr) {
            $farmer = Farmer::create(array_merge($fr, ['user_id' => $uid, 'is_active' => true]));

            foreach (range(1, 3) as $d) {
                $qty = rand(10, 60); $rate = rand(20, 80);
                FarmerDelivery::create(TenantSchemaManager::syncLegacyColumns('farmer_deliveries', [
                    'user_id' => $uid, 'farmer_id' => $farmer->id,
                    'item_name' => ['Rose', 'Lily', 'Marigold'][$d - 1],
                    'quantity' => $qty, 'unit' => 'kg', 'rate_per_unit' => $rate,
                    'total_amount' => round($qty * $rate, 2),
                    'delivery_date' => Carbon::today()->subDays(rand(1, 30))->toDateString(),
                    'quality_grade' => ['A', 'B', 'A'][array_rand(['A', 'B', 'A'])],
                ]));
            }

            FarmerPayment::create([
                'user_id' => $uid, 'farmer_id' => $farmer->id,
                'amount' => rand(2000, 8000),
                'period_start' => Carbon::today()->subDays(14)->toDateString(),
                'period_end'   => Carbon::today()->toDateString(),
                'status' => 'paid', 'payment_date' => Carbon::today()->toDateString(), 'payment_mode' => 'bank',
            ]);
        }
    }

    private function seedBulkBuyers(int $uid, array $products): void
    {
        $invoiceNum = 2001;
        foreach ([
            ['name' => 'Chennai Events Co.',      'contact_person' => 'Ravi Kumar',   'phone' => '9876012345', 'type' => 'company'],
            ['name' => 'Koyambedu Flower Market', 'contact_person' => 'Market Agent', 'phone' => '9865012345', 'type' => 'market'],
            ['name' => 'Taj Hotel Catering',      'contact_person' => 'Sunita',        'phone' => '9854012345', 'type' => 'hotel'],
        ] as $br) {
            $buyer = BulkBuyer::create(array_merge($br, ['user_id' => $uid, 'is_active' => true]));

            foreach (range(1, 2) as $s) {
                $subtotal = rand(3000, 15000);
                $discount = round($subtotal * 0.05, 2);
                $sale = BulkSale::create([
                    'user_id' => $uid, 'bulk_buyer_id' => $buyer->id,
                    'invoice_number' => 'INV-' . $invoiceNum++,
                    'sale_date'  => Carbon::today()->subDays(rand(1, 30))->toDateString(),
                    'subtotal'   => $subtotal, 'discount' => $discount,
                    'grand_total'=> round($subtotal - $discount, 2),
                    'status'     => $s === 1 ? 'paid' : 'confirmed',
                    'due_date'   => Carbon::today()->addDays(7)->toDateString(),
                ]);
                foreach (['Rose', 'Marigold', 'Lily'] as $flower) {
                    $qty = rand(5, 30); $rate = rand(15, 60);
                    BulkSaleItem::create(TenantSchemaManager::syncLegacyColumns('bulk_sale_items', [
                        'bulk_sale_id' => $sale->id, 'item_name' => $flower,
                        'quantity' => $qty, 'unit' => 'kg', 'rate_per_unit' => $rate,
                        'total_amount' => round($qty * $rate, 2),
                    ]));
                }
            }
        }
    }

    private function seedRestaurantData(int $uid, array $products): void
    {
        if (RestaurantTable::where('user_id', $uid)->count() === 0) {
            foreach ([
                ['name' => 'Table 1', 'capacity' => 2, 'section' => 'Main Hall', 'status' => 'vacant'],
                ['name' => 'Table 2', 'capacity' => 4, 'section' => 'Main Hall', 'status' => 'occupied'],
                ['name' => 'Table 3', 'capacity' => 4, 'section' => 'Window Side', 'status' => 'billing'],
                ['name' => 'Table 4', 'capacity' => 6, 'section' => 'Family Corner', 'status' => 'vacant'],
                ['name' => 'Table 5', 'capacity' => 8, 'section' => 'Private Dining', 'status' => 'reserved'],
                ['name' => 'Rooftop 1', 'capacity' => 4, 'section' => 'Rooftop Terrace', 'status' => 'vacant'],
            ] as $tbl) {
                RestaurantTable::create(array_merge($tbl, ['user_id' => $uid]));
            }
        }

        if (ProductModifier::count() === 0 && ! empty($products)) {
            foreach (array_slice($products, 0, 5) as $p) {
                ProductModifier::create([
                    'product_id'  => $p->id,
                    'name'        => 'Custom Message Card',
                    'price_delta' => 49.00,
                    'is_required' => false,
                    'options'     => ['Handwritten Note', 'Printed Gold Card', 'Audio QR Greeting'],
                ]);
                ProductModifier::create([
                    'product_id'  => $p->id,
                    'name'        => 'Gift Wrapping & Satin Ribbon',
                    'price_delta' => 99.00,
                    'is_required' => false,
                    'options'     => ['Royal Velvet Red', 'Classic Gold', 'Eco Kraft Paper'],
                ]);
            }
        }
    }
}
