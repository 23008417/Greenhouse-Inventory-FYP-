import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload } from 'react-icons/fi';
import './AddPlant.css';
import { API_URL } from '../apiConfig';

const AddPlant = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    crop_category: '',
    growth_duration_weeks: '',
    seeding_date: '',
    harvest_date: '',
    quantity: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate harvest date
    if (name === 'seeding_date' || name === 'growth_duration_weeks') {
      const seedDate = name === 'seeding_date' ? value : formData.seeding_date;
      const duration = name === 'growth_duration_weeks' ? value : formData.growth_duration_weeks;

      if (seedDate && duration) {
        const weeks = parseInt(duration.replace(/\D/g, ''));
        if (!isNaN(weeks)) {
          const [year, month, day] = seedDate.split('-').map(Number);
          const harvestDate = new Date(year, month - 1, day);
          harvestDate.setDate(harvestDate.getDate() + weeks * 7);
          setFormData(prev => ({
            ...prev,
            harvest_date: harvestDate.toISOString().slice(0, 10)
          }));
        }
      }
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setImageFile(file);
  };

  const removeImage = () => setImageFile(null);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login');
      setLoading(false);
      return;
    }

    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('crop_category', formData.crop_category);
    submitData.append(
      'growth_duration_weeks',
      parseInt(formData.growth_duration_weeks.replace(/\D/g, '')) || 0
    );
    submitData.append('seeding_date', formData.seeding_date);
    submitData.append('harvest_date', formData.harvest_date || '');
    submitData.append('quantity', formData.quantity);
    submitData.append('price', 0);

    if (imageFile) submitData.append('image', imageFile);

    try {
      const res = await fetch(`${API_URL}/api/plants/add`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: submitData
      });

      const data = await res.json();
      if (res.ok) navigate(-1);
      else setError(data.error);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-plant-page">
      <div className="add-plant-header">
        {/* <button className="back-link" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button> */}
        <h1>Add New Plant</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="add-plant-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2 className="section-title">Plant Details</h2>

          <div className="form-group">
            <label htmlFor="name">Plant Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter plant name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="crop_category">Crop Category</label>
            <select
              id="crop_category"
              name="crop_category"
              value={formData.crop_category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a crop category</option>
              <option value="Leafy Greens">Leafy Greens</option>
              <option value="Herbs">Herbs</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Root Crops">Root Crops</option>
              <option value="Flowers">Flowers</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="seeding_date">Seeding Date</label>
            <input
              type="date"
              id="seeding_date"
              name="seeding_date"
              value={formData.seeding_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="growth_duration_weeks">Growth Duration (weeks)</label>
            <input
              type="number"
              id="growth_duration_weeks"
              name="growth_duration_weeks"
              placeholder="e.g. 4"
              value={formData.growth_duration_weeks}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="harvest_date">Harvest Date</label>
            <input
              type="date"
              id="harvest_date"
              name="harvest_date"
              value={formData.harvest_date}
              readOnly
            />
            <span className="field-hint">Calculated automatically from seeding date + growth duration</span>
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Plant Image</label>
            <div className="image-upload-area">
              {imageFile ? (
                <div className="image-preview">
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" />
                  <button type="button" className="remove-image" onClick={removeImage}>Remove</button>
                </div>
              ) : (
                <label className="upload-label">
                  <FiUpload className="upload-icon" />
                  <span>Click here to upload</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Plant'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPlant;
