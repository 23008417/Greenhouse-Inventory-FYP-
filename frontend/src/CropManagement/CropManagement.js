import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiTrash2 } from 'react-icons/fi';
import './CropManagement.css';
import { API_URL } from '../apiConfig';

const CropManagement = () => {
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [filteredCrops, setFilteredCrops] = useState([]);
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);

  const growthStages = [
    { value: 'all', label: 'All Stages', color: '#6c757d' },
    { value: 'Seedling', label: 'Seedling', color: '#ffc107' },
    { value: 'Vegetative', label: 'Vegetative', color: '#28a745' },
    { value: 'Flowering', label: 'Flowering', color: '#e83e8c' },
    { value: 'Fruiting', label: 'Fruiting', color: '#fd7e14' },
    { value: 'Harvest Ready', label: 'Harvest Ready', color: '#17a2b8' }
  ];

  const healthStatus = [
    { value: 'Healthy', label: 'Healthy', icon: FiCheckCircle, color: '#28a745' },
    { value: 'Needs Attention', label: 'Needs Attention', icon: FiAlertCircle, color: '#ffc107' },
    { value: 'Critical', label: 'Critical', icon: FiAlertCircle, color: '#dc3545' }
  ];

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    filterCrops();
  }, [crops, selectedStage, searchTerm]);

  const fetchCrops = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/crops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        const enrichedCrops = (data.crops || []).map(crop => ({
          ...crop,
          growth_stage: crop.growth_stage || 'Seedling',
          health_status: crop.health_status || 'Healthy',
          batch_code: crop.batch_code || '',
          location: crop.location || 'Not specified',
          water_level: crop.water_level || 'Good'
        }));
        setCrops(enrichedCrops);
        setFilteredCrops(enrichedCrops);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const filterCrops = () => {
    let result = [...crops];

    if (selectedStage !== 'all') {
      result = result.filter(crop => crop.growth_stage === selectedStage);
    }

    if (searchTerm) {
      result = result.filter(crop =>
        crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCrops(result);
  };

  const calculateDaysToHarvest = (harvestDate) => {
    if (!harvestDate) return null;
    const today = new Date();
    const harvest = new Date(harvestDate);
    const diffTime = harvest - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateGrowthProgress = (seedingDate, harvestDate) => {
    if (!seedingDate || !harvestDate) return 0;
    const seeding = new Date(seedingDate);
    const harvest = new Date(harvestDate);
    const today = new Date();
    
    const totalDuration = harvest - seeding;
    const elapsed = today - seeding;
    const progress = (elapsed / totalDuration) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
  };

  const getStageColor = (stage) => {
    const stageObj = growthStages.find(s => s.value === stage);
    return stageObj ? stageObj.color : '#6c757d';
  };

  const getHealthIcon = (status) => {
    const healthObj = healthStatus.find(h => h.value === status);
    return healthObj ? healthObj.icon : FiCheckCircle;
  };

  const getHealthColor = (status) => {
    const healthObj = healthStatus.find(h => h.value === status);
    return healthObj ? healthObj.color : '#28a745';
  };

  const updateCropStage = async (cropId, newStage) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/crops/${cropId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ growth_stage: newStage })
      });

      if (res.ok) {
        fetchCrops();
        setSelectedCrop(null);
      } else {
        alert('Failed to update crop stage');
      }
    } catch {
      alert('Network error');
    }
  };

  const updateHealthStatus = async (cropId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/crops/${cropId}/health`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ health_status: newStatus })
      });

      if (res.ok) {
        fetchCrops();
      } else {
        alert('Failed to update health status');
      }
    } catch {
      alert('Network error');
    }
  };

  const deleteCrop = async (cropId, cropName) => {
    if (!window.confirm(`Are you sure you want to delete "${cropName}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/crops/${cropId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert('Crop batch deleted successfully');
        fetchCrops();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete crop batch');
      }
    } catch {
      alert('Network error');
    }
  };

  const getStageCounts = () => {
    return growthStages.map(stage => ({
      ...stage,
      count: stage.value === 'all' 
        ? crops.length 
        : crops.filter(c => c.growth_stage === stage.value).length
    }));
  };

  if (loading) {
    return <div className="crop-management-loading">Loading crops...</div>;
  }

  if (error) {
    return <div className="crop-management-error">{error}</div>;
  }

  return (
    <div className="crop-management-container">
      <div className="crop-management-header">
        <div>
          <h2>Crop Management</h2>
          <p>Track and manage your crop lifecycle</p>
        </div>
        <button 
          className="view-inventory-btn"
          onClick={() => navigate('/dashboard/crops/add')}
        >
          Add New Crop
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="crop-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#e3f2fd'}}>
            <FiTrendingUp color="#2196f3" size={24} />
          </div>
          <div className="stat-content">
            <h3>{crops.length}</h3>
            <p>Total Crops</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#fff3e0'}}>
            <FiCalendar color="#ff9800" size={24} />
          </div>
          <div className="stat-content">
            <h3>{crops.filter(c => c.growth_stage === 'Harvest Ready').length}</h3>
            <p>Ready to Harvest</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#e8f5e9'}}>
            <FiCheckCircle color="#4caf50" size={24} />
          </div>
          <div className="stat-content">
            <h3>{crops.filter(c => c.health_status === 'Healthy').length}</h3>
            <p>Healthy Crops</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#fff8e1'}}>
            <FiAlertCircle color="#ffc107" size={24} />
          </div>
          <div className="stat-content">
            <h3>{crops.filter(c => c.health_status === 'Needs Attention' || c.health_status === 'Critical').length}</h3>
            <p>Need Attention</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="crop-filters">
        <input
          type="text"
          placeholder="Search crops..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="stage-filters">
          {getStageCounts().map(stage => (
            <button
              key={stage.value}
              className={`stage-filter-btn ${selectedStage === stage.value ? 'active' : ''}`}
              style={{
                borderColor: selectedStage === stage.value ? stage.color : '#ddd',
                background: selectedStage === stage.value ? `${stage.color}15` : 'white'
              }}
              onClick={() => setSelectedStage(stage.value)}
            >
              {stage.label} ({stage.count})
            </button>
          ))}
        </div>
      </div>

      {/* Crops Grid */}
      <div className="crops-grid">
        {filteredCrops.length === 0 ? (
          <div className="no-crops">
            <p>No crops found matching your criteria</p>
            <button onClick={() => navigate('/dashboard/crops/add')}>
              Add New Crop
            </button>
          </div>
        ) : (
          filteredCrops.map(crop => {
            const daysToHarvest = calculateDaysToHarvest(crop.harvest_date);
            const progress = calculateGrowthProgress(crop.seeding_date, crop.harvest_date);
            const HealthIcon = getHealthIcon(crop.health_status);

            return (
              <div key={crop.id} className="crop-card">
                <div className="crop-card-header">
                  <div>
                    <h3>{crop.name}</h3>
                    <span className="crop-category">Batch: {crop.batch_code}</span>
                  </div>
                  <HealthIcon 
                    size={24} 
                    color={getHealthColor(crop.health_status)}
                  />
                </div>

                <div className="crop-stage-badge" style={{background: getStageColor(crop.growth_stage)}}>
                  {growthStages.find(s => s.value === crop.growth_stage)?.label || crop.growth_stage}
                </div>

                <div className="crop-info">
                  <div className="info-row">
                    <span>Location:</span>
                    <strong>{crop.location}</strong>
                  </div>
                  <div className="info-row">
                    <span>Water Level:</span>
                    <strong>{crop.water_level}</strong>
                  </div>
                  <div className="info-row">
                    <span>Planted Date:</span>
                    <strong>{crop.seeding_date ? new Date(crop.seeding_date).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                  {crop.harvest_date && (
                    <div className="info-row">
                      <span>Expected Harvest:</span>
                      <strong>{new Date(crop.harvest_date).toLocaleDateString()}</strong>
                    </div>
                  )}
                  {daysToHarvest !== null && (
                    <div className="info-row highlight">
                      <FiClock size={16} />
                      <span>
                        {daysToHarvest > 0 
                          ? `${daysToHarvest} days to harvest`
                          : daysToHarvest === 0 
                          ? 'Ready to harvest today!'
                          : 'Overdue for harvest'}
                      </span>
                    </div>
                  )}
                </div>

                {crop.seeding_date && crop.harvest_date && (
                  <div className="growth-progress">
                    <div className="progress-label">
                      <span>Growth Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${progress}%`, background: getStageColor(crop.growth_stage)}}
                      />
                    </div>
                  </div>
                )}

                <div className="crop-actions">
                  <select 
                    value={crop.growth_stage}
                    onChange={(e) => updateCropStage(crop.id, e.target.value)}
                    className="stage-select"
                  >
                    {growthStages.filter(s => s.value !== 'all').map(stage => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  <select 
                    value={crop.health_status}
                    onChange={(e) => updateHealthStatus(crop.id, e.target.value)}
                    className="health-select"
                  >
                    {healthStatus.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <button 
                    className="delete-crop-btn"
                    onClick={() => deleteCrop(crop.id, crop.name)}
                    title="Delete crop batch"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CropManagement;
