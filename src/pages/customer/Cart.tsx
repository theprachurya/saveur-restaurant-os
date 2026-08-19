import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, Loader2, CreditCard } from 'lucide-react';

export default function CustomerCart() {
  const { items, updateQuantity, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);

  const tax = total * 0.05; // 5% service charge
  const grandTotal = total + tax;

  const handleCheckout = () => {
    if (!user) {
      alert("Please log in to place an order.");
      navigate('/login');
      return;
    }
    setPaymentStep(true);
  };

  const processPaymentAndOrder = async () => {
    setProcessing(true);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: grandTotal,
          status: 'pending'
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update stock (in a real app, this should be an RPC or handled securely)
      for (const item of items) {
        const { data: currentMenu } = await supabase.from('menu_items').select('stock').eq('id', item.id).single();
        if (currentMenu) {
          const newStock = Math.max(0, currentMenu.stock - item.quantity);
          await supabase.from('menu_items').update({ 
            stock: newStock,
            is_available: newStock > 0 
          }).eq('id', item.id);
        }
      }

      clearCart();
      navigate('/customer/orders');

    } catch (error) {
      console.error("Error processing order:", error);
      alert("There was an issue processing your order. Please try again.");
    } finally {
      setProcessing(false);
      setPaymentStep(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-border)] shadow-sm max-w-2xl mx-auto mt-10">
        <div className="text-6xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold font-serif mb-4">Your cart is empty</h2>
        <p className="text-[var(--color-muted)] mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link 
          to="/customer/menu"
          className="inline-flex items-center gap-2 bg-[var(--color-rust)] text-white px-8 py-4 rounded-xl font-medium hover:bg-[var(--color-rust-dark)] transition-colors"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold font-serif mb-8">Review Your Order</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-[var(--color-border)] flex items-center gap-4 shadow-sm">
              <div className="w-16 h-16 bg-[var(--color-cream)] rounded-xl flex items-center justify-center text-3xl shrink-0">
                {item.emoji_icon}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                <div className="text-[var(--color-muted)]">${item.price.toFixed(2)}</div>
              </div>

              <div className="flex items-center gap-3 bg-[var(--color-cream)] p-1 rounded-lg">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-[var(--color-muted)] hover:text-black transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="font-medium w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-[var(--color-muted)] hover:text-black transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="w-20 text-right font-bold">
                ${(item.price * item.quantity).toFixed(2)}
              </div>

              <button 
                onClick={() => updateQuantity(item.id, -item.quantity)}
                className="p-2 text-[var(--color-muted)] hover:text-[var(--color-red)] hover:bg-[#FFF0F0] rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-[var(--color-border)] shadow-sm sticky top-28">
            <h2 className="text-xl font-bold font-serif mb-6">Order Summary</h2>
            
            <div className="space-y-4 text-[var(--color-muted)] mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[var(--color-ink)] font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge (5%)</span>
                <span className="text-[var(--color-ink)] font-medium">${tax.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="h-px bg-[var(--color-border)] mb-6"></div>
            
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-2xl text-[var(--color-rust)]">${grandTotal.toFixed(2)}</span>
            </div>

            {!paymentStep ? (
              <button 
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-ink)] text-white py-4 rounded-xl font-medium hover:bg-black transition-colors"
              >
                Proceed to Checkout <ArrowRight size={18} />
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-[var(--color-cream)] p-4 rounded-xl mb-4 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <CreditCard size={16} className="text-[var(--color-muted)]" />
                    Payment Details (Mock)
                  </div>
                  <input type="text" placeholder="Card Number (0000 0000 ...)" className="w-full p-3 rounded-lg border border-[var(--color-border)] mb-2 text-sm outline-none focus:border-[var(--color-rust)]" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="MM/YY" className="w-full p-3 rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-rust)]" />
                    <input type="text" placeholder="CVC" className="w-full p-3 rounded-lg border border-[var(--color-border)] text-sm outline-none focus:border-[var(--color-rust)]" />
                  </div>
                </div>
                <button 
                  onClick={processPaymentAndOrder}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-rust)] text-white py-4 rounded-xl font-bold hover:bg-[var(--color-rust-dark)] transition-colors disabled:opacity-70"
                >
                  {processing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : `Pay $${grandTotal.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
