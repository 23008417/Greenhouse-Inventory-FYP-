import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const navigate = useNavigate();

  const handleBackToStore = () => {
    navigate('/storepage');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="order-confirmation-page">
      <div className="order-confirmation-card">
        <h1 className="order-confirmation-title">Order Confirmed</h1>
        <p className="order-confirmation-message">Your payment has been processed successfully.</p>
        <p className="order-confirmation-message">You can return to the store or sign out.</p>

        <div className="order-confirmation-actions">
          <button
            className="order-confirmation-btn primary"
            onClick={handleBackToStore}
          >
            Back to Store
          </button>
          <button
            className="order-confirmation-btn secondary"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
