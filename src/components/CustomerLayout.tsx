import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, LogOut } from 'lucide-react';

export default function CustomerLayout() {
  const { signOut } = useAuth();
  const { items } = useCart();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/customer/menu" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif">Saveur</h1>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/customer/orders" 
              className={`text-sm font-medium transition-colors ${location.pathname === '/customer/orders' ? 'text-[var(--color-rust)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}
            >
              My Orders
            </Link>
            
            <Link to="/customer/cart" className="relative text-[var(--color-ink)] hover:text-[var(--color-rust)] transition-colors">
              <ShoppingBag size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--color-rust)] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            
            <div className="h-6 w-px bg-[var(--color-border)]"></div>
            
            <button onClick={handleSignOut} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors" title="Sign Out">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
