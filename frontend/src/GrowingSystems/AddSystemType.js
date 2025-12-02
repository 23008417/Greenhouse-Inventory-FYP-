import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin } from 'react-icons/fi';
import { BsBox } from 'react-icons/bs';
import './AddSystemType.css';

const AddSystemType = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: 'Container 1',
    systemType: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSystemType = () => {
    navigate('/dashboard/plants/growing-systems/add-system-type/new');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add API call to save system type
    console.log('System type data:', formData);
    
    // Navigate back to growing systems
    navigate('/dashboard/plants/growing-systems');
  };

  const handleCancel = () => {
    navigate('/dashboard/plants/growing-systems');
  };

  return (
    <div className="add-system-type-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <div className="breadcrumb-item">
          <FiMapPin size={14} />
          <span>Location</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-value">Container 1</span>
        </div>
        <div className="breadcrumb-item">
          <BsBox size={14} />
          <span>Growing systems</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-value">System types</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="system-type-content-card">
        {/* Search and Filter Bar */}
        <div className="system-type-toolbar">
          <div className="search-container">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search system types"
              className="search-input"
            />
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4.66667H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4.66667 8H11.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6.66667 11.3333H9.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Filter
            </button>
            <button className="toolbar-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2.66667 4.66667L8 2L13.3333 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.66667 11.3333L8 14L13.3333 11.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 8V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Sort
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="system-type-empty-state">
          <div className="empty-state-content">
            <h2>Add your system types</h2>
            <p>Set up your system types to categorize how your plants are grown and tracked.</p>
            <div className="empty-state-actions">
              <button className="add-system-type-btn" onClick={handleAddSystemType}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3.33334V12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add system type
              </button>
              <button className="import-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.66666 6.66666L8 10L11.3333 6.66666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSystemType;
