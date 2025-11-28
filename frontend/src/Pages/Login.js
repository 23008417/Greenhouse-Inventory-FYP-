import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || '';  // Relative for prod

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (data.user.role !== 'Buyer') {
          setError('Access denied: Use admin login if you are an admin');
          setLoading(false);
          return;
        }
        onLogin(data.token, data.user);
        navigate('/storepage');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-background">
      <header className="auth-header">
        <img src="/cropflow.png" alt="Cropflow Logo" className="auth-logo" />
        <span>Cropflow</span>
      </header>
      <div className="auth-card">
        <h2>Sign in to your account</h2>

        {error && <p className="error-message">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              Password
              <a href="/forgot-password" className="forgot-link">Forgot your password?</a>
            </label>
            <input type="password" id="password" name="password" required />
          </div>
          <div className="form-options">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Remember me on this device</label>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="separator">OR</div>
          <button type="button" className="google-button" disabled>
            <FcGoogle /> Sign in with Google (coming soon)
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