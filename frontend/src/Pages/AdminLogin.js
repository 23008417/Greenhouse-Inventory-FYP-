import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom'; // Added import
import './Auth.css';

const AdminLogin = ({ onLogin }) => { // Renamed component to AdminLogin
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
    navigate('/dashboard'); // Lowercase to match route
  };

  return (
    <div className="auth-background">
      <header className="auth-header">
        <img src="/cropflow.png" alt="Cropflow Logo" className="auth-logo" />
        <span>Cropflow</span>
      </header>
      <div className="auth-card">
        <h2>Admin Sign In</h2>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              Password
              <a href="/forgot-password" className="forgot-link">Forgot your password?</a>
            </label>
            <input type="password" id="password" />
          </div>
          <div className="form-options">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Remember me on this device</label>
          </div>
          <button type="submit" className="auth-button">
            Sign in
          </button>
          <div className="separator">OR</div>
          <button type="button" className="google-button">
            <FcGoogle />
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;