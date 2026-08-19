import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Clock, ChefHat, CheckCircle2, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderItem {
  id: string;
  quantity: number;
  menu_items: {
    name: string;
    emoji_icon: string;
  };
}

interface Order {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();

      const channel = supabase
        .channel('schema-db-changes-customer')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount, created_at,
          order_items ( id, quantity, menu_items ( name, emoji_icon ) )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // @ts-ignore
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-muted)]">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-border)] shadow-sm max-w-2xl mx-auto mt-10">
        <div className="text-6xl mb-6">📜</div>
        <h2 className="text-2xl font-bold font-serif mb-4">No orders yet</h2>
        <p className="text-[var(--color-muted)] mb-8">You haven't placed any orders. Browse our menu to get started.</p>
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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold font-serif mb-8">My Orders</h1>
      <div className="space-y-6">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const isComplete = order.status === 'delivered' || order.status === 'cancelled';
  
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-cream)]/30">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-bold font-serif text-lg">Order #{order.id.slice(0, 8)}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              order.status === 'pending' ? 'bg-gray-100 text-gray-600' :
              order.status === 'preparing' ? 'bg-orange-100 text-orange-600' :
              order.status === 'ready' ? 'bg-green-100 text-green-700' :
              order.status === 'delivered' ? 'bg-[var(--color-sage-light)] text-[var(--color-sage)]' :
              'bg-red-100 text-red-600'
            }`}>
              {order.status}
            </span>
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            Placed on {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--color-muted)]">Total Amount</div>
          <div className="font-bold text-xl text-[var(--color-rust)]">${Number(order.total_amount).toFixed(2)}</div>
        </div>
      </div>
      
      {!isComplete && (
        <div className="p-6 border-b border-[var(--color-border)] bg-gray-50/50">
          <OrderTracker status={order.status} />
        </div>
      )}

      <div className="p-6">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-muted)] mb-4">Items</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.order_items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-[var(--color-cream)]/50 p-3 rounded-xl border border-[var(--color-border)]">
              <span className="text-2xl">{item.menu_items?.emoji_icon}</span>
              <div className="flex-1">
                <div className="font-medium">{item.menu_items?.name}</div>
                <div className="text-sm text-[var(--color-muted)]">Qty: {item.quantity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderTracker({ status }: { status: string }) {
  const steps = [
    { id: 'pending', label: 'Received', icon: Clock },
    { id: 'preparing', label: 'Preparing', icon: ChefHat },
    { id: 'ready', label: 'Ready', icon: Box },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2 }
  ];

  const currentIndex = steps.findIndex(s => s.id === status) >= 0 ? steps.findIndex(s => s.id === status) : 0;

  return (
    <div className="relative">
      <div className="absolute top-5 left-8 right-8 h-1 bg-gray-200 rounded-full"></div>
      <div 
        className="absolute top-5 left-8 h-1 bg-[var(--color-rust)] rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - ${currentIndex === 0 ? 0 : 32}px)` }}
      ></div>

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isActive = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 border-4 border-gray-50 ${
                isActive ? 'bg-[var(--color-rust)] text-white scale-110 shadow-sm' : 
                isCompleted ? 'bg-[var(--color-rust-light)] text-[var(--color-rust)]' : 
                'bg-gray-200 text-gray-400'
              }`}>
                {isCompleted && !isActive ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
              </div>
              <div className={`mt-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                isActive ? 'text-[var(--color-ink)]' : 
                isCompleted ? 'text-[var(--color-rust)]' : 
                'text-gray-400'
              }`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
