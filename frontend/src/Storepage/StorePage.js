import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdSettings, MdShoppingCart, MdLogout, MdSearch } from 'react-icons/md';
import './StorePage.css';
import { API_URL, buildImageUrl } from '../apiConfig';

const StorePage = ({ onLogout, user, cartItems, setCartItems }) => {
  const [cartCount, setCartCount] = useState(cartItems.length);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

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
            stock: item.quantity,
            price: Number(item.price) || 0,
            img: buildImageUrl(item.image_url),
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

  const changeQuantity = (productId, stock, delta) => {
    const max = Number.isFinite(Number(stock)) ? Number(stock) : Infinity;
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const clampedCurrent = Math.min(max, Math.max(1, current));
      const next = Math.min(max, Math.max(1, clampedCurrent + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product) => {
    const max = Number.isFinite(Number(product.stock)) ? Number(product.stock) : Infinity;
    if (max <= 0) return; // Sold out, do nothing
    const selected = quantities[product.id] || 1;
    const qty = Math.min(max, Math.max(1, selected));
    const itemToAdd = { ...product, quantity: qty };
    setCartItems(prev => [...prev, itemToAdd]);
    setToast(`${product.name.toUpperCase()} x${qty} added to cart`);
    setTimeout(() => setToast(null), 2000);
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

        {/* <div className="store-search-bar-container">
          <MdSearch className="store-search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div> */}

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
              filteredProducts.map((product) => {
                const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
                const isSoldOut = stock <= 0;
                const qty = quantities[product.id] || 1;
                return (
                  <div key={product.id} className={`store-product-card${isSoldOut ? ' sold-out' : ''}`}>

                    <div className="store-card-image-wrapper">
                      <img src={product.img} alt={product.name} loading="lazy" />
                      {!isSoldOut && (
                        <div className="store-quantity-controls">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeQuantity(product.id, product.stock, -1);
                            }}
                          >
                            -
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeQuantity(product.id, product.stock, 1);
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="store-card-details">
                      {isSoldOut && (
                        <p className="store-sold-out-label">Sold Out</p>
                      )}
                      <h4>{product.name.toUpperCase()}</h4>
                      <p className="store-price">${product.price.toFixed(2)}</p>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isSoldOut}
                        className={`store-add-btn${isSoldOut ? ' disabled' : ''}`}
                      >
                        {isSoldOut ? 'Sold Out' : 'Add'}
                      </button>
                    </div>

                  </div>
                );
              })
              ) : (
                <div className="store-no-results">
                  <p>No Items Found</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {toast && (
        <div className="store-toast">
          {toast}
        </div>
      )}
    </div>
  );
};

export default StorePage;