import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdSettings, MdShoppingCart, MdLogout, MdSearch } from 'react-icons/md';
import './StorePage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const StorePage = ({ onLogout, user, cartItems, setCartItems }) => {
  const [cartCount, setCartCount] = useState(cartItems.length);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCartCount(cartItems.length);
  }, [cartItems]);

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/store/items`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (res.ok) {
          const mapped = (data.items || []).map(item => ({
            id: item.plant_id,
            name: item.name,
            price: Number(item.price) || 0,
            img: item.image_url?.startsWith('http')
              ? item.image_url
              : `${API_URL}${item.image_url}`,
          }));
          setProducts(mapped);
        } else {
          setError(data.error || 'Failed to load store items');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    setCartItems(prev => [...prev, product]);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email?.split('@')[0] || 'Friend';

  return (
    <div className="store-page">

      {/* Navbar - Minimal, fixed, icon-based */}
      <header className="store-navbar">
        <div className="store-logo">Cropflow</div>

        <div className="store-search-bar-container">
          <MdSearch className="store-search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="store-right-controls">
          <Link to="/settings" className="store-nav-link" title="Settings">
            <MdSettings />
          </Link>

          <Link to="/cartpage" className="store-nav-link" title="Cart">
            <MdShoppingCart /> <span className="cart-count">({cartCount})</span>
          </Link>

          <button onClick={onLogout} className="store-nav-link" title="Logout">
            <MdLogout />
          </button>
        </div>
      </header>

      {/* Main Content - Centered, minimal */}
      <div className="store-content-wrapper">
        <main className="store-main-content">

          <div className="store-section-header">
            <h1>Welcome, {displayName.toUpperCase()}!</h1>
            <h2>Featured Products</h2>
            <p className="store-result-count">{filteredProducts.length} Items</p>
          </div>

          {loading ? (
            <div className="store-no-results">
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="store-no-results">
              <p>{error}</p>
            </div>
          ) : (
            <div className="store-product-grid">
              {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="store-product-card">

                  <div className="store-card-image-wrapper">
                    <img src={product.img} alt={product.name} loading="lazy" />
                  </div>

                  <div className="store-card-details">
                    <h4>{product.name.toUpperCase()}</h4> {/* Uppercase for minimal bold */}
                    <p className="store-price">${product.price.toFixed(2)}</p>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className="store-add-btn"
                    >
                      Add
                    </button>
                  </div>

                </div>
              ))
              ) : (
                <div className="store-no-results">
                  <p>No Items Found</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StorePage;