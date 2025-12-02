import React, { useState } from 'react';
import { FiX, FiUpload, FiSearch, FiBarChart2 } from 'react-icons/fi';
import './AddGrowingSystem.css';

const AddGrowingSystem = ({ onClose, onSave }) => {
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [systemTypes, setSystemTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSystemType = () => {
    // Logic to add system type
    console.log('Add system type clicked');
  };

  const handleSave = () => {
    const newSystem = {
      location,
      image,
      systemTypes
    };
    if (onSave) onSave(newSystem);
  };

  return (
    <div className="modal-overlay">
      <div className="add-growing-system-modal">
        
        {/* Header */}
        <div className="modal-header">
          <div className="back-link" onClick={onClose}>
            ← Cancel and return to growing systems page
          </div>
          <h2>Add growing system</h2>
        </div>

        {/* Form Content */}
        <div className="modal-content">
          
          {/* Location Field */}
          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              placeholder="Enter location name"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Image</label>
            <div className="image-upload-box">
              {image ? (
                <div className="image-preview">
                  <img src={image} alt="Preview" />
                </div>
              ) : (
                <div className="upload-placeholder">
                  <FiUpload className="upload-icon" />
                  <p>Add images or drag and drop to upload</p>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-label">
                {image ? 'Change Image' : 'Upload Image'}
              </label>
            </div>
          </div>

          {/* System Types Section */}
          <div className="form-group">
            <label>System types</label>
            
            <div className="system-types-toolbar">
              <div className="search-container-small">
                <FiSearch className="search-icon-small" />
                <input 
                  type="text" 
                  placeholder="Search system types"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-small"
                />
              </div>
              <div className="toolbar-buttons-small">
                <button className="toolbar-btn-small">Browse</button>
                <button className="toolbar-btn-small">
                  <FiBarChart2 /> Sort
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>There are no system types in this location</h3>
              <p>
                System types are configurations that define how plants are grown within 
                a given location or container. They let you organise your operations by 
                method, helping optimise for different crops, efficiency, and scalability.
              </p>
              <button className="add-system-type-btn" onClick={handleAddSystemType}>
                + Add system type
              </button>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save</button>
        </div>

      </div>
    </div>
  );
};

export default AddGrowingSystem;
