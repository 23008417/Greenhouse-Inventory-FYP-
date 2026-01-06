import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const OrderConfirmation = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-background">
      <header className="auth-header">
        <span style={{ fontWeight: 600 }}>Cropflow</span>
      </header>

      <div className="auth-card">
        <h2>Order Confirmed</h2>
        <p>Your payment has been processed successfully.</p>
        <p>You can now return to the store or view your dashboard.</p>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button className="primary-btn" onClick={() => navigate('/storepage')}>
            Back to Store
          </button>
          <button className="secondary-btn" onClick={() => navigate('/LandingPage')}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
