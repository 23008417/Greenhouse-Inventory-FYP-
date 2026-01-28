import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdEvent, MdAccessTime, MdLocationOn } from 'react-icons/md';
import { API_URL } from '../apiConfig';
import './StorePage.css'; // Reusing your existing CSS

const StoreEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
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