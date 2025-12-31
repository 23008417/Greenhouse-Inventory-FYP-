import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || '';  // Relative for prod

const Signup = ({ onLogin }) => {
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
    const firstName = formData.get('first-name');
    const lastName = formData.get('last-name');

    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      const data = await res.json();

      if (res.ok && data.token) {
        onLogin(data.token, data.user);
        navigate('/login');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
        <h2>Create your Cropflow account</h2>

        {error && <p className="error-message">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first-name">First name</label>
              <input type="text" id="first-name" name="first-name" />
            </div>
            <div className="form-group">
              <label htmlFor="last-name">Last name</label>
              <input type="text" id="last-name" name="last-name" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required minLength="6" />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {/* <div className="separator">OR</div>
          <button type="button" className="google-button" disabled>
            <FcGoogle /> Sign up with Google (coming soon)
          </button> */}
        </form>

        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;