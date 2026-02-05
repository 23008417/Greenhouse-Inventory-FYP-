import React, { useState, useEffect } from 'react';
//import { Link } from 'react-router-dom';
import { MdSettings, MdShoppingCart, MdLogout, MdSearch, MdEvent } from 'react-icons/md';
import './StorePage.css';
import { API_URL, buildImageUrl } from '../apiConfig';
import { Link, useNavigate } from 'react-router-dom'; // Add useNavigate if missing

const CATEGORY_IMAGES = {
  // Workshop (Working): Planting/Hands-on
  Workshop: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",

  // Harvest (NEW): Basket of fresh crops
  Harvest: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80",
  // Wellness (NEW): Yoga/Peaceful
  Wellness: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
  // Education (Working): Tech/Science
  Education: "https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80",

  // Social (NEW): People gathering/Community
  Social: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80",

  // General (Working): Greenhouse wide shot
  General: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80"
};
const StorePage = ({ onLogout, user, cartItems, setCartItems }) => {
  const [cartCount, setCartCount] = useState(cartItems.length);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  // Event popup state (new customer events alert on store page)
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);

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

  // --- CHECK FOR NEW EVENTS (by updated_at time) ---
  useEffect(() => {
    if (!user || !user.id) return;

    fetch(`${API_URL}/api/announcements?type=Customer`)
      .then(res => res.json())
      .then(events => {
        if (events.length === 0) return;

        // Newest update time in the list
        const latestTime = Math.max(...events.map(e => new Date(e.updated_at).getTime()));

        // Last seen time for this user (stored in browser)
        const storageKey = `lastSeenEventTime_${user.id}`;
        const lastSeenTime = parseInt(localStorage.getItem(storageKey) || '0');

        // If DB has newer events, show the popup
        if (latestTime > lastSeenTime) {
          // Count how many items are new since last visit
          const newItemsCount = events.filter(e => new Date(e.updated_at).getTime() > lastSeenTime).length;
          setNewEventsCount(newItemsCount);
          setShowEventPopup(true);
        }
      })
      .catch(err => console.error("Event check failed", err));
  }, [user]);

  // Go to events page and mark latest events as seen
  
  const handleGoToEvents = () => {
    fetch(`${API_URL}/api/announcements?type=Customer`)
        .then(res => res.json())
        .then(events => {
            if (events.length > 0) {
                const latestTime = Math.max(...events.map(e => new Date(e.updated_at).getTime()));
                const storageKey = `lastSeenEventTime_${user.id}`;
                // Store latest time so popup won't show again for same events
                localStorage.setItem(storageKey, latestTime.toString());
            }
            navigate('/store/events');
        });
  };
  // ------------------------

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
          
          
          {/* Events nav button + badge (store popup uses this count) */}
          {/* UPDATED: Events Button with Red Badge */}
          {/* UPDATED: Events Button with Fixed Badge Positioning */}
          <div 
            onClick={handleGoToEvents} 
            className="store-nav-link" 
            title="Community Events" 
            style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}
          >
            {/* 1. Wrapper for Icon + Badge only */}
            <div style={{position: 'relative', display: 'flex'}}>
                <MdEvent size={22} />
                
                {/* Badge sits relative to the Icon now */}
                {newEventsCount > 0 && (
                    <span className="notification-badge" style={{top: '-6px', right: '-6px'}}>
                        {newEventsCount}
                    </span>
                )}
            </div>

            {/* 2. Text sits outside, safe from the badge */}
            <span className="cart-count" style={{fontSize: '10px'}}>EVENTS</span>
          </div>

          {/* Corrected Settings Link
          <Link to="/settings" className="store-nav-link" title="Settings">
            <MdSettings />
          </Link> */}

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

      {/* Popup shown when new events are detected */}
      {/* --- NEW EVENT POPUP --- */}
      {showEventPopup && (
        <div className="event-modal-overlay">
          <div className="event-modal-content">
            <div style={{fontSize: '40px', marginBottom: '10px'}}>🎉</div>
            <h2 className="event-modal-title">New Events Posted!</h2>
            <p className="event-modal-text">
              We have added <strong>{newEventsCount}</strong> new community event{newEventsCount > 1 ? 's' : ''}. 
              Check out our upcoming workshops and harvest sales.
            </p>
            
            <button className="event-modal-btn btn-primary" onClick={handleGoToEvents}>
              View Events
            </button>
            
            <button className="event-modal-btn btn-secondary" onClick={() => setShowEventPopup(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
