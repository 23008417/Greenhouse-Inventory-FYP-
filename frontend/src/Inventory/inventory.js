import React from 'react';
import { FiFilter, FiBarChart2, FiPlus, FiDownload, FiSearch } from 'react-icons/fi';
import './Inventory.css';

const Inventory = () => {
  return (
    <div className="inventory-page">
      {/* Page Title */}
      <div className="inventory-header">
        <h1>Inventory</h1>
      </div>

      {/* Main Content Card */}
      <div className="inventory-card">
        
        {/* Top Toolbar */}
        <div className="inventory-toolbar">
          {/* Search Bar */}
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search plants" 
              className="search-input"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="toolbar-buttons">
            <button className="toolbar-btn">
              <FiFilter /> Filter
            </button>
            <button className="toolbar-btn">
              <FiBarChart2 /> Sort
            </button>
          </div>
        </div>

        {/* Empty State Content */}
        <div className="inventory-content">
          <div className="content-wrapper">
            
            {/* Left Text Content */}
            <div className="text-section">
              <h2>Add your plants</h2>
              <p>Start by filling your greenhouse with plants you're growing and tracking.</p>
              
              <div className="action-buttons">
                <button className="add-btn">
                  <FiPlus /> Add plant
                </button>
                <button className="import-btn">
                  <FiDownload /> Import
                </button>
              </div>
            </div>

            {/* Right Image Grid */}
            <div className="image-grid">
              <div className="image-box">
                <img 
                  src="https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=400&q=80" 
                  alt="Basil" 
                />
              </div>
              
              <div className="image-box">
                <img 
                  src="https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=400&q=80" 
                  alt="Bok Choy" 
                />
              </div>

              <div className="image-box">
                <img 
                  src="https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&w=400&q=80" 
                  alt="Strawberries" 
                />
              </div>

              <div className="image-box">
                <img 
                  src="https://images.unsplash.com/photo-1563565375-f3fdf5dec24e?auto=format&fit=crop&w=400&q=80" 
                  alt="Peppers" 
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
