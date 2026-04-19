<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ShopSetting;
use App\Models\StockLedger;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Super-admin ─────────────────────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'superadmin@pookal.com'],
            [
                'name'      => 'Platform Admin',
                'role'      => 'superadmin',
                'shop_name' => 'Pookal HQ',
                'password'  => Hash::make('super@pookal'),
            ]
        );

        // ── Default shop owner (admin@pookal.com) ───────────────────────────────
        $shopAdmin = User::firstOrCreate(
            ['email' => 'admin@pookal.com'],
            [
                'name'      => 'Shop Admin',
                'role'      => 'admin',
                'shop_name' => 'Pookal Flowers',
                'phone'     => '9876543210',
                'password'  => Hash::make('pookal123'),
            ]
        );

        // ── Subscription Plans ──────────────────────────────────────────────────
        $allModules = ['pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'settings', 'website'];

        $plansData = [
            [
                'name'          => 'Free Trial',
                'description'   => '30-day free trial with access to all modules.',
                'price_monthly' => 0,
                'price_yearly'  => 0,
                'modules'       => $allModules,
                'max_users'     => 1,
                'is_active'     => true,
            ],
            [
                'name'          => 'Starter',
                'description'   => 'POS + Inventory + Orders. Perfect for a single counter shop.',
                'price_monthly' => 999,
                'price_yearly'  => 9999,
                'modules'       => ['pos', 'inventory', 'orders'],
                'max_users'     => 2,
                'is_active'     => true,
            ],
            [
                'name'          => 'Pro',
                'description'   => 'All modules including CRM, Delivery, Reports, and storefront website config.',
                'price_monthly' => 1999,
                'price_yearly'  => 19999,
                'modules'       => $allModules,
                'max_users'     => 5,
                'is_active'     => true,
            ],
            [
                'name'          => 'Enterprise',
                'description'   => 'Unlimited users, all modules, website storefront, and priority support.',
                'price_monthly' => 4999,
                'price_yearly'  => 49999,
                'modules'       => $allModules,
                'max_users'     => 999,
                'is_active'     => true,
            ],
        ];

        $plans = [];
        foreach ($plansData as $pd) {
            $plans[$pd['name']] = Plan::firstOrCreate(['name' => $pd['name']], $pd);
        }

        // ── Assign Pro subscription to the default shop admin ───────────────────
        if (! $shopAdmin->subscriptions()->exists()) {
            Subscription::create([
                'user_id'           => $shopAdmin->id,
                'plan_id'           => $plans['Pro']->id,
                'status'            => 'active',
                'billing_cycle'     => 'yearly',
                'amount_paid'       => 19999,
                'start_date'        => now(),
                'end_date'          => now()->addYear(),
                'next_renewal_date' => now()->addYear(),
                'auto_renew'        => true,
                'notes'             => 'Initial setup',
            ]);
        }

        // ── Default Shop Settings ───────────────────────────────────────────────
        $defaults = [
            'shop_name'       => 'Pookal Flowers',
            'shop_tagline'    => 'Fresh flowers, delivered with love',
            'shop_phone'      => '9876543210',
            'shop_email'      => 'hello@pookal.com',
            'shop_address'    => '12, Rose Street, Chennai - 600001',
            'gstin'           => '33AAAAA0000A1Z5',
            'tax_rate'        => '5',
            'currency'        => 'INR',
            'currency_symbol' => 'Rs.',
            'receipt_footer'  => 'Thank you for shopping with us!',
            'website_enabled' => '1',
            'website_slug' => 'pookal-flowers',
            'website_theme' => 'rose-luxury',
            'website_banner_title' => 'Luxury flowers, ready to share online',
            'website_banner_subtitle' => 'Publish your florist website directly from Pookal and share it through URL or QR.',
            'website_intro' => 'This storefront is powered by the same inventory, pricing, and product catalog you manage inside Pookal.',
            'website_primary_color' => '#7d294a',
            'website_secondary_color' => '#25543a',
            'website_setup_fee' => '2500',
            'website_subscription_amount' => '999',
            'website_contact_phone' => '9876543210',
            'website_contact_email' => 'hello@pookal.com',
        ];
        foreach ($defaults as $key => $value) {
            ShopSetting::updateOrCreate(['user_id' => $shopAdmin->id, 'key' => $key], ['value' => $value]);
        }

        // ── Products ────────────────────────────────────────────────────────────
        $productData = [
            ['name' => 'Red Rose Bouquet',      'sku' => 'ROSE-RED-001',   'category' => 'Bouquet',      'price' => 799,  'unit' => 'bunch',   'reorder_level' => 10, 'track_freshness' => true,  'stock' => 45],
            ['name' => 'White Lily Bouquet',     'sku' => 'LILY-WHT-001',   'category' => 'Bouquet',      'price' => 1299, 'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'stock' => 22],
            ['name' => 'Mixed Flower Basket',    'sku' => 'MIX-BSKT-001',  'category' => 'Basket',       'price' => 1499, 'unit' => 'piece',   'reorder_level' => 5,  'track_freshness' => true,  'stock' => 18],
            ['name' => 'Jasmine String (1 m)',   'sku' => 'JASMINE-STR',    'category' => 'Loose Flower', 'price' => 149,  'unit' => 'metre',   'reorder_level' => 50, 'track_freshness' => true,  'stock' => 180],
            ['name' => 'Marigold Garland',       'sku' => 'MARIGOLD-GRL',   'category' => 'Garland',      'price' => 249,  'unit' => 'piece',   'reorder_level' => 15, 'track_freshness' => true,  'stock' => 60],
            ['name' => 'Orchid Stem',            'sku' => 'ORCHID-STM-001', 'category' => 'Stem',         'price' => 399,  'unit' => 'stem',    'reorder_level' => 12, 'track_freshness' => true,  'stock' => 35],
            ['name' => 'Sunflower Bunch',        'sku' => 'SUNFLWR-BCH',    'category' => 'Bunch',        'price' => 599,  'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'stock' => 7],
            ['name' => 'Rose Petals (100 g)',    'sku' => 'ROSE-PETALS',    'category' => 'Loose Flower', 'price' => 199,  'unit' => '100g',    'reorder_level' => 20, 'track_freshness' => true,  'stock' => 85],
            ['name' => 'Lotus Flower',           'sku' => 'LOTUS-001',      'category' => 'Stem',         'price' => 299,  'unit' => 'stem',    'reorder_level' => 10, 'track_freshness' => true,  'stock' => 4],
            ['name' => 'Chrysanthemum Bunch',    'sku' => 'CHRYS-BCH',      'category' => 'Bunch',        'price' => 449,  'unit' => 'bunch',   'reorder_level' => 10, 'track_freshness' => true,  'stock' => 28],
            ['name' => 'Carnation Bouquet',      'sku' => 'CARN-BCH-001',   'category' => 'Bouquet',      'price' => 699,  'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'stock' => 19],
            ['name' => 'Lavender Bundle',        'sku' => 'LAVNDR-001',     'category' => 'Bundle',       'price' => 549,  'unit' => 'bundle',  'reorder_level' => 6,  'track_freshness' => true,  'stock' => 14],
            ['name' => 'Gerbera Bunch',          'sku' => 'GERB-BCH-001',   'category' => 'Bunch',        'price' => 499,  'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'stock' => 31],
            ['name' => "Baby's Breath",           'sku' => 'BABYBTH-001',    'category' => 'Bunch',        'price' => 349,  'unit' => 'bunch',   'reorder_level' => 8,  'track_freshness' => true,  'stock' => 3],
            ['name' => 'Tulip Bouquet',          'sku' => 'TULIP-BCH-001',  'category' => 'Bouquet',      'price' => 999,  'unit' => 'bunch',   'reorder_level' => 6,  'track_freshness' => true,  'stock' => 12],
            ['name' => 'Gold Wrapping Paper',    'sku' => 'WRAP-GOLD-01',   'category' => 'Supply',       'price' => 49,   'unit' => 'sheet',   'reorder_level' => 30, 'track_freshness' => false, 'stock' => 120],
            ['name' => 'Red Ribbon Bundle',      'sku' => 'RIBBON-RED',     'category' => 'Supply',       'price' => 89,   'unit' => 'roll',    'reorder_level' => 15, 'track_freshness' => false, 'stock' => 42],
            ['name' => 'Flower Box (Medium)',    'sku' => 'BOX-MED-001',    'category' => 'Supply',       'price' => 129,  'unit' => 'piece',   'reorder_level' => 20, 'track_freshness' => false, 'stock' => 55],
            ['name' => 'Glass Vase',             'sku' => 'VASE-GLASS',     'category' => 'Accessory',    'price' => 599,  'unit' => 'piece',   'reorder_level' => 5,  'track_freshness' => false, 'stock' => 18],
            ['name' => 'Flower Food Sachet',     'sku' => 'FOOD-SACHET',    'category' => 'Supply',       'price' => 29,   'unit' => 'sachet',  'reorder_level' => 40, 'track_freshness' => false, 'stock' => 200],
        ];

        $products = [];
        foreach ($productData as $row) {
            $stock = $row['stock'];
            unset($row['stock']);
            $product = Product::updateOrCreate(
                ['sku' => $row['sku']],
                [...$row, 'user_id' => $shopAdmin->id]
            );

            StockLedger::updateOrCreate(
                ['product_id' => $product->id, 'reference' => 'INITIAL-STOCK'],
                [
                    'txn_type' => 'receive',
                    'qty_change' => $stock,
                    'balance_after' => $stock,
                    'notes' => 'Opening stock',
                ]
            );
            $products[] = $product;
        }

        // ── Customers ──────────────────────────────────────────────────────────
        $customerData = [
            ['name' => 'Anitha Kumar',    'phone' => '9876543210', 'email' => 'anitha@example.com',    'segment' => 'vip',     'loyalty_points' => 240, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Saravanan Muthu', 'phone' => '9765432109', 'email' => 'saravanan@example.com', 'segment' => 'regular', 'loyalty_points' => 125, 'preferred_channel' => 'sms'],
            ['name' => 'Meena Rajan',     'phone' => '9654321098', 'email' => 'meena@example.com',     'segment' => 'vip',     'loyalty_points' => 580, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Rajesh Venkat',   'phone' => '9543210987', 'email' => 'rajesh@example.com',    'segment' => 'regular', 'loyalty_points' => 45,  'preferred_channel' => 'sms'],
            ['name' => 'Priya Sundar',    'phone' => '9432109876', 'email' => 'priya@example.com',     'segment' => 'event',   'loyalty_points' => 320, 'preferred_channel' => 'email'],
            ['name' => 'Karthik Selvam',  'phone' => '9321098765', 'email' => 'karthik@example.com',   'segment' => 'regular', 'loyalty_points' => 90,  'preferred_channel' => 'sms'],
            ['name' => 'Divya Mohan',     'phone' => '9210987654', 'email' => 'divya@example.com',     'segment' => 'vip',     'loyalty_points' => 710, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Suresh Babu',     'phone' => '9109876543', 'email' => 'suresh@example.com',    'segment' => 'regular', 'loyalty_points' => 30,  'preferred_channel' => 'sms'],
            ['name' => 'Lakshmi Nair',    'phone' => '9098765432', 'email' => 'lakshmi@example.com',   'segment' => 'event',   'loyalty_points' => 450, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Vijay Kumar',     'phone' => '8987654321', 'email' => 'vijay@example.com',     'segment' => 'regular', 'loyalty_points' => 15,  'preferred_channel' => 'sms'],
            ['name' => 'Padmini Devi',    'phone' => '8876543210', 'email' => 'padmini@example.com',   'segment' => 'vip',     'loyalty_points' => 890, 'preferred_channel' => 'whatsapp'],
            ['name' => 'Arun Shankar',    'phone' => '8765432109', 'email' => 'arun@example.com',      'segment' => 'regular', 'loyalty_points' => 60,  'preferred_channel' => 'sms'],
            ['name' => 'Geetha Krishnan', 'phone' => '8654321098', 'email' => 'geetha@example.com',    'segment' => 'event',   'loyalty_points' => 275, 'preferred_channel' => 'email'],
            ['name' => 'Murugan Pillai',  'phone' => '8543210987', 'email' => 'murugan@example.com',   'segment' => 'regular', 'loyalty_points' => 10,  'preferred_channel' => 'sms'],
            ['name' => 'Nithya Balaji',   'phone' => '8432109876', 'email' => 'nithya@example.com',    'segment' => 'vip',     'loyalty_points' => 430, 'preferred_channel' => 'whatsapp'],
        ];

        foreach ($customerData as $row) {
            Customer::updateOrCreate(['email' => $row['email']], $row);
        }

        $customerIds = Customer::pluck('id')->toArray();

        OrderItem::query()->delete();
        Order::query()->delete();

        // ── Orders (30) ────────────────────────────────────────────────────────
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
            $productCount = count($products);
            $numItems     = rand(1, 3);
            $indices      = array_keys($products);
            shuffle($indices);
            $selected = array_slice($indices, 0, $numItems);

            $subtotal = 0;
            $lineItems = [];
            foreach ($selected as $idx) {
                $p    = $products[$idx];
                $qty  = rand(1, 3);
                $line = $qty * $p->price;
                $subtotal += $line;
                $lineItems[] = ['product' => $p, 'qty' => $qty, 'unit_price' => $p->price, 'line_total' => $line];
            }

            $taxTotal   = round($subtotal * 0.05, 2);
            $grandTotal = $subtotal + $taxTotal;

            $order = Order::create([
                'order_number'   => 'ORD-' . $orderNum++,
                'customer_id'    => $customerIds[array_rand($customerIds)],
                'channel'        => $channels[array_rand($channels)],
                'status'         => $statusPool[$i],
                'subtotal'       => $subtotal,
                'discount_total' => 0,
                'tax_total'      => $taxTotal,
                'grand_total'    => $grandTotal,
                'delivery_slot'  => $slots[array_rand($slots)],
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
}
