import React, { useEffect, useState, useRef } from 'react';
// Icon set for UI actions and labels
import { FiClock, FiMapPin, FiPlus, FiTrash2, FiX, FiEdit, FiUsers, FiCopy } from 'react-icons/fi';
import { API_URL } from '../apiConfig';
import './EventsPage.css';

// Map event categories to background images used on cards
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

  // Maintenance (sensor/system alerts)
  Maintenance:"https://images.unsplash.com/vector-1738926671790-51ac3dac60a0?q=80&w=1180&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  // General (Working): Greenhouse wide shot
  General: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80"
};

// EventsPage: Admin UI to create, edit, duplicate, filter, and delete announcements
const EventsPage = () => {
  // Reference to the scroll container so we can auto-scroll to the form
  const containerRef = useRef(null);

  // Event list returned from the backend
  const [events, setEvents] = useState([]);

  // Show/hide the create/edit form
  const [showForm, setShowForm] = useState(false);

  // Null = create mode, number = edit mode
  const [editingId, setEditingId] = useState(null);

  // Track which event cards are selected for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Form State (controlled inputs)
  const [formData, setFormData] = useState({
    title: '',
    event_date: '',
    start_time: '',
    location: '',
    description: '',
    category: 'Workshop',
    audience: 'Staff' // Internal vs public
  });

  // Filter by audience type
  const [filterType, setFilterType] = useState('All');

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

  // Load events once on page mount
  useEffect(() => { fetchEvents(); }, []);

  // 2. Delete a single event
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this announcement from the digital signage?")) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents(); // Refresh list after deletion
    } catch (err) {
      alert("Failed to delete");
    }
  };

  // 2b. Delete multiple selected events in one action
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected events?`)) return;

    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/announcements/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      setSelectedIds([]);
      fetchEvents();
    } catch (err) {
      alert("Failed to delete selected events");
    }
  };

  // Toggle one card checkbox on/off
  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  // Select or clear all visible cards
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEvents.map((e) => e.id));
    }
  };

  // 3. Create OR Update an announcement (single handler)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // Determine URL and HTTP method based on mode
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
        setEditingId(null); // Reset to create mode
        setFormData({ title: '', event_date: '', start_time: '', location: '', description: '', category: 'Workshop', audience: 'Staff' });
        fetchEvents(); // Refresh list
      }
    } catch (err) {
      alert("Failed to save announcement");
    }
  };

  // Prefill form with an existing event for editing
  const handleEdit = (event) => {
    // Create a local date object first to avoid timezone shift
    const localDate = new Date(event.event_date);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    setFormData({
      title: event.title,
      event_date: formattedDate,
      start_time: event.start_time,
      location: event.location,
      description: event.description,
      category: event.category,
      audience: event.audience
    });
    setEditingId(event.id);
    setShowForm(true);

    // Scroll to top so the form is visible
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Duplicate an event for quick weekly scheduling
  const handleDuplicate = (event) => {
    const baseDate = new Date(event.event_date);
    const nextWeek = new Date(baseDate);
    nextWeek.setDate(baseDate.getDate() + 7);
    const yyyy = nextWeek.getFullYear();
    const mm = String(nextWeek.getMonth() + 1).padStart(2, '0');
    const dd = String(nextWeek.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    setFormData({
      title: event.title,
      event_date: formattedDate,
      start_time: event.start_time,
      location: event.location,
      description: event.description,
      category: event.category,
      audience: event.audience
    });
    setEditingId(null); // Create mode
    setShowForm(true);

    // Scroll to the form
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to format date "2026-01-25" -> { month: "JAN", day: 25 }
  const formatDate = (dateString) => {
    // This ensures the badge matches the local day, not the UTC day
    const date = new Date(dateString);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  // --- FILTER LOGIC ---
  const filteredEvents = events.filter(event => {
    if (filterType === 'All') return true; // Show everything
    return event.audience === filterType;  // Match 'Staff' or 'Customer'
  });

  return (
    <div className="events-container" ref={containerRef}>
      <div className="events-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1>Event Management</h1>
            <p>Manage events for greenhouse staff and customers.</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Audience filter tabs */}
            <div style={{ display: 'flex', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px', gap: '4px', marginRight: '10px' }}>

              {/* 1. View all */}
              <button
                onClick={() => setFilterType('All')}
                style={{
                  border: 'none',
                  background: filterType === 'All' ? '#111827' : 'transparent',
                  color: filterType === 'All' ? 'white' : '#6b7280',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                }}
              >
                View All
              </button>

              {/* 2. Staff-only */}
              <button
                onClick={() => setFilterType('Staff')}
                style={{
                  border: 'none',
                  background: filterType === 'Staff' ? '#f3f4f6' : 'transparent',
                  color: filterType === 'Staff' ? '#374151' : '#6b7280',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                }}
              >
                Internal Staff
              </button>

              {/* 3. Public customers */}
              <button
                onClick={() => setFilterType('Customer')}
                style={{
                  border: 'none',
                  background: filterType === 'Customer' ? '#dbeafe' : 'transparent',
                  color: filterType === 'Customer' ? '#1e40af' : '#6b7280',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                }}
              >
                Public Store
              </button>
            </div>

            {/* Toggle form open/close */}
            <button
              className="register-btn"
              style={{ width: 'auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({ title: '', event_date: '', start_time: '', location: '', description: '', category: 'Workshop', audience: 'Staff' });
              }}
            >
              {showForm ? <><FiX /> Cancel</> : <><FiPlus /> Post Announcement</>}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {filteredEvents.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <label className="bulk-select">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredEvents.length}
              onChange={toggleSelectAll}
            />
            Select all
          </label>
          {selectedIds.length > 0 && (
            <>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{selectedIds.length} selected</span>
              <button
                className="register-btn"
                style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.4rem 0.8rem' }}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </button>
            </>
          )}
        </div>
      )}

      {/* Create/Edit Form (Toggles Open/Close) */}
      {showForm && (
        <div className="event-card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid #059669' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <form onSubmit={handleSubmit} style={{display: 'grid', gap: '1rem'}}>
            {/* Target audience selector */}
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

            {/* Category selector (controls card image) */}
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

            {/* Title */}
            <input
              type="text" placeholder="Title (e.g., Mass Harvest)" required
              className="input-field"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            />

            {/* Date + Time */}
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

            {/* Location */}
            <input
              type="text" placeholder="Location"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            />

            {/* Description */}
            <textarea
              placeholder="Description/Instructions" rows="3"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px'}}
            ></textarea>

            {/* Submit */}
            <button type="submit" className="register-btn">
              {editingId ? 'Update Announcement' : 'Publish to Screens'}
            </button>
          </form>
        </div>
      )}

      {/* Event cards grid */}
      <div className="events-grid">
        {filteredEvents.map((event) => {
          const { month, day } = formatDate(event.event_date);
          return (
            <div key={event.id} className="event-card">
              <div className="event-select-row">
                <label className="event-select">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(event.id)}
                    onChange={() => toggleSelect(event.id)}
                  />
                  Select
                </label>
              </div>

              <div className="event-image">
                {/* Image is chosen by category (fallback to Workshop) */}
                <img src={CATEGORY_IMAGES[event.category] || CATEGORY_IMAGES.Workshop} alt={event.title} />
                <div className="date-badge">
                  <span className="date-month">{month}</span>
                  <span className="date-day">{day}</span>
                </div>
              </div>

              <div className="event-content">
                <h3 className="event-title">
                  {event.title}
                  {/* Audience badge */}
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

                  {/* Only show interest count for public customer events */}
                  {event.audience === 'Customer' && (
                    <div className="detail-row" style={{ marginTop: '0.5rem', color: '#059669', fontWeight: 'bold' }}>
                      <FiUsers className="icon" /> {event.interested_count || 0} People Interested
                    </div>
                  )}
                </div>

                {/* Action buttons */}
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
                      style={{backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1}}
                      onClick={() => handleDuplicate(event)}
                    >
                      <FiCopy /> Duplicate
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
