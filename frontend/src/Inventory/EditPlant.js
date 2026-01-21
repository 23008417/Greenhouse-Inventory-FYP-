import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload } from 'react-icons/fi';
import './AddPlant.css';
import { API_URL } from '../apiConfig';

const EditPlant = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: '',
    crop_category: '',
    growth_duration_weeks: '',
    seeding_date: '',
    harvest_date: '',
    quantity: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchPlant = async () => {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login');
        setInitialLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/plants/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load plant');
          setInitialLoading(false);
          return;
        }

        const plant = data.plant || {};
        setFormData({
          name: plant.name || '',
          crop_category: plant.crop_category || '',
          growth_duration_weeks: plant.growth_duration_weeks != null ? String(plant.growth_duration_weeks) : '',
          seeding_date: plant.seeding_date ? plant.seeding_date.slice(0, 10) : '',
          harvest_date: plant.harvest_date ? plant.harvest_date.slice(0, 10) : '',
          quantity: plant.quantity != null ? String(plant.quantity) : ''
        });
        setExistingImageUrl(plant.image_url || '');
      } catch {
        setError('Network error');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPlant();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'seeding_date' || name === 'growth_duration_weeks') {
      const seedDate = name === 'seeding_date' ? value : formData.seeding_date;
      const duration = name === 'growth_duration_weeks' ? value : formData.growth_duration_weeks;

      if (seedDate && duration) {
        const weeks = parseInt(String(duration).replace(/\D/g, ''), 10);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
  };

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
      parseInt(String(formData.growth_duration_weeks).replace(/\D/g, ''), 10) || 0
    );
    submitData.append('seeding_date', formData.seeding_date);
    submitData.append('harvest_date', formData.harvest_date || '');
    submitData.append('quantity', formData.quantity);

    if (imageFile) {
      submitData.append('image', imageFile);
    }

    try {
      const res = await fetch(`${API_URL}/api/plants/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: submitData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigate(-1);
      } else {
        setError(data.error || 'Failed to update plant');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className="add-plant-page">
      <div className="add-plant-header">
        <h1>Edit Plant</h1>
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
              ) : existingImageUrl ? (
                <div className="image-preview">
                  <img src={`${API_URL}${existingImageUrl}`} alt="Current" />
                  <label className="upload-label">
                    <FiUpload className="upload-icon" />
                    <span>Change image</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                  </label>
                </div>
              ) : (
                <label className="upload-label">
                  <FiUpload className="upload-icon" />
                  <span>Click or drag image here to upload</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPlant;
