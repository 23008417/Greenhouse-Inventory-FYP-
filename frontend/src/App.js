import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';  // Import here
import DashboardLayout from './DashboardLayout';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import LandingPage from './Landingpage/LandingPage';
import AdminLogin from './Pages/AdminLogin';
import StorePage from './Storepage/StorePage';
import CartPage from './Cartpage/CartPage';
import OrderConfirmation from './Pages/OrderConfirmation';
import ProtectedRoute from './ProtectedRoute';
import './App.css';
import './Pages/Auth.css';
import './DashboardLayout.css';
import { API_URL } from './apiConfig';
import StoreEvents from './Storepage/StoreEvents';

const paypalOptions = {
  "client-id": process.env.REACT_APP_PAYPAL_CLIENT_ID || 'AWuacnvx2o_IhKJ6DLq4o8tk75LlO2ovipWzZ1cncKfrkGB2-zlOvSSBwp7leO401oMHK6U7eZrLkdWo',  // Fallback for dev; use your real ID
  currency: "SGD",
  intent: "capture"
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);  // Shared cart state

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCartItems([]);  // Optional: Clear cart on logout
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
          <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin} />} />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute user={user} requiredRole="Admin">
                <DashboardLayout onLogout={handleLogout} user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storepage/*"
            element={
              <ProtectedRoute user={user} requiredRole="Buyer">
                <StorePage onLogout={handleLogout} user={user} cartItems={cartItems} setCartItems={setCartItems} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cartpage"
            element={
              <ProtectedRoute user={user} requiredRole="Buyer">
                <CartPage cartItems={cartItems} setCartItems={setCartItems} />
              </ProtectedRoute>
            }
          />

          {/* NEW: Customer Events Page */}
          <Route
            path="/store/events"
            element={
              <ProtectedRoute user={user} requiredRole="Buyer">
                <StoreEvents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/order-confirmation"
            element={
              <ProtectedRoute user={user} requiredRole="Buyer">
                <OrderConfirmation />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;