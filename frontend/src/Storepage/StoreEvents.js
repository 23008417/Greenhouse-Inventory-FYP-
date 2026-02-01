import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdEvent, MdAccessTime, MdLocationOn, MdTimer, MdThumbUp, MdCheck } from 'react-icons/md';
import { API_URL } from '../apiConfig';
import './StorePage.css'; // Reusing your existing CSS

const StoreEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // FETCH ONLY CUSTOMER EVENTS
    fetch(`${API_URL}/api/announcements?type=Customer`)
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (events.length === 0) return;

    const updateTimers = () => {
      const newCountdowns = {};
      const now = new Date();

      events.forEach(event => {
        // 1. Get Date parts
        // This creates a date object and automatically adjusts it to your local timezone (SGT)
        const tempDate = new Date(event.event_date);
        const y = tempDate.getFullYear();
        const m = tempDate.getMonth() + 1; // getMonth is 0-indexed
        const d = tempDate.getDate();

        // 2. Get Time parts
        let hours = 9;
        let minutes = 0;
        let timePart = event.start_time || "09:00 AM";

        if (timePart.toLowerCase().includes('am') || timePart.toLowerCase().includes('pm')) {
          const match = timePart.match(/(\d+):(\d+)\s*(am|pm)/i);
          if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            const modifier = match[3].toLowerCase();
            if (hours === 12) hours = 0;
            if (modifier === 'pm') hours += 12;
          }
        } else {
          const parts = timePart.split(':');
          hours = parseInt(parts[0] || 9, 10);
          minutes = parseInt(parts[1] || 0, 10);
        }

        // Create the final target date in local time
        const target = new Date(y, m - 1, d, hours, minutes, 0);
        const diff = target.getTime() - now.getTime();

        if (diff > 0) {
          const totalSecs = Math.floor(diff / 1000);
          const days = Math.floor(totalSecs / (3600 * 24));
          const hrs = Math.floor((totalSecs % (3600 * 24)) / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;

          if (days > 0) {
            newCountdowns[event.id] = `${days}d ${hrs}h ${mins}m`;
          } else {
            newCountdowns[event.id] = `${hrs}h ${mins}m ${secs}s`;
          }
        } else {
          newCountdowns[event.id] = "LIVE NOW";
        }
      });
      setCountdowns(newCountdowns); // Move this OUTSIDE the forEach
    };

    const interval = setInterval(updateTimers, 1000);
    updateTimers();
    return () => clearInterval(interval);
  }, [events]);

  // Helper to check if this browser has already clicked
  const hasUserClicked = (eventId) => {
    return localStorage.getItem(`interest_${eventId}`);
  };

  // Force re-render helper
  const [dummyState, setDummyState] = useState(0);

  const handleInterest = async (id) => {
    const isClicked = hasUserClicked(id);
    const endpoint = isClicked ? 'uninterest' : 'interest';
    const math = isClicked ? -1 : 1;

    try {
      // 1. Call API
      await fetch(`${API_URL}/api/announcements/${id}/${endpoint}`, { method: 'POST' });

      // 2. Update UI Counter Locally
      setEvents(prev => prev.map(e =>
        e.id === id ? { ...e, interested_count: (e.interested_count || 0) + math } : e
      ));

      // 3. Toggle LocalStorage
      if (isClicked) {
        localStorage.removeItem(`interest_${id}`);
      } else {
        localStorage.setItem(`interest_${id}`, 'true');
      }

      // 4. Force refresh to update button color immediately
      setDummyState(prev => prev + 1);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="store-page">
      {/* Simple Header for Navigation */}
      <div className="store-back-btn-container">
        <button onClick={() => navigate('/storepage')} className="store-back-btn">
            <MdArrowBack /> Back to Shop
        </button>
      </div>

      <div className="store-content-wrapper" style={{marginTop: '0'}}>
        <main className="store-main-content">
          
          <div className="store-events-header">
            <h1>Community Events</h1>
            <p>Workshops & Harvest Days</p>
          </div>

          {loading ? (
            <div className="store-no-results"><p>Loading...</p></div>
          ) : (
            <div className="store-product-grid">
                {events.length === 0 && (
                    <div className="store-no-results" style={{gridColumn: '1/-1'}}>
                        <p>No upcoming events scheduled.</p>
                    </div>
                )}

                {events.map(event => (
                    <div key={event.id} className="store-event-card">
                    <div className={`store-ticker-badge ${countdowns[event.id] === "LIVE NOW" ? 'is-live' : ''}`}>
                      <span className="ticker-dot"></span>
                      <MdTimer size={12} style={{ marginRight: '4px' }} />
                      {countdowns[event.id] || "..."}
                    </div>
                        <div>
                            <span className="store-event-date-badge">
                                {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            <h3 className="store-event-title">{event.title}</h3>
                            <p className="store-event-desc">{event.description}</p>
                        </div>
                        
                        <div className="store-event-meta">
                            <div><MdAccessTime size={16}/> {event.start_time}</div>
                            <div><MdLocationOn size={16}/> {event.location}</div>
                        </div>

                    <button
                      onClick={() => handleInterest(event.id)}
                      style={{
                        width: '100%',
                        marginTop: '15px',
                        padding: '10px',
                        // Green background if clicked, White if not
                        background: hasUserClicked(event.id) ? '#ecfdf5' : 'white',
                        color: '#059669',
                        border: '1px solid #059669',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: '0.2s'
                      }}
                    >
                      {hasUserClicked(event.id) ? (
                        <><MdCheck /> REGISTERED (Click to Undo)</>
                      ) : (
                        <><MdThumbUp /> I'M INTERESTED </>
                      )}
                    </button>
                    </div>
                ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StoreEvents;