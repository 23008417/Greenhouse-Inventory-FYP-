import React, { useEffect, useState } from 'react';
// FIX: Using react-icons instead of lucide-react
import { FiClock, FiMapPin, FiPlus, FiTrash2, FiX, FiEdit } from 'react-icons/fi';
import { API_URL } from '../apiConfig'; 
import './EventsPage.css';

const CATEGORY_IMAGES = {
  // Workshop (Working): Planting/Hands-on
  Workshop: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",

  // Harvest (NEW): Basket of fresh crops
  Harvest: "https://images.unsplash.com/photo-1615486511484-92e172cc416d?auto=format&fit=crop&w=800&q=80",

  // Wellness (NEW): Yoga/Peaceful
  Wellness: "https://images.unsplash.com/photo-1544367563-12123d832d34?auto=format&fit=crop&w=800&q=80",

  // Education (Working): Tech/Science
  Education: "https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=800&q=80",

  // Social (NEW): People gathering/Community
  Social: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80",

  // General (Working): Greenhouse wide shot
  General: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80"
};

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null); // Null = Create Mode, Number = Edit Mode
  
  // Form State
  const [formData, setFormData] = useState({
    title: '', 
    event_date: '', 
    start_time: '', 
    location: '', 
    description: '', 
    category: 'Workshop', 
    audience: 'Staff' // <--- ADD THIS
  });

  // 1. Fetch Events from Database
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  // 2. Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this announcement from the digital signage?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents(); // Refresh list
    } catch (err) {
      alert("Failed to delete");
    }
  };

  // 3. Handle Create OR Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Determine URL and Method based on mode
    const url = editingId 
      ? `${API_URL}/api/announcements/${editingId}` 
      : `${API_URL}/api/announcements`;
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowForm(false);
        setEditingId(null); // Reset mode
        setFormData({ title: '', event_date: '', start_time: '', location: '', description: '', category: 'Workshop', audience: 'Staff' });        fetchEvents(); // Refresh list
      }
    } catch (err) {
      alert("Failed to save announcement");
    }
  };

  const handleEdit = (event) => {
    // NEW: Create a local date object first to fix the timezone shift
    const localDate = new Date(event.event_date);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    setFormData({
      title: event.title,
      event_date: formattedDate, // <--- FIXED LINE
      start_time: event.start_time,
      location: event.location,
      description: event.description,
      category: event.category,
      audience: event.audience
    });
    setEditingId(event.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to format date "2026-01-25" -> Month: JAN, Day: 25
  const formatDate = (dateString) => {
    // This ensures the badge matches the local day, not the UTC day
    const date = new Date(dateString);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <div>
                <h1>Event Management</h1>
                <p>Manage  events for greenhouse staff and customers.</p>
            </div>
            <button 
              className="register-btn" 
              style={{width: 'auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              onClick={() => {
                  setShowForm(!showForm);
                  setEditingId(null); // Clear edit mode when closing
                setFormData({ title: '', event_date: '', start_time: '', location: '', description: '', category: 'Workshop', audience: 'Staff' });              }}
            >
              {showForm ? <><FiX /> Cancel</> : <><FiPlus /> Post Announcement</>}
            </button>
        </div>
      </div>

      {/* NEW EVENT FORM (Toggles Open/Close) */}
      {showForm && (
        <div className="event-card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid #059669' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </h3>          <form onSubmit={handleSubmit} style={{display: 'grid', gap: '1rem'}}>
            {/* --- NEW: Audience Selector --- */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              <label style={{fontWeight: '600', color: '#374151', fontSize: '0.9rem'}}>Target Audience</label>
              <select 
                value={formData.audience}
                onChange={e => setFormData({...formData, audience: e.target.value})}
                style={{
                    padding: '0.6rem', 
                    borderRadius: '5px', 
                    border: '1px solid #ccc', 
                    backgroundColor: 'white',
                    cursor: 'pointer'
                }}
              >
                <option value="Staff">Internal Staff (Bulletin Board)</option>
                <option value="Customer">Public Store (Customer Events)</option>
              </select>
            </div>

            {/* --- NEW: Category Selector (Sets the Image) --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Event Category (Image)</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                style={{
                  padding: '0.6rem',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="Workshop">Workshop (Planting)</option>
                <option value="Harvest">Harvest (Produce)</option>
                <option value="Wellness">Wellness (Yoga/Zen)</option>
                <option value="Education">Education (Tech/Labs)</option>
                <option value="Social">Social (Community)</option>
              </select>
            </div>

            <input 
              type="text" placeholder="Title (e.g., Mass Harvest)" required 
              className="input-field" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            />
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <input 
                type="date" required 
                value={formData.event_date}
                onChange={e => setFormData({...formData, event_date: e.target.value})}
                style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
              />
              <input 
                type="text" placeholder="Time (e.g., 9:00 AM)" 
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
              />
            </div>
            <input 
              type="text" placeholder="Location" 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            />
            <textarea 
              placeholder="Description/Instructions" rows="3"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            ></textarea>
            <button type="submit" className="register-btn">
              {editingId ? 'Update Announcement' : 'Publish to Screens'}
            </button>          </form>
        </div>
      )}

      <div className="events-grid">
        {events.map((event) => {
          const { month, day } = formatDate(event.event_date);
          return (
            <div key={event.id} className="event-card">
              
              <div className="event-image">
                {/* Fallback image based on category if you want, or just static for now */}
                <img src={CATEGORY_IMAGES[event.category] || CATEGORY_IMAGES.Workshop} alt={event.title} />                <div className="date-badge">
                  <span className="date-month">{month}</span>
                  <span className="date-day">{day}</span>
                </div>
              </div>

              <div className="event-content">
                <h3 className="event-title">
                  {event.title}
                  {/* Visual Badge */}
                  <span style={{
                      fontSize: '0.65rem', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      marginLeft: '10px', 
                      verticalAlign: 'middle',
                      border: '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: event.audience === 'Customer' ? '#dbeafe' : '#f3f4f6',
                      color: event.audience === 'Customer' ? '#1e40af' : '#374151',
                      fontWeight: 'normal'
                  }}>
                      {event.audience || 'Staff'}
                  </span>
                </h3>
                <p className="event-desc">{event.description}</p>
                
                <div className="event-details">
                  <div className="detail-row">
                    <FiClock className="icon" /> {event.start_time}
                  </div>
                  <div className="detail-row">
                    <FiMapPin className="icon" /> {event.location}
                  </div>
                </div>

                {/* <button 
                  className="register-btn" 
                  style={{backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
                  onClick={() => handleDelete(event.id)}
                >
                  <FiTrash2 /> Remove Announcement
                </button> */}

                <div style={{display: 'flex', gap: '10px', marginTop: 'auto'}}>
                    <button 
                      className="register-btn" 
                      style={{backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1}}
                      onClick={() => handleEdit(event)}
                    >
                      <FiEdit /> Edit
                    </button>

                    <button 
                      className="register-btn" 
                      style={{backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1}}
                      onClick={() => handleDelete(event.id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                </div>
              </div>

            </div>
          );
        })}
        {events.length === 0 && <p style={{textAlign: 'center', color: '#999'}}>No active announcements.</p>}
      </div>
    </div>
  );
};

export default EventsPage;