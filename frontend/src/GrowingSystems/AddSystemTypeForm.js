import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddSystemTypeForm.css';

const AddSystemTypeForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    systemTypeName: '',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('System type data:', formData);
    // TODO: Add API call to save system type
    navigate('/dashboard/plants/growing-systems/add-system-type');
  };

  const handleCancel = () => {
    navigate('/dashboard/plants/growing-systems/add-system-type');
  };

  return (
    <div className="add-system-type-form-page">
      <div className="form-header">
        <button className="back-link" onClick={handleCancel}>
          &lt; Cancel and return to System types
        </button>
        <h1>Add system type</h1>
      </div>

      <form onSubmit={handleSubmit} className="system-type-form">
        <div className="form-section">
          <h2 className="section-title">System type information</h2>
          
          <div className="form-group">
            <label htmlFor="systemTypeName">System type name</label>
            <input
              type="text"
              id="systemTypeName"
              name="systemTypeName"
              placeholder="Enter system type name"
              value={formData.systemTypeName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Enter description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="save-btn">
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSystemTypeForm;
