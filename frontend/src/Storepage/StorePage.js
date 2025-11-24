import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdSettings, MdShoppingCart, MdLogout, MdSearch } from 'react-icons/md';
import './StorePage.css';

// Dummy Data
const PRODUCT_DATA = [
  { id: 1, name: 'Organic Tomato Seeds', price: 4.99, img: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&q=80' },
  { id: 2, name: 'White petaled flower', price: 12.50, img: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 3, name: 'White rose', price: 24.99, img: 'https://plus.unsplash.com/premium_photo-1677178628425-84a64dc416b6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGZsb3dlcnN8ZW58MHx8MHx8fDA%3D' },
  { id: 4, name: 'X plant', price: 35.00, img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80' },
  { id: 5, name: 'Yellow Daisy', price: 29.99, img: 'https://images.unsplash.com/photo-1762543787011-186cfe6f1019?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 6, name: 'Cactus', price: 3.99, img: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGZsb3dlciUyMHBvdHxlbnwwfHwwfHx8MA%3D%3D' },
  { id: 7, name: 'Sunflower', price: 15.99, img: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjh8fGZsb3dlcnN8ZW58MHx8MHx8fDA%3D' },
  { id: 8, name: 'pink flower pot', price: 8.99, img: 'https://plus.unsplash.com/premium_photo-1676499654686-47fb4412f18a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Zmxvd2VyJTIwcG90fGVufDB8fDB8fHww' },
];

const StorePage = ({ onLogout, cartItems, setCartItems }) => {
  const [cartCount, setCartCount] = useState(cartItems.length);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddToCart = (product) => {
    setCartItems(prev => [...prev, product]);  // FIX
    setCartCount(prev => prev + 1);
  };

  const filteredProducts = PRODUCT_DATA.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="store-page">

      {/* Navbar */}
      <header className="store-navbar">
        <div className="store-logo">Cropflow</div>

        <div className="store-search-bar-container">
          <MdSearch className="store-search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="store-right-controls">
          <Link to="/settings" className="store-nav-link"><MdSettings /> Settings</Link>

          <Link to="/cartpage" className="store-nav-link">
            <MdShoppingCart /> Cart ({cartCount})
          </Link>

          <button onClick={onLogout} className="store-nav-link">
            <MdLogout /> Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="store-content-wrapper">
        <main className="store-main-content">

          <div className="store-section-header">
            <h2>Featured Products</h2>
            <p className="store-result-count">{filteredProducts.length} items found</p>
          </div>

          <div className="store-product-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="store-product-card">

                  <div className="store-card-image-wrapper">
                    <img src={product.img} alt={product.name} />
                  </div>

                  <div className="store-card-details">
                    <h4>{product.name}</h4>
                    <p className="store-price">${product.price.toFixed(2)}</p>

                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="store-add-btn"
                    >
                      Add to Cart
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="store-no-results">
                <p>No products found.</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default StorePage;
