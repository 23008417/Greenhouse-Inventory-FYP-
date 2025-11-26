import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from './DashboardLayout';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import LandingPage from './Landingpage/LandingPage'; 
import AdminLogin from './Pages/AdminLogin';
import StorePage from './Storepage/StorePage';
import CartPage from './Cartpage/CartPage';

import './App.css';
import './Pages/Auth.css';
import './DashboardLayout.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Set LandingPage as the root/landing page */}
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        
        <Route path="/signup" element={<Signup onLogin={handleLogin} />} />

        <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin} />} /> {/* Standardized to hyphen */}
        
        {/* Protected dashboard routes */}
        <Route 
          path="/dashboard/*" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/" /> 
            )
          } 
        />

        <Route 
          path="/storepage/*" 
          element={
            isAuthenticated ? (
              <StorePage 
                onLogout={handleLogout}
                cartItems={cartItems}
                setCartItems={setCartItems}
              />
            ) : (
              <Navigate to="/" />
           )
         }
       />
        <Route
          path="/cartpage"
          element={
            isAuthenticated ? (
              <CartPage
                cartItems={cartItems}
                setCartItems={setCartItems}
              />
            ) : (
              <Navigate to="/storepage" />
            )
          }
        />

       
        {/* Optional: Redirect any other paths to landing */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;