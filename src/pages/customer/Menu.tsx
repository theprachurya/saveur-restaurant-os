import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useCart } from '../../contexts/CartContext';
import { Search, Plus } from 'lucide-react';

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

export default function CustomerMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const { addToCart } = useCart();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);
      
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching menu items', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'starters', 'mains', 'desserts', 'drinks'];

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      emoji_icon: item.emoji_icon,
      quantity: 1
    });
  };

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold font-serif mb-4">Our Menu</h1>
        <p className="text-[var(--color-muted)] max-w-2xl mx-auto">Fresh, seasonal ingredients prepared with care and precision.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={20} />
          <input 
            type="text" 
            placeholder="Search dishes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--color-border)] outline-none focus:border-[var(--color-rust)] transition-colors bg-white shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border ${
                category === c 
                  ? 'bg-[var(--color-rust)] border-[var(--color-rust)] text-white' 
                  : 'bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-rust)] hover:text-[var(--color-rust)]'
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[var(--color-muted)] py-20">Loading our selection...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2">No items found</h3>
          <p className="text-[var(--color-muted)]">Try adjusting your search or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="h-40 bg-[var(--color-cream)] flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-500">
                {item.emoji_icon}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h3 className="text-lg font-bold font-serif leading-tight">{item.name}</h3>
                  <span className="text-[var(--color-rust)] font-bold">${Number(item.price).toFixed(2)}</span>
                </div>
                <p className="text-[var(--color-muted)] text-sm mb-6 flex-1">{item.description}</p>
                <button 
                  onClick={() => handleAddToCart(item)}
                  disabled={item.stock <= 0}
                  className="w-full flex justify-center items-center gap-2 py-3 rounded-xl font-medium transition-colors border border-[var(--color-border)] hover:border-[var(--color-rust)] hover:bg-[var(--color-rust-light)] hover:text-[var(--color-rust-dark)] disabled:opacity-50 disabled:hover:border-[var(--color-border)] disabled:hover:bg-transparent"
                >
                  <Plus size={18} />
                  {item.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
