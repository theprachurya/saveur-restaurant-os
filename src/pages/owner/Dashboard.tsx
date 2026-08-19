import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { DollarSign, Clock, Package, TrendingUp } from 'lucide-react';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  activeItems: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    activeItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // Fetch today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', today.toISOString());

        const todayOrders = ordersData?.length || 0;
        const todayRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

        // Fetch pending orders (all time)
        const { count: pendingCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'preparing', 'ready']);

        // Fetch active menu items
        const { count: activeCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true);

        setStats({
          todayRevenue,
          todayOrders,
          pendingOrders: pendingCount || 0,
          activeItems: activeCount || 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">Dashboard</h1>
        <p className="text-[var(--color-muted)]">Overview of today's operations</p>
      </div>

      {loading ? (
        <div className="text-[var(--color-muted)]">Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Today's Revenue"
            value={`$${stats.todayRevenue.toFixed(2)}`}
            icon={DollarSign}
            color="text-[var(--color-gold)]"
            bg="bg-[var(--color-gold-light)]"
          />
          <StatCard
            title="Today's Orders"
            value={stats.todayOrders.toString()}
            icon={TrendingUp}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders.toString()}
            icon={Clock}
            color="text-orange-600"
            bg="bg-orange-50"
            subtitle="Needs attention"
          />
          <StatCard
            title="Active Menu Items"
            value={stats.activeItems.toString()}
            icon={Package}
            color="text-[var(--color-sage)]"
            bg="bg-[var(--color-sage-light)]"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, subtitle }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{title}</h3>
        <div className={`p-2 rounded-lg ${bg} ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className={`text-3xl font-serif font-bold ${color}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-[var(--color-muted)] mt-2">
          {subtitle}
        </div>
      )}
    </div>
  );
}
