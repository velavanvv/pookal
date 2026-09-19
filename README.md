# Pookal

Pookal is a **multi-vertical shop billing platform** — POS, inventory, orders, CRM, delivery, reports, and optional supplier management for any retail business.

Works for supermarkets, flower shops, fish/chicken counters, restaurants, service businesses, and more.

## Workspace Structure

```text
pookal/
  frontend/   # React + Vite + Bootstrap client
  backend/    # Laravel 12 API with multi-tenant architecture
```

## How shops are created

Shop owners do **not** self-register. A **super admin** creates each shop:

1. Sign in as `superadmin@pookal.com`
2. Open **Admin → Customers → Create Shop**
3. Enter owner name, login email, password, shop name
4. Choose **business type** and **subscription plan**
5. Share the login details with the shop owner

The shop owner then signs in at `/login` and only sees modules included in their plan.

| Type | Examples |
|------|----------|
| `retail` | Supermarket, general store |
| `fresh_perishable` | Flower, fish, chicken, fruits |
| `restaurant` | Dine-in, café, cloud kitchen |
| `service` | Salon, repair, clinic |
| `hybrid` | Multi-category shops |

## Core Modules

- Dashboard, Products, POS, Inventory, Orders
- CRM, Delivery, Reports, Settings
- Suppliers (fresh/perishable shops)
- Public Storefront, Multi-branch, Admin/SaaS

## Tech Stack

- **Frontend:** React 18, Vite, Bootstrap 5, Firebase FCM
- **Backend:** PHP 8.4, Laravel 12, Sanctum
- **Database:** PostgreSQL (platform) + SQLite per tenant
- **Deploy:** Vercel (frontend) + Render (backend)

## Getting Started

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && composer install && php artisan migrate --seed
```

## Demo Logins (after seed)

| Email | Password | Role |
|-------|----------|------|
| `superadmin@pookal.com` | `super@pookal` | Platform admin |
| `admin@pookal.com` | `pookal123` | Shop owner (fresh/perishable) |
| `staff@pookal.com` | `pookal123` | Shop staff |
| `annanagar@pookal.com` | `pookal123` | Branch user |
