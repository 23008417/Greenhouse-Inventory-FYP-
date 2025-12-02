import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload } from 'react-icons/fi';
import './AddPlant.css';

const AddPlant = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    cropType: '',
    quantity: '',
    seedingDate: '',
    growthDuration: '',
    spongeDate: '',
    harvestDate: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate harvest date when seeding date and growth duration are provided
    if (name === 'seedingDate' || name === 'growthDuration') {
      const seedDate = name === 'seedingDate' ? value : formData.seedingDate;
      const duration = name === 'growthDuration' ? value : formData.growthDuration;
      
      if (seedDate && duration) {
        const weeks = parseInt(duration.replace(/\D/g, ''));
        if (!isNaN(weeks)) {
          const harvestDate = new Date(seedDate);
          harvestDate.setDate(harvestDate.getDate() + (weeks * 7));
          setFormData(prev => ({
            ...prev,
            harvestDate: harvestDate.toISOString().split('T')[0]
          }));
        }
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add API call to save plant data
    console.log('Plant data:', formData);
    console.log('Image file:', imageFile);
    
    // For now, just navigate back to inventory
    navigate('/inventory');
  };

  const handleCancel = () => {
    navigate('/inventory');
  };

  return (
    <div className="add-plant-page">
      <div className="add-plant-header">
        <button className="back-link" onClick={handleCancel}>
          &lt; Cancel and return to Inventory page
        </button>
        <h1>Add new plant</h1>
      </div>

      <form onSubmit={handleSubmit} className="add-plant-form">
        {/* Plant Information Section */}
        <div className="form-section">
          <h2 className="section-title">Plant information</h2>
          
          <div className="form-group">
            <label htmlFor="name">Name</label>
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
            <label htmlFor="cropType">Crop type</label>
            <select
              id="cropType"
              name="cropType"
              value={formData.cropType}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a crop type</option>
              <option value="Leafy Greens">Leafy Greens</option>
              <option value="Herbs">Herbs</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Root Crops">Root Crops</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              placeholder="Enter number of plants"
              value={formData.quantity}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Image</label>
            <div 
              className="image-upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Plant preview" />
                  <button 
                    type="button" 
                    className="remove-image"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label htmlFor="imageInput" className="upload-label">
                  <FiUpload className="upload-icon" />
                  <span>Add images or drag and drop to upload</span>
                  <input
                    type="file"
                    id="imageInput"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Growth Timeline Section */}
        <div className="form-section">
          <h2 className="section-title">Growth timeline</h2>
          
          <div className="form-group">
            <label htmlFor="seedingDate">Seeding date</label>
            <input
              type="date"
              id="seedingDate"
              name="seedingDate"
              value={formData.seedingDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="growthDuration">Growth duration</label>
            <input
              type="text"
              id="growthDuration"
              name="growthDuration"
              placeholder="e.g. 5 weeks"
              value={formData.growthDuration}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="spongeDate">Sponge date</label>
            <input
              type="date"
              id="spongeDate"
              name="spongeDate"
              value={formData.spongeDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="harvestDate">Harvest date</label>
            <input
              type="date"
              id="harvestDate"
              name="harvestDate"
              value={formData.harvestDate}
              onChange={handleInputChange}
              placeholder="Auto calculated based on seeding date and growth duration"
              readOnly
            />
            <small className="field-hint">Auto calculated based on seeding date and growth duration</small>
          </div>
        </div>

        {/* Action Buttons */}
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

export default AddPlant;
