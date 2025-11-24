import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import './Auth.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
    navigate('/storepage');
  };

  return (
    <div className="auth-background">
      <header className="auth-header">
        <img src="/cropflow.png" alt="Cropflow Logo" className="auth-logo" />
        <span>Cropflow</span>
      </header>
      <div className="auth-card">
        <h2>Sign in to your account</h2>
        
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
        
        <p className="auth-footer-link">
          New to Cropflow? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;