import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from './DashboardLayout';
import Login from './Pages/Login';
import Signup from './Pages/Signup';

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
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        
        <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
        
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <DashboardLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;