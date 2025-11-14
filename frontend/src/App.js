import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from './DashboardLayout';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import LandingPage from './Landingpage/LandingPage'; // Adjusted to capital 'P' in folder (confirm your actual casing)
import AdminLogin from './Pages/AdminLogin';

import './App.css';
import './Pages/Auth.css';
import './DashboardLayout.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
              <Navigate to="/" /> // Redirect to landing if not authenticated
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