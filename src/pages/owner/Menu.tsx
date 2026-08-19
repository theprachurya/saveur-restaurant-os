import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  is_available: boolean;
  emoji_icon: string;
}

export default function OwnerMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching menu items', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id: string, current: boolean, stock: number) => {
    if (!current && stock <= 0) {
      alert("Cannot enable item with zero stock.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !current })
        .eq('id', id);
        
      if (error) throw error;
      setItems(items.map(item => item.id === id ? { ...item, is_available: !current } : item));
    } catch (err) {
      console.error('Error toggling availability', err);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting item', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Menu Management</h1>
          <p className="text-[var(--color-muted)]">Manage dishes, prices, and availability</p>
        </div>
        <button className="flex items-center gap-2 bg-[var(--color-rust)] text-white px-4 py-2 rounded-xl hover:bg-[var(--color-rust-dark)] transition-colors">
          <Plus size={20} />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-cream)] border-b border-[var(--color-border)]">
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-muted)]">Loading menu...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--color-muted)]">No menu items found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl bg-[var(--color-cream)] w-12 h-12 flex items-center justify-center rounded-xl">{item.emoji_icon}</span>
                      <div>
                        <div className="font-medium text-[var(--color-ink)]">{item.name}</div>
                        <div className="text-sm text-[var(--color-muted)] max-w-xs truncate">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-[var(--color-ink)]">{item.category}</td>
                  <td className="px-6 py-4 font-medium text-[var(--color-ink)]">${Number(item.price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-[var(--color-ink)]">{item.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.is_available ? 'bg-[var(--color-sage-light)] text-[var(--color-sage)]' : 'bg-[#FFF0F0] text-[var(--color-red)]'
                    }`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors rounded-lg hover:bg-gray-100">
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => toggleAvailability(item.id, item.is_available, item.stock)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                          item.is_available 
                            ? 'border-[var(--color-red)] text-[var(--color-red)] hover:bg-[#FFF0F0]' 
                            : 'border-[var(--color-sage)] text-[var(--color-sage)] hover:bg-[var(--color-sage-light)]'
                        }`}
                      >
                        {item.is_available ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-[var(--color-red)] hover:bg-[#FFF0F0] transition-colors rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
