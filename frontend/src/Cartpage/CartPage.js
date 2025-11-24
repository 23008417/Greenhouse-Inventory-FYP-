import React from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";

const CartPage = ({ cartItems, setCartItems }) => {
  const navigate = useNavigate();

  const handleRemove = (index) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  return (
    <div className="modern-cart-container">

      <h1 className="modern-cart-title">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="modern-empty-cart">
          <p>Your cart is empty.</p>
          <button onClick={() => navigate("/storepage")} className="back-btn">
            Back to Store
          </button>
        </div>
      ) : (
        <div className="modern-cart-grid">
          
          {/* LEFT SIDE: ITEMS */}
          <div className="modern-cart-items">
            {cartItems.map((item, index) => (
              <div key={index} className="modern-cart-item">
                
                <img src={item.img || item.image} alt={item.name} className="modern-cart-img" />

                <div className="modern-cart-info">
                  <h3>{item.name}</h3>
                  <p className="modern-cart-price">${item.price}</p>
                </div>

                <button
                  className="modern-remove-btn"
                  onClick={() => handleRemove(index)}
                >
                  Remove
                </button>

              </div>
            ))}
          </div>

          {/* RIGHT SIDE: SUMMARY */}
          <div className="modern-summary-box">
            <h2>Order Summary</h2>
            <p className="summary-total-label">Total</p>
            <h3 className="summary-total-price">${totalPrice.toFixed(2)}</h3>

            <button className="checkout-btn">Checkout</button>
            <button className="back-btn" onClick={() => navigate("/storepage")}>
              Back to Store
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default CartPage;
