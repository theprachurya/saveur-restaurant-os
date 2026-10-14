-- =========================================================================
-- Saveur KitchenOps & Restaurant Platform: Production PostgreSQL Schema
-- =========================================================================

-- 1. Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff & Roles
CREATE TABLE IF NOT EXISTS restaurant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'chef', 'server')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, user_id)
);

-- 3. Raw Ingredient Inventory
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- e.g. 'kg', 'g', 'l', 'pcs'
    current_stock NUMERIC(10, 4) NOT NULL DEFAULT 0.0 CHECK (current_stock >= 0),
    reorder_threshold NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('starters', 'mains', 'desserts', 'beverages')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    emoji TEXT NOT NULL DEFAULT '🍽',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Recipes (Ingredients required per dish)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(10, 4) NOT NULL CHECK (quantity_required > 0),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Preparing', 'Ready', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 8. Auditable Stock Movement Ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('delivery', 'order_consumption', 'waste', 'adjustment', 'order_cancellation')),
    delta NUMERIC(10, 4) NOT NULL,
    balance_after NUMERIC(10, 4) NOT NULL,
    reason TEXT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Waste & Spoilage Tracking
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 4) NOT NULL CHECK (quantity > 0),
    cost_impact NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- Atomic Stored Procedure: process_order_atomic
-- Prevents overselling by locking ingredients FOR UPDATE in a single transaction
-- =========================================================================

CREATE OR REPLACE FUNCTION process_order_atomic(
    p_restaurant_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_items JSONB -- Array of objects: [{"menu_item_id": "...", "quantity": 2}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_item RECORD;
    v_recipe RECORD;
    v_subtotal NUMERIC(10, 2) := 0.0;
    v_tax NUMERIC(10, 2) := 0.0;
    v_total NUMERIC(10, 2) := 0.0;
    v_curr_stock NUMERIC(10, 4);
    v_needed NUMERIC(10, 4);
    v_dish_price NUMERIC(10, 2);
    v_dish_active BOOLEAN;
    v_dish_name TEXT;
    v_ing_name TEXT;
    v_ing_unit TEXT;
BEGIN
    -- 1. Validate & Lock Ingredients
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        SELECT name, price, is_active INTO v_dish_name, v_dish_price, v_dish_active
        FROM menu_items WHERE id = v_item.menu_item_id AND restaurant_id = p_restaurant_id;

        IF NOT FOUND OR NOT v_dish_active THEN
            RAISE EXCEPTION 'Item % is unavailable', v_dish_name;
        END IF;

        v_subtotal := v_subtotal + (v_dish_price * v_item.quantity);

        -- Check all recipe ingredients
        FOR v_recipe IN
            SELECT ri.ingredient_id, ri.quantity_required, i.name AS ing_name, i.unit, i.current_stock
            FROM recipe_ingredients ri
            JOIN ingredients i ON i.id = ri.ingredient_id
            WHERE ri.menu_item_id = v_item.menu_item_id
            FOR UPDATE OF i
        LOOP
            v_needed := v_recipe.quantity_required * v_item.quantity;
            IF v_recipe.current_stock < v_needed THEN
                RAISE EXCEPTION 'Insufficient stock for % (dish %). Required % %, available % %',
                    v_recipe.ing_name, v_dish_name, v_needed, v_recipe.unit, v_recipe.current_stock, v_recipe.unit;
            END IF;
        END LOOP;
    END LOOP;

    v_tax := ROUND(v_subtotal * 0.08, 2);
    v_total := v_subtotal + v_tax;

    -- 2. Insert Order Header
    INSERT INTO orders (id, restaurant_id, customer_id, customer_name, subtotal, tax, total_amount, status)
    VALUES (v_order_id, p_restaurant_id, p_customer_id, p_customer_name, v_subtotal, v_tax, v_total, 'Confirmed');

    -- 3. Insert Order Items, Deduct Stock, and Record Ledger Movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INT)
    LOOP
        SELECT price INTO v_dish_price FROM menu_items WHERE id = v_item.menu_item_id;

        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
        VALUES (v_order_id, v_item.menu_item_id, v_item.quantity, v_dish_price, (v_dish_price * v_item.quantity));

        -- Deduct ingredients and record movement
        FOR v_recipe IN
            SELECT ri.ingredient_id, ri.quantity_required, i.current_stock, i.name AS ing_name
            FROM recipe_ingredients ri
            JOIN ingredients i ON i.id = ri.ingredient_id
            WHERE ri.menu_item_id = v_item.menu_item_id
        LOOP
            v_needed := v_recipe.quantity_required * v_item.quantity;
            
            UPDATE ingredients
            SET current_stock = current_stock - v_needed,
                updated_at = NOW()
            WHERE id = v_recipe.ingredient_id
            RETURNING current_stock INTO v_curr_stock;

            INSERT INTO stock_movements (restaurant_id, ingredient_id, movement_type, delta, balance_after, reason, order_id)
            VALUES (p_restaurant_id, v_recipe.ingredient_id, 'order_consumption', -v_needed, v_curr_stock, 'Order ' || v_order_id, v_order_id);
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'subtotal', v_subtotal,
        'tax', v_tax,
        'total', v_total,
        'status', 'Confirmed'
    );
END;
$$;

-- =========================================================================
-- Row Level Security (RLS) Configuration
-- =========================================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- Menu Items: Publicly visible if active
CREATE POLICY "Public menu items view" ON menu_items
    FOR SELECT USING (is_active = true);

-- Orders: Customers can only see their own orders
CREATE POLICY "Customers view own orders" ON orders
    FOR SELECT USING (auth.uid() = customer_id);

-- Orders: Restaurant staff can view all orders for their restaurant
CREATE POLICY "Staff view restaurant orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurant_memberships rm
            WHERE rm.restaurant_id = orders.restaurant_id AND rm.user_id = auth.uid()
        )
    );

-- Ingredients & Stock movements: Only accessible by restaurant members
CREATE POLICY "Staff manage ingredients" ON ingredients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurant_memberships rm
            WHERE rm.restaurant_id = ingredients.restaurant_id AND rm.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff view stock movements" ON stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM restaurant_memberships rm
            WHERE rm.restaurant_id = stock_movements.restaurant_id AND rm.user_id = auth.uid()
        )
    );
