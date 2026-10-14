/**
 * Saveur KitchenOps Deterministic Inventory Engine
 * 
 * Provides atomic, recipe-aware inventory tracking with auditable stock movements,
 * overselling prevention, and ledger integrity verification.
 */

export const INITIAL_INGREDIENTS = [
  { id: "ing_rice", name: "Arborio Rice", unit: "kg", stock: 12.0, threshold: 3.0, cost: 4.5 },
  { id: "ing_truffle", name: "Black Truffle", unit: "kg", stock: 0.6, threshold: 0.15, cost: 450.0 },
  { id: "ing_parm", name: "Aged Parmesan", unit: "kg", stock: 4.0, threshold: 1.0, cost: 22.0 },
  { id: "ing_burrata", name: "Burrata Cheese", unit: "pcs", stock: 18, threshold: 5, cost: 3.8 },
  { id: "ing_tomato", name: "Heirloom Tomatoes", unit: "kg", stock: 8.0, threshold: 2.0, cost: 5.0 },
  { id: "ing_basil", name: "Fresh Basil", unit: "kg", stock: 1.5, threshold: 0.3, cost: 12.0 },
  { id: "ing_duck", name: "Duck Leg Confit", unit: "pcs", stock: 10, threshold: 3, cost: 7.5 },
  { id: "ing_cherries", name: "Morello Cherries", unit: "kg", stock: 2.5, threshold: 0.8, cost: 9.0 },
  { id: "ing_lentils", name: "Puy Lentils", unit: "kg", stock: 5.0, threshold: 1.5, cost: 6.0 },
  { id: "ing_cream", name: "Double Cream", unit: "l", stock: 6.0, threshold: 2.0, cost: 4.2 },
  { id: "ing_sugar", name: "Caster Sugar", unit: "kg", stock: 8.0, threshold: 2.0, cost: 2.5 },
  { id: "ing_steak", name: "Grass-Fed Ribeye 8oz", unit: "pcs", stock: 8, threshold: 3, cost: 14.0 },
  { id: "ing_potatoes", name: "Maris Piper Potatoes", unit: "kg", stock: 25.0, threshold: 5.0, cost: 1.8 },
  { id: "ing_butter", name: "Cultured Butter", unit: "kg", stock: 5.0, threshold: 1.0, cost: 8.5 },
];

export const INITIAL_MENU_ITEMS = [
  {
    id: "dish_1",
    name: "Truffle Risotto",
    price: 18.5,
    cat: "mains",
    emoji: "🍚",
    desc: "Arborio rice, black truffle, aged parmesan, white wine emulsion",
  },
  {
    id: "dish_2",
    name: "Burrata Salad",
    price: 12.0,
    cat: "starters",
    emoji: "🥗",
    desc: "Fresh Puglia burrata, heirloom tomatoes, cold-pressed basil oil",
  },
  {
    id: "dish_3",
    name: "Duck Confit",
    price: 24.0,
    cat: "mains",
    emoji: "🍗",
    desc: "48-hour slow-cooked duck leg, tart cherry reduction, braised lentils",
  },
  {
    id: "dish_4",
    name: "Crème Brûlée",
    price: 9.0,
    cat: "desserts",
    emoji: "🍮",
    desc: "Classic Madagascan vanilla custard with torched caramel crust",
  },
  {
    id: "dish_5",
    name: "Steak Frites",
    price: 32.0,
    cat: "mains",
    emoji: "🥩",
    desc: "8oz grass-fed ribeye, hand-cut pommes frites, tarragon béarnaise",
  },
];

export const INITIAL_RECIPES = {
  dish_1: [
    { ingredientId: "ing_rice", qty: 0.15 },
    { ingredientId: "ing_truffle", qty: 0.02 },
    { ingredientId: "ing_parm", qty: 0.05 },
    { ingredientId: "ing_butter", qty: 0.02 },
  ],
  dish_2: [
    { ingredientId: "ing_burrata", qty: 1 },
    { ingredientId: "ing_tomato", qty: 0.2 },
    { ingredientId: "ing_basil", qty: 0.02 },
  ],
  dish_3: [
    { ingredientId: "ing_duck", qty: 1 },
    { ingredientId: "ing_cherries", qty: 0.05 },
    { ingredientId: "ing_lentils", qty: 0.1 },
  ],
  dish_4: [
    { ingredientId: "ing_cream", qty: 0.15 },
    { ingredientId: "ing_sugar", qty: 0.04 },
  ],
  dish_5: [
    { ingredientId: "ing_steak", qty: 1 },
    { ingredientId: "ing_potatoes", qty: 0.3 },
    { ingredientId: "ing_butter", qty: 0.03 },
  ],
};

export class InventoryEngine {
  constructor(initialData = {}) {
    this.initialIngredients = JSON.parse(
      JSON.stringify(initialData.ingredients || INITIAL_INGREDIENTS)
    );
    this.ingredients = new Map(
      (initialData.ingredients || INITIAL_INGREDIENTS).map((i) => [i.id, { ...i }])
    );
    this.menu = (initialData.menu || INITIAL_MENU_ITEMS).map((m) => ({ ...m }));
    this.recipes = JSON.parse(JSON.stringify(initialData.recipes || INITIAL_RECIPES));
    this.orders = JSON.parse(JSON.stringify(initialData.orders || []));
    this.movements = JSON.parse(JSON.stringify(initialData.movements || []));
    this.wasteLogs = JSON.parse(JSON.stringify(initialData.wasteLogs || []));
  }

  // ─── Query Methods ──────────────────────────────────────────

  getIngredients() {
    return Array.from(this.ingredients.values());
  }

  getIngredient(id) {
    return this.ingredients.get(id);
  }

  getMenuItems() {
    return this.menu.map((dish) => {
      const portions = this.calculateAvailablePortions(dish.id);
      return {
        ...dish,
        availablePortions: portions,
        isAvailable: portions > 0,
      };
    });
  }

  getMenuItem(id) {
    return this.menu.find((m) => m.id === id);
  }

  getRecipe(dishId) {
    const raw = this.recipes[dishId] || [];
    return raw.map((r) => {
      const ing = this.getIngredient(r.ingredientId);
      return {
        ingredientId: r.ingredientId,
        ingredientName: ing ? ing.name : r.ingredientId,
        unit: ing ? ing.unit : "units",
        quantity: r.qty,
        stockAvailable: ing ? ing.stock : 0,
      };
    });
  }

  calculateAvailablePortions(dishId) {
    const recipe = this.recipes[dishId];
    if (!recipe || recipe.length === 0) return 0;

    let minPortions = Infinity;
    for (const item of recipe) {
      const ing = this.getIngredient(item.ingredientId);
      if (!ing || ing.stock <= 0) return 0;
      // Add epsilon (1e-9) and 6-decimal rounding to prevent IEEE-754 precision issues (e.g. 0.3 / 0.1 -> 2.9999999999999996 -> 2 instead of 3)
      const ratio = (ing.stock + 1e-9) / item.qty;
      const possible = Math.floor(parseFloat(ratio.toFixed(6)));
      if (possible < minPortions) {
        minPortions = possible;
      }
    }
    return minPortions === Infinity ? 0 : Math.max(0, minPortions);
  }

  // ─── Atomic Order Placement ─────────────────────────────────

  /**
   * Process order atomically:
   * 1. Calculate total ingredient needs across all items in cart.
   * 2. Validate all ingredients have sufficient stock.
   * 3. If any stock is insufficient, abort entire transaction with 0 mutations.
   * 4. Deduct inventory and write stock movements ledger atomically.
   */
  processOrder({ customerId, customerName, items, orderId = null }) {
    if (!items || items.length === 0) {
      throw new Error("Cannot place an empty order");
    }

    const assignedOrderId = orderId || "ord_" + Math.floor(100000 + Math.random() * 900000);

    // Step 1: Aggregate total ingredient requirements
    const totalRequired = new Map(); // ingredientId -> { required: number, unit: string, name: string }

    for (const cartItem of items) {
      const dish = this.getMenuItem(cartItem.id);
      if (!dish) throw new Error(`Unknown dish ID: ${cartItem.id}`);
      if (cartItem.qty <= 0) throw new Error(`Invalid quantity for ${dish.name}`);

      const recipe = this.recipes[dish.id];
      if (!recipe) throw new Error(`No recipe configured for ${dish.name}`);

      for (const recipeItem of recipe) {
        const ing = this.getIngredient(recipeItem.ingredientId);
        if (!ing) throw new Error(`Missing ingredient: ${recipeItem.ingredientId}`);

        const needed = recipeItem.qty * cartItem.qty;
        const current = totalRequired.get(ing.id) || {
          required: 0,
          unit: ing.unit,
          name: ing.name,
          currentStock: ing.stock,
        };
        current.required = parseFloat((current.required + needed).toFixed(4));
        totalRequired.set(ing.id, current);
      }
    }

    // Step 2: Validate against current stock
    const shortages = [];
    for (const [ingId, req] of totalRequired.entries()) {
      const ing = this.getIngredient(ingId);
      const currentStock = parseFloat(ing.stock.toFixed(4));
      const needed = parseFloat(req.required.toFixed(4));
      if (currentStock + 1e-9 < needed) {
        shortages.push({
          ingredient: req.name,
          unit: req.unit,
          needed: req.required,
          available: ing.stock,
          shortfall: parseFloat((needed - currentStock).toFixed(4)),
        });
      }
    }

    if (shortages.length > 0) {
      const details = shortages
        .map((s) => `${s.ingredient} (needed ${s.needed}${s.unit}, have ${s.available}${s.unit})`)
        .join("; ");
      const err = new Error(`Order rejected due to insufficient kitchen inventory: ${details}`);
      err.code = "INSUFFICIENT_STOCK";
      err.shortages = shortages;
      throw err;
    }

    // Step 3: Atomic execution - deduct inventory and record stock movements
    const movements = [];
    const timestamp = new Date().toISOString();

    for (const [ingId, req] of totalRequired.entries()) {
      const ing = this.getIngredient(ingId);
      const prevStock = ing.stock;
      const nextStock = Math.max(0, parseFloat((prevStock - req.required).toFixed(4)));

      ing.stock = nextStock;

      const movement = {
        id: "mov_" + crypto.randomUUID(),
        ingredientId: ingId,
        ingredientName: ing.name,
        unit: ing.unit,
        delta: -req.required,
        balanceAfter: nextStock,
        movementType: "order_consumption",
        orderId: assignedOrderId,
        reason: `Order #${assignedOrderId} consumption`,
        createdAt: timestamp,
      };

      movements.push(movement);
      this.movements.push(movement);
    }

    // Step 4: Calculate total and create order record
    const subtotal = items.reduce((acc, it) => {
      const dish = this.getMenuItem(it.id);
      return acc + dish.price * it.qty;
    }, 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const orderRecord = {
      id: assignedOrderId,
      customerId,
      customerName: customerName || "Guest Customer",
      items: items.map((it) => {
        const dish = this.getMenuItem(it.id);
        return {
          id: it.id,
          name: dish.name,
          price: dish.price,
          qty: it.qty,
          subtotal: parseFloat((dish.price * it.qty).toFixed(2)),
        };
      }),
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      total,
      status: "Confirmed",
      createdAt: timestamp,
    };

    this.orders.unshift(orderRecord);

    return {
      success: true,
      order: orderRecord,
      stockMovements: movements,
    };
  }

  // ─── Inventory Actions ──────────────────────────────────────

  recordDelivery({ ingredientId, quantity, supplier = "Local Market", unitCost = null, batchNumber = null }) {
    if (quantity <= 0) throw new Error("Delivery quantity must be positive");
    const ing = this.getIngredient(ingredientId);
    if (!ing) throw new Error("Ingredient not found");

    const prevStock = ing.stock;
    const nextStock = parseFloat((prevStock + quantity).toFixed(4));
    ing.stock = nextStock;

    if (unitCost !== null && unitCost > 0) {
      ing.cost = unitCost;
    }

    const reasonText = batchNumber 
      ? `Supplier Delivery (${supplier} - Batch #${batchNumber})` 
      : `Supplier Delivery (${supplier})`;

    const movement = {
      id: "mov_" + crypto.randomUUID(),
      ingredientId,
      ingredientName: ing.name,
      unit: ing.unit,
      delta: quantity,
      balanceAfter: nextStock,
      movementType: "delivery",
      orderId: null,
      reason: reasonText,
      createdAt: new Date().toISOString(),
    };

    this.movements.push(movement);
    return { success: true, ingredient: ing, movement };
  }

  // Alias for backward/forward compatibility
  receiveInventory(opts) {
    return this.recordDelivery(opts);
  }

  recordWaste({ ingredientId, quantity, reason = "Spoilage", recordedBy = "Chef" }) {
    if (quantity <= 0) throw new Error("Waste quantity must be positive");
    const ing = this.getIngredient(ingredientId);
    if (!ing) throw new Error("Ingredient not found");

    const currentStock = parseFloat(ing.stock.toFixed(4));
    const wasteQty = parseFloat(quantity.toFixed(4));
    if (currentStock + 1e-9 < wasteQty) {
      throw new Error(`Cannot record waste greater than current stock (${ing.stock} ${ing.unit})`);
    }

    const prevStock = ing.stock;
    const nextStock = Math.max(0, parseFloat((prevStock - wasteQty).toFixed(4)));
    ing.stock = nextStock;

    const costImpact = parseFloat((wasteQty * ing.cost).toFixed(2));
    const timestamp = new Date().toISOString();

    const movement = {
      id: "mov_" + crypto.randomUUID(),
      ingredientId,
      ingredientName: ing.name,
      unit: ing.unit,
      delta: -wasteQty,
      balanceAfter: nextStock,
      movementType: "waste",
      orderId: null,
      reason: `Kitchen Waste: ${reason}`,
      createdAt: timestamp,
    };

    const wasteLog = {
      id: "wst_" + crypto.randomUUID(),
      ingredientId,
      ingredientName: ing.name,
      quantity: wasteQty,
      unit: ing.unit,
      reason,
      costImpact,
      recordedBy,
      createdAt: timestamp,
    };

    this.movements.push(movement);
    this.wasteLogs.push(wasteLog);

    return { success: true, ingredient: ing, movement, wasteLog };
  }

  updateOrderStatus(orderId, newStatus) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");

    const validStatuses = ["Confirmed", "Preparing", "Ready", "Delivered", "Cancelled"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    if (order.status === "Cancelled" && newStatus !== "Cancelled") {
      throw new Error("Cannot reactivate an order that was cancelled");
    }

    if (order.status === "Delivered" && newStatus === "Cancelled") {
      throw new Error("Cannot cancel an order that has already been delivered to the customer");
    }

    // If cancelling, restore ingredients
    if (newStatus === "Cancelled" && order.status !== "Cancelled") {
      for (const item of order.items) {
        const recipe = this.recipes[item.id] || [];
        for (const r of recipe) {
          const ing = this.getIngredient(r.ingredientId);
          if (ing) {
            const restoredQty = parseFloat((r.qty * item.qty).toFixed(4));
            ing.stock = parseFloat((ing.stock + restoredQty).toFixed(4));
            this.movements.push({
              id: "mov_" + crypto.randomUUID(),
              ingredientId: ing.id,
              ingredientName: ing.name,
              unit: ing.unit,
              delta: restoredQty,
              balanceAfter: ing.stock,
              movementType: "order_cancellation",
              orderId: order.id,
              reason: `Restoration from Cancelled Order #${order.id}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    order.status = newStatus;
    return order;
  }

  resetToDefaults() {
    this.ingredients = new Map(
      this.initialIngredients.map((i) => [i.id, { ...i }])
    );
    this.orders = [];
    this.movements = [];
    this.wasteLogs = [];
    return { success: true };
  }

  // ─── Mathematical Audit Ledger Verification ──────────────────

  auditLedgerIntegrity() {
    const discrepancies = [];

    for (const [ingId, ing] of this.ingredients.entries()) {
      // Find initial stock from instance baseline or INITIAL_INGREDIENTS
      const baseline = (this.initialIngredients && this.initialIngredients.find((i) => i.id === ingId)) ||
        INITIAL_INGREDIENTS.find((i) => i.id === ingId);
      const initialStock = baseline ? baseline.stock : 0;

      // Sum all movements for this ingredient
      const ingMovements = this.movements.filter((m) => m.ingredientId === ingId);
      const totalDelta = ingMovements.reduce((sum, m) => sum + m.delta, 0);

      const calculatedExpected = parseFloat((initialStock + totalDelta).toFixed(4));
      const actualStock = parseFloat(ing.stock.toFixed(4));

      if (Math.abs(calculatedExpected - actualStock) > 0.0001) {
        discrepancies.push({
          ingredientId: ingId,
          name: ing.name,
          initialStock,
          totalMovementDelta: totalDelta,
          expectedStock: calculatedExpected,
          actualStock,
        });
      }
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies,
      totalMovementsCount: this.movements.length,
    };
  }
}
