import React from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link import
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/signup');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="main-container">
      <div className="left-section">
        <img src="/cropflowinvert.png" alt="Cropflow Logo" className="logo-image" /> {/* Removed unnecessary braces */}
      </div>
      <div className="right-section">
        <h1>Bringing life to your space.</h1>
        <h2>Join today.</h2>
        <button className="create-account" onClick={handleSignUp}>Sign up</button>
        <p className="legal">
          By signing up, you agree to the <a href="/tos">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a>, including{" "}
          <a href="/cookies">Cookie Use</a>.
        </p>
        <div className="divider">OR</div>
        <p>Already have an account?</p>
        <button className="sign-in" onClick={handleSignIn}>Sign in</button>
        <hr className="separator" />
        <Link to="/admin-login" className="admin-login-link"> {/* Updated path to match App.js */}
          Admin? Login here.
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;