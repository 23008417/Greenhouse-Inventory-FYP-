import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './AddCrop.css';
import { API_URL } from '../apiConfig';

const AddCrop = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    batch_code: '',
    plant_name: '',
    location: '',
    stage: 'Seedling',
    health_status: 'Healthy',
    water_level: 'Good',
    planted_date: '',
    expected_harvest_date: ''
  });

  const growthStages = [
    { value: 'Seedling', label: 'Seedling' },
    { value: 'Vegetative', label: 'Vegetative' },
    { value: 'Flowering', label: 'Flowering' },
    { value: 'Fruiting', label: 'Fruiting' },
    { value: 'Harvest Ready', label: 'Harvest Ready' }
  ];

  const healthStatuses = [
    { value: 'Healthy', label: 'Healthy' },
    { value: 'Needs Attention', label: 'Needs Attention' },
    { value: 'Critical', label: 'Critical' }
  ];

  const waterLevels = [
    { value: 'Low', label: 'Low' },
    { value: 'Good', label: 'Good' },
    { value: 'High', label: 'High' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.batch_code || !formData.plant_name) {
      alert('Please fill in batch code and plant name');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/crops/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (res.ok) {
        alert('Crop batch added successfully!');
        navigate('/dashboard/crop-management');
      } else {
        alert(result.error || 'Failed to add crop batch');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-crop-container">
      <div className="add-crop-header">
        <button className="back-button" onClick={() => navigate('/dashboard/crop-management')}>
          <FiArrowLeft size={20} />
          Back to Crop Management
        </button>
        <h2>Add New Crop Batch</h2>
      </div>

      <form onSubmit={handleSubmit} className="add-crop-form">
        <div className="form-grid">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Batch Code *</label>
              <input
                type="text"
                name="batch_code"
                value={formData.batch_code}
                onChange={handleInputChange}
                placeholder="e.g., B-101"
                required
              />
            </div>

            <div className="form-group">
              <label>Plant Name *</label>
              <input
                type="text"
                name="plant_name"
                value={formData.plant_name}
                onChange={handleInputChange}
                placeholder="e.g., Cherry Tomatoes"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Zone A - Hydro"
              />
            </div>
          </div>

          {/* Growth & Health Status */}
          <div className="form-section">
            <h3>Status Information</h3>
            
            <div className="form-group">
              <label>Growth Stage</label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleInputChange}
              >
                {growthStages.map(stage => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Health Status</label>
              <select
                name="health_status"
                value={formData.health_status}
                onChange={handleInputChange}
              >
                {healthStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Water Level</label>
              <select
                name="water_level"
                value={formData.water_level}
                onChange={handleInputChange}
              >
                {waterLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline */}
          <div className="form-section">
            <h3>Timeline</h3>
            
            <div className="form-group">
              <label>Planted Date</label>
              <input
                type="date"
                name="planted_date"
                value={formData.planted_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Expected Harvest Date</label>
              <input
                type="date"
                name="expected_harvest_date"
                value={formData.expected_harvest_date}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={() => navigate('/dashboard/crop-management')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Crop Batch'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCrop;
