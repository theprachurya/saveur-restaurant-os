import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerLayout from './components/OwnerLayout';
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerMenu from './pages/owner/Menu';
import OwnerOrders from './pages/owner/Orders';
import CustomerLayout from './components/CustomerLayout';
import CustomerMenu from './pages/customer/Menu';
import CustomerCart from './pages/customer/Cart';
import CustomerOrders from './pages/customer/Orders';
import { CartProvider } from './contexts/CartContext';
import { Loader2 } from 'lucide-react';

const RootRedirect = () => {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-rust)] h-8 w-8" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'owner') return <Navigate to="/owner/dashboard" replace />;
  if (role === 'customer') return <Navigate to="/customer/menu" replace />;
  
  return <div className="p-8">Setting up profile...</div>;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Owner Routes */}
            <Route element={<ProtectedRoute allowedRole="owner" />}>
              <Route element={<OwnerLayout />}>
                <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                <Route path="/owner/menu" element={<OwnerMenu />} />
                <Route path="/owner/orders" element={<OwnerOrders />} />
              </Route>
            </Route>
            
            {/* Customer Routes */}
            <Route element={<ProtectedRoute allowedRole="customer" />}>
              <Route element={<CustomerLayout />}>
                <Route path="/customer/menu" element={<CustomerMenu />} />
                <Route path="/customer/cart" element={<CustomerCart />} />
                <Route path="/customer/orders" element={<CustomerOrders />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
