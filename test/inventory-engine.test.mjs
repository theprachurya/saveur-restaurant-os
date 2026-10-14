import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  InventoryEngine,
  INITIAL_INGREDIENTS,
  INITIAL_MENU_ITEMS,
} from "../src/engine/inventory-engine.mjs";

describe("Saveur KitchenOps Inventory & Ordering Engine", () => {
  test("calculates dynamic available portions based on bottleneck recipe ingredient", () => {
    const engine = new InventoryEngine();

    // Truffle Risotto requires: 0.15kg rice, 0.02kg truffle, 0.05kg parm, 0.02kg butter
    // Initial Truffle is 0.6kg -> 0.6 / 0.02 = 30 portions max from truffle
    // Initial Rice is 12kg -> 12 / 0.15 = 80 portions max from rice
    // Initial Parm is 4kg -> 4 / 0.05 = 80 portions max
    // So initial portions should be 30
    const portions = engine.calculateAvailablePortions("dish_1");
    assert.equal(portions, 30);

    // If truffle stock is reduced to 0.05kg -> floor(0.05 / 0.02) = 2 portions
    engine.getIngredient("ing_truffle").stock = 0.05;
    const constrainedPortions = engine.calculateAvailablePortions("dish_1");
    assert.equal(constrainedPortions, 2);

    // If truffle stock is 0 -> 0 portions available
    engine.getIngredient("ing_truffle").stock = 0;
    assert.equal(engine.calculateAvailablePortions("dish_1"), 0);
  });

  test("processes valid order atomically and creates auditable ledger movements", () => {
    const engine = new InventoryEngine();

    const truffleBefore = engine.getIngredient("ing_truffle").stock;
    const riceBefore = engine.getIngredient("ing_rice").stock;

    const result = engine.processOrder({
      customerId: "cust_123",
      customerName: "Chef Pierre",
      items: [{ id: "dish_1", qty: 2 }],
    });

    assert.equal(result.success, true);
    assert.equal(result.order.status, "Confirmed");
    assert.equal(result.order.items.length, 1);
    assert.equal(result.order.items[0].qty, 2);

    // 2 portions of Truffle Risotto should consume 2 * 0.02 = 0.04kg truffle and 2 * 0.15 = 0.3kg rice
    const truffleAfter = engine.getIngredient("ing_truffle").stock;
    const riceAfter = engine.getIngredient("ing_rice").stock;

    assert.equal(parseFloat((truffleBefore - truffleAfter).toFixed(4)), 0.04);
    assert.equal(parseFloat((riceBefore - riceAfter).toFixed(4)), 0.3);

    // Stock movements ledger must contain entries for all 4 recipe ingredients
    assert.equal(result.stockMovements.length, 4);
    const truffleMovement = result.stockMovements.find((m) => m.ingredientId === "ing_truffle");
    assert.ok(truffleMovement);
    assert.equal(truffleMovement.delta, -0.04);
    assert.equal(truffleMovement.movementType, "order_consumption");
  });

  test("prevents overselling under high concurrency / race conditions", () => {
    const engine = new InventoryEngine();

    // Set steak stock to exactly 4 portions
    engine.getIngredient("ing_steak").stock = 4;
    engine.getIngredient("ing_potatoes").stock = 50.0;
    engine.getIngredient("ing_butter").stock = 10.0;

    // Simulate 6 concurrent customer checkout attempts, each requesting 1 Steak Frites
    const results = [];
    const errors = [];

    for (let i = 0; i < 6; i++) {
      try {
        const res = engine.processOrder({
          customerId: `cust_${i}`,
          customerName: `Customer #${i}`,
          items: [{ id: "dish_5", qty: 1 }],
        });
        results.push(res);
      } catch (err) {
        errors.push(err);
      }
    }

    // Exactly 4 orders must succeed, and exactly 2 must be rejected
    assert.equal(results.length, 4, "Expected exactly 4 successful orders");
    assert.equal(errors.length, 2, "Expected exactly 2 rejected orders");

    // Rejected error must have code INSUFFICIENT_STOCK
    assert.equal(errors[0].code, "INSUFFICIENT_STOCK");

    // Final steak stock must be exactly 0, never negative
    const finalSteakStock = engine.getIngredient("ing_steak").stock;
    assert.equal(finalSteakStock, 0, "Stock must never become negative");
  });

  test("verifies mathematical ledger integrity (initial + movements == current)", () => {
    const engine = new InventoryEngine();

    // Place an order
    engine.processOrder({
      customerId: "cust_1",
      items: [{ id: "dish_2", qty: 3 }], // 3 Burratas
    });

    // Record a delivery (+10 Burrata)
    engine.recordDelivery({
      ingredientId: "ing_burrata",
      quantity: 10,
      supplier: "Fromagerie Artisanale",
    });

    // Record spoilage waste (-2 Burrata)
    engine.recordWaste({
      ingredientId: "ing_burrata",
      quantity: 2,
      reason: "Expired packaging",
    });

    // Run audit check
    const audit = engine.auditLedgerIntegrity();
    assert.equal(audit.isValid, true, "Ledger integrity check failed");
    assert.equal(audit.discrepancies.length, 0);

    // Initial 18 - 3 + 10 - 2 = 23
    const burrata = engine.getIngredient("ing_burrata");
    assert.equal(burrata.stock, 23);
  });

  test("restores inventory stock when an order is cancelled", () => {
    const engine = new InventoryEngine();

    const duckBefore = engine.getIngredient("ing_duck").stock;

    const res = engine.processOrder({
      customerId: "cust_cancel",
      items: [{ id: "dish_3", qty: 2 }],
    });

    assert.equal(engine.getIngredient("ing_duck").stock, duckBefore - 2);

    // Cancel order
    engine.updateOrderStatus(res.order.id, "Cancelled");

    // Stock must be restored
    assert.equal(engine.getIngredient("ing_duck").stock, duckBefore);
  });

  test("handles binary floating-point divisions without premature stock truncation", () => {
    const engine = new InventoryEngine();

    // Lentils stock 0.3kg with dish_3 requiring 0.1kg per portion -> must be exactly 3 portions
    engine.getIngredient("ing_lentils").stock = 0.3;
    assert.equal(engine.calculateAvailablePortions("dish_3"), 3);

    // Tomatoes stock 0.6kg with dish_2 requiring 0.2kg per portion -> must be exactly 3 portions
    engine.getIngredient("ing_tomato").stock = 0.6;
    assert.equal(engine.calculateAvailablePortions("dish_2"), 3);

    // Exact order processing for all 3 portions should succeed without false shortage
    const res = engine.processOrder({
      customerId: "cust_exact",
      items: [{ id: "dish_2", qty: 3 }],
    });
    assert.equal(res.success, true);
    assert.equal(engine.getIngredient("ing_tomato").stock, 0);
  });

  test("supports receiveInventory alias with optional batch identification", () => {
    const engine = new InventoryEngine();
    const steakBefore = engine.getIngredient("ing_steak").stock;

    const res = engine.receiveInventory({
      ingredientId: "ing_steak",
      quantity: 5,
      supplier: "Heritage Farm",
      batchNumber: "LOT-992",
    });

    assert.equal(res.success, true);
    assert.equal(engine.getIngredient("ing_steak").stock, steakBefore + 5);
    assert.match(res.movement.reason, /LOT-992/);
  });

  test("enforces order lifecycle state transitions and prevents invalid cancellations", () => {
    const engine = new InventoryEngine();
    const res = engine.processOrder({
      customerId: "cust_lifecycle",
      items: [{ id: "dish_4", qty: 1 }],
    });

    // Advance to Delivered
    engine.updateOrderStatus(res.order.id, "Preparing");
    engine.updateOrderStatus(res.order.id, "Ready");
    engine.updateOrderStatus(res.order.id, "Delivered");

    // Delivered orders cannot be cancelled
    assert.throws(
      () => engine.updateOrderStatus(res.order.id, "Cancelled"),
      /Cannot cancel an order that has already been delivered/
    );

    // Create a new order and cancel it
    const res2 = engine.processOrder({
      customerId: "cust_lifecycle2",
      items: [{ id: "dish_4", qty: 1 }],
    });
    engine.updateOrderStatus(res2.order.id, "Cancelled");

    // Cannot reactivate a cancelled order
    assert.throws(
      () => engine.updateOrderStatus(res2.order.id, "Confirmed"),
      /Cannot reactivate an order that was cancelled/
    );
  });

  test("resets engine to factory defaults cleanly", () => {
    const engine = new InventoryEngine();

    engine.processOrder({
      customerId: "cust_reset",
      items: [{ id: "dish_1", qty: 2 }],
    });
    engine.recordWaste({
      ingredientId: "ing_butter",
      quantity: 1,
      reason: "Burned",
    });

    assert.ok(engine.orders.length > 0);
    assert.ok(engine.movements.length > 0);

    engine.resetToDefaults();

    assert.equal(engine.orders.length, 0);
    assert.equal(engine.movements.length, 0);
    assert.equal(engine.wasteLogs.length, 0);
    assert.equal(
      engine.getIngredient("ing_truffle").stock,
      INITIAL_INGREDIENTS.find((i) => i.id === "ing_truffle").stock
    );
  });
});

