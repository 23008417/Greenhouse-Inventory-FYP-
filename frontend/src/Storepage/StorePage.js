import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdSettings, MdShoppingCart, MdLogout, MdSearch } from 'react-icons/md';
import './StorePage.css';

// Dummy Product Data
const PRODUCT_DATA = [
  { id: 1, name: 'Organic Tomato Seeds', price: 4.99, img: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&q=80' },
  { id: 2, name: 'Heavy Duty Trowel', price: 12.50, img: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb375?w=400&q=80' },
  { id: 3, name: 'Nitrogen Fertilizer', price: 24.99, img: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=400&q=80' },
  { id: 4, name: 'Ceramic Pot (Large)', price: 35.00, img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80' },
  { id: 5, name: 'Garden Hose (50ft)', price: 29.99, img: 'https://images.unsplash.com/photo-1596627767797-75c62667836d?w=400&q=80' },
  { id: 6, name: 'Basil Herb Pack', price: 3.99, img: 'https://images.unsplash.com/photo-1618159878253-84cf6674df7d?w=400&q=80' },
  { id: 7, name: 'Watering Can', price: 15.99, img: 'https://images.unsplash.com/photo-1599688753563-6410b850b830?w=400&q=80' },
  { id: 8, name: 'Indoor Potting Mix', price: 8.99, img: 'https://images.unsplash.com/photo-1612363228684-099593ae0162?w=400&q=80' },
];

const StorePage = ({
  onLogout,
  user,                    
  cartItems,          
  setCartItems  
}) => {
  const [cartCount, setCartCount] = useState(cartItems.length);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCartCount(cartItems.length);
  }, [cartItems]);

  const handleAddToCart = (product) => {
    setCartItems(prev => [...prev, product]);
  };

  const filteredProducts = PRODUCT_DATA.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email?.split('@')[0] || 'Friend';

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
          <Link to="/settings" className="store-nav-link">
            <MdSettings /> Settings
          </Link>

          <Link to="/cartpage" className="store-nav-link">
            <MdShoppingCart /> Cart ({cartCount})
          </Link>

          <button onClick={onLogout} className="store-nav-link">
            <MdLogout /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="store-content-wrapper">
        <main className="store-main-content">

          <div className="store-section-header">
            <h1>Welcome, {displayName}!</h1>
            <h2>Featured Products</h2>
            <p className="store-result-count">{filteredProducts.length} items found</p>
          </div>

          <div className="store-product-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="store-product-card">

                  <div className="store-card-image-wrapper">
                    <img src={product.img} alt={product.name} loading="lazy" />
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