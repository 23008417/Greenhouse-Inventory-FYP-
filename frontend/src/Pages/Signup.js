import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import './Auth.css';

const Signup = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
    navigate('/');
  };

  return (
    <div className="auth-background">
      <header className="auth-header">
        <img src="/cropflow.png" alt="Cropflow Logo" className="auth-logo" />
        <span>Cropflow</span>
      </header>
      <div className="auth-card">
        <h2>Create your Cropflow account</h2>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first-name">First name</label>
              <input type="text" id="first-name" />
            </div>
            <div className="form-group">
              <label htmlFor="last-name">Last name</label>
              <input type="text" id="last-name" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" />
          </div>
          <button type="submit" className="auth-button">
            Create account
          </button>
          <div className="separator">OR</div>
          <button type="button" className="google-button">
            <FcGoogle />
            Sign up with Google
          </button>
        </form>
        
        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;