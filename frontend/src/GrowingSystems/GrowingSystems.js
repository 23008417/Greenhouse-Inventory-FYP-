import React, { useState } from 'react';
import { FiFilter, FiBarChart2, FiPlus, FiDownload, FiSearch } from 'react-icons/fi';
import AddGrowingSystem from './AddGrowingSystem';
import './GrowingSystems.css';

const GrowingSystems = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddSystem = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleSaveSystem = (systemData) => {
    console.log('Saving system:', systemData);
    setShowAddModal(false);
  };

  return (
    <>
      <div className="growing-systems-page">
        <div className="growing-systems-header">
          <h1>Growing systems</h1>
        </div>

        <div className="growing-systems-card">
          <div className="growing-systems-toolbar">
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search growing systems" 
                className="search-input"
              />
            </div>
            
            <div className="toolbar-buttons">
              <button className="toolbar-btn">
                <FiFilter /> Filter
              </button>
              <button className="toolbar-btn">
                <FiBarChart2 /> Sort
              </button>
            </div>
          </div>

          <div className="growing-systems-content">
            <div className="content-wrapper">
              <div className="text-section">
                <h2>Add your growing systems</h2>
                <p>Set up the systems that power your greenhouse operations.</p>
                
                <div className="action-buttons">
                  <button className="add-btn" onClick={handleAddSystem}>
                    <FiPlus /> Add growing system
                  </button>
                  <button className="import-btn">
                    <FiDownload /> Import
                  </button>
                </div>
              </div>

              <div className="image-grid">
                <div className="image-box">
                  <img 
                    src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=400&q=80" 
                    alt="Growing System 1" 
                  />
                </div>
                
                <div className="image-box">
                  <img 
                    src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80" 
                    alt="Growing System 2" 
                  />
                </div>

                <div className="image-box">
                  <img 
                    src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=400&q=80" 
                    alt="Growing System 3" 
                  />
                </div>

                <div className="image-box">
                  <img 
                    src="https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=400&q=80" 
                    alt="Growing System 4" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddGrowingSystem 
          onClose={handleCloseModal}
          onSave={handleSaveSystem}
        />
      )}
    </>
  );
};

export default GrowingSystems;
