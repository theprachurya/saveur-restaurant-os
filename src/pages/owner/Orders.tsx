import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { CheckCircle2, Clock, ChefHat } from 'lucide-react';

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
  profiles: {
    full_name: string;
  };
  order_items: OrderItem[];
}

export default function OwnerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to new orders or status updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // Re-fetch orders when they change
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount, created_at,
          profiles ( full_name ),
          order_items ( id, quantity, menu_items ( name, emoji_icon ) )
        `)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      // @ts-ignore
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      // Optimistic update
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus as any } : o).filter(o => newStatus !== 'delivered' && newStatus !== 'cancelled' || o.id !== id));
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2 flex items-center gap-3">
          Live Kitchen Display <span className="flex h-3 w-3"><span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
        </h1>
        <p className="text-[var(--color-muted)]">Real-time incoming orders queue</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Column */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-[var(--color-border)] min-h-[500px]">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4 flex items-center gap-2">
            <Clock size={18} className="text-orange-500" /> Pending ({orders.filter(o => o.status === 'pending').length})
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'pending').map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} nextStatus="preparing" nextLabel="Accept & Prepare" actionColor="bg-[var(--color-rust)] hover:bg-[var(--color-rust-dark)] text-white" />
            ))}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="bg-orange-50/30 rounded-2xl p-4 border border-orange-100 min-h-[500px]">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4 flex items-center gap-2">
            <ChefHat size={18} className="text-[var(--color-rust)]" /> Preparing ({orders.filter(o => o.status === 'preparing').length})
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'preparing').map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} nextStatus="ready" nextLabel="Mark Ready" actionColor="bg-orange-500 hover:bg-orange-600 text-white" />
            ))}
          </div>
        </div>

        {/* Ready Column */}
        <div className="bg-green-50/30 rounded-2xl p-4 border border-green-100 min-h-[500px]">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[var(--color-sage)]" /> Ready ({orders.filter(o => o.status === 'ready').length})
          </h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'ready').map(order => (
              <OrderCard key={order.id} order={order} onUpdate={updateStatus} nextStatus="delivered" nextLabel="Mark Delivered" actionColor="bg-[var(--color-sage)] hover:bg-green-700 text-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onUpdate, nextStatus, nextLabel, actionColor }: any) {
  const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white p-4 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3 border-b border-[var(--color-border)] pb-3">
        <div>
          <div className="font-bold text-lg text-[var(--color-ink)]">#{order.id.slice(0, 6)}</div>
          <div className="text-sm text-[var(--color-muted)]">{order.profiles?.full_name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-[var(--color-muted)]">{timeStr}</div>
          <div className="font-medium text-[var(--color-rust)]">${Number(order.total_amount).toFixed(2)}</div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {order.order_items.map((item: any) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <span className="font-medium text-[var(--color-ink)]">{item.quantity}x</span>
            <span>{item.menu_items?.emoji_icon}</span>
            <span className="text-[var(--color-muted)]">{item.menu_items?.name}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onUpdate(order.id, nextStatus)}
          className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${actionColor}`}
        >
          {nextLabel}
        </button>
        {order.status === 'pending' && (
          <button 
            onClick={() => onUpdate(order.id, 'cancelled')}
            className="px-3 py-2 border border-[var(--color-red)] text-[var(--color-red)] rounded-lg hover:bg-[#FFF0F0] text-sm font-medium transition-colors"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
