import React from "react";
import { useNavigate } from "react-router-dom";
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import "./CartPage.css";

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://cropflow-backend.onrender.com';

//const API_URL = process.env.REACT_APP_API_URL || '';  // Relative for prod

const CartPage = ({ cartItems, setCartItems, user }) => {
  const navigate = useNavigate();

  const handleRemove = (index) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  const handlePayPalSuccess = async (orderID) => {
    try {
      const res = await fetch(`${API_URL}/api/paypal/capture`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`  // Auth token
        },
        body: JSON.stringify({
          orderID,
          items: cartItems.map(item => ({  // Map to DB fields
            plant_id: item.id,
            quantity_purchased: 1,  // Assume 1; track qty if added
            unit_price_at_sale: item.price
          })),
          total: totalPrice
        })
      });

      const backendData = await res.json();
      if (backendData.success) {
        alert('Order confirmed! Thank you.');
        setCartItems([]);
        navigate('/order-confirmation');  // Optional route
      } else {
        const msg = backendData.error || 'Order confirmation failed.';
        alert(msg);
      }
    } catch (err) {
      console.error('Backend error:', err);
      alert('Server error. Please contact support.');
    }
  };

  return (
    <div className="cart-container">
      <h1 className="cart-title">Cart</h1> {/* Uppercase minimal */}

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Empty</p>
          <button onClick={() => navigate("/storepage")} className="back-btn">
            Store
          </button>
        </div>
      ) : (
        <div className="cart-grid">
          
          {/* LEFT: Items - Simple list */}
          <div className="cart-items">
            {cartItems.map((item, index) => (
              <div key={index} className="cart-item">
                
                <img src={item.img || item.image} alt={item.name.toUpperCase()} className="cart-img" />

                <div className="cart-info">
                  <h3>{item.name.toUpperCase()}</h3>
                  <p className="cart-price">${item.price}</p>
                </div>

                <button
                  className="remove-btn"
                  onClick={() => handleRemove(index)}
                >
                  Remove
                </button>

              </div>
            ))}
          </div>

          {/* RIGHT: Summary - Enhanced with full checkout form */}
          <div className="summary-box">
            <h2>Summary</h2>
            <p className="summary-total-label">Total</p>
            <h3 className="summary-total-price">${totalPrice.toFixed(2)}</h3>

            {/* <div className="checkout-section">
              <h3>Contact Information</h3>
              <input type="email" placeholder="Email" className="input" />
              <input type="tel" placeholder="Phone (optional)" className="input" />
            </div> */}

            <div className="checkout-section">
              <h3>Payment</h3>
              <div className="payment-options">
                {/* PayPal Button Integration */}
                {(() => {
                  const [{ isPending }] = usePayPalScriptReducer();  // Check loading state

                  if (isPending) return <p>Loading PayPal...</p>;

                  return (
                    <PayPalButtons
                      style={{ layout: "horizontal", color: "gold", label: "paypal" }}  // Includes logo; gold for yellow style
                      createOrder={(data, actions) => {
                        const currency = 'SGD';
                        const items = cartItems.map(item => ({
                          name: item.name,
                          sku: String(item.id ?? ''),
                          unit_amount: {
                            currency_code: currency,
                            value: Number(item.price || 0).toFixed(2),
                          },
                          quantity: '1',
                        }));

                        return actions.order.create({
                          purchase_units: [{
                            amount: {
                              currency_code: currency,
                              value: totalPrice.toFixed(2),
                              breakdown: {
                                item_total: {
                                  currency_code: currency,
                                  value: totalPrice.toFixed(2),
                                },
                              },
                            },
                            items,
                          }],
                        });
                      }}
                      onApprove={async (data, actions) => {
                        const order = await actions.order.capture();
                        console.log("Payment captured client-side:", order);
                        // Call backend to confirm and store
                        await handlePayPalSuccess(data.orderID);
                      }}
                      onError={(err) => {
                        console.error("PayPal error:", err);  // Handle errors
                        alert("Payment failed. Please try again.");
                      }}
                    />
                  );
                })()}
              </div>
              {/* <p>Or Credit Card</p> */}
              {/* <input type="text" placeholder="Card Number" className="input" />
              <input type="text" placeholder="Cardholder Name" className="input" />
              <input type="text" placeholder="Expiration Date (MM/YY)" className="input" />
              <input type="text" placeholder="CVV" className="input" /> */}
            </div>

            {/* <div className="checkout-section">
              <h3>Shipping Address</h3>
              <input type="text" placeholder="Full Name" className="input" />
              <input type="text" placeholder="Address Line 1" className="input" />
              <input type="text" placeholder="Address Line 2 (optional)" className="input" />
              <input type="text" placeholder="City" className="input" />
              <input type="text" placeholder="State/Province" className="input" />
              <input type="text" placeholder="ZIP/Postal Code" className="input" />
              <input type="text" placeholder="Country" className="input" />
            </div> */}

            {/* <div className="checkout-section">
              <h3>Billing Details</h3>
              <label>
                <input type="checkbox" /> Same as Shipping Address
              </label>
              
              <input type="text" placeholder="Full Name" className="input" />
              <input type="text" placeholder="Address Line 1" className="input" />
              <input type="text" placeholder="Address Line 2 (optional)" className="input" />
              <input type="text" placeholder="City" className="input" />
              <input type="text" placeholder="State/Province" className="input" />
              <input type="text" placeholder="ZIP/Postal Code" className="input" />
              <input type="text" placeholder="Country" className="input" />
            </div> */}


            {/* <button className="checkout-btn">Confirm Order</button> */}
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