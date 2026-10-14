# Saveur — Kitchen Operations & Restaurant OS 🍽️

Saveur is a deterministic, recipe-aware kitchen operations and restaurant ordering platform engineered to eliminate overselling, provide atomic multi-item checkout, and maintain a mathematically verified double-entry stock movement ledger.

Built as an offline-first modern web application with optional **Supabase PostgreSQL** synchronization, Saveur unifies front-of-house guest ordering, back-of-house Kitchen Display Systems (KDS), warehouse supply receiving, and kitchen waste logging into a cohesive, tactile interface.

---

## 🛠 Key Architecture & Modules

### 1. 🧪 Deterministic Recipe-Aware Inventory Engine (`src/engine/inventory-engine.mjs`)
- **Dynamic Bottleneck Availability**: Real-time calculation of available dish portions based on the lowest common denominator raw ingredient in the recipe.
- **Floating-Point Precision Guarding**: Incorporates epsilon tolerance and decimal normalization to prevent IEEE-754 precision decay (e.g. `0.3 / 0.1` or `0.6 / 0.2`) from prematurely truncating available portions.
- **Atomic Multi-Item Ordering**: Checks all ingredient dependencies across an entire cart simultaneously; if even a single ingredient is short, the transaction is rejected with 0 partial mutations (`INSUFFICIENT_STOCK`).
- **Concurrency & Race Condition Prevention**: Deterministically enforces non-negative stock levels under rapid concurrent checkout attempts.
- **Lifecycle Transition Safety**: Strict order status machine (`Confirmed` → `Preparing` → `Ready` → `Delivered`), with automated ingredient restoration upon cancellation and protection against invalid state reversions.
- **Double-Entry Stock Ledger**: Every inventory mutation (`delivery`, `order_consumption`, `waste`, `order_cancellation`) is logged as an auditable ledger entry.
- **Mathematical Integrity Audit**: Built-in verification method `auditLedgerIntegrity()` proving that `Initial Stock + ∑(Movements) == Current Balance`.

### 2. 🍽️ Customer Order & Dine
- Seasonal menu browsing with live portion availability badges (`Optimal`, `Low Stock`, `Sold Out`).
- Interactive recipe specifications modal displaying ingredient breakdowns and current pantry stock.
- Real-time cart calculations with automatic sales tax and instant checkout dispatch.

### 3. 👨‍🍳 Kitchen Display System (KDS)
- Kanban workflow across four key kitchen stages: **New Orders**, **In Prep**, **Ready for Service**, and **Served**.
- Single-click station advancement (`Start Prep →`, `Mark Ready →`, `Mark Served ✓`).
- Active cancellation control for incoming orders with instant ingredient inventory restoration.

### 4. 📦 Raw Ingredient Warehouse & Recipe Specs
- Pantry inventory overview with live stock levels, unit metrics (`kg`, `l`, `pcs`), reorder thresholds, and unit costs.
- **Supplier Deliveries**: Log inbound raw ingredients with custom batch numbers and supplier details.
- **Waste & Spoilage**: Track prep loss, spoilage, or spills with automated financial cost impact calculation.

### 5. 📜 Stock Movements Audit Ledger
- Immutable, chronological log of all stock movements with timestamp, delta, resulting balance, and order association.
- Real-time ledger integrity validation banner.

### 6. 🧪 In-Browser Acceptance & Concurrency Tester
- Live interactive simulation that calibrates inventory to a fixed quantity and fires rapid concurrent order requests to demonstrate atomic overselling prevention directly in the browser.

---

## 📂 Project Structure

```
saveur-restaurant-os/
├── config.js                      # Public runtime configuration for Supabase credentials
├── index.html                     # Single-page application shell, styles, and controller
├── package.json                   # NPM metadata & test runner script
├── README.md                      # Comprehensive project documentation
├── supabase-schema.sql            # Self-contained PostgreSQL schema & atomic procedure
│
├── src/
│   └── engine/
│       └── inventory-engine.mjs   # Core deterministic KitchenOps inventory engine
│
├── supabase/
│   └── schema.sql                 # Production Supabase schema with row-level locks
│
└── test/
    └── inventory-engine.test.mjs  # Unit & concurrency test suite (Node test runner)
```

---

## 🗄 Database Schema & Atomic Stored Procedure

For production deployments backed by **Supabase PostgreSQL**, the platform provides:

- **Relational Model**: `restaurants`, `restaurant_memberships`, `ingredients`, `menu_items`, `recipe_ingredients`, `orders`, `order_items`, `stock_movements`, and `waste_logs`.
- **Row-Level Locking Stored Procedure (`process_order_atomic`)**:
  Locks affected ingredient rows using `FOR UPDATE OF i` inside a single PostgreSQL transaction to guarantee zero race-condition overselling across distributed clients.
- **Row Level Security (RLS)**: Enforces role-based permissions (`owner`, `manager`, `chef`, `server`) and customer privacy.

To apply: Run [`supabase-schema.sql`](supabase-schema.sql) in your Supabase SQL Editor.

---

## 🚀 Getting Started

### 1. Run Tests
The engine includes a native Node.js test suite with zero external dependencies:
```bash
npm test
```

### 2. Local Development & Preview
Serve the repository using any local web server:
```bash
# Using Node
npx serve .

# Or using Python
python3 -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> The app defaults to persistent `localStorage` synchronization. Use the **↺ Reset Demo** button in the top navigation bar at any time to return inventory, orders, and ledger records to fresh factory defaults.

### 3. Connect to Supabase (Optional)
To synchronize with a Supabase cloud database:
1. Run [`supabase-schema.sql`](supabase-schema.sql) in your Supabase SQL Editor.
2. Edit [`config.js`](config.js):
   ```javascript
   window.SAVEUR_SUPABASE_URL = "https://your-project.supabase.co";
   window.SAVEUR_SUPABASE_ANON_KEY = "your-anon-key";
   ```
3. Refresh the app. Saveur will automatically bind to your Supabase backend.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
