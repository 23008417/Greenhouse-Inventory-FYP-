import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiSearch } from 'react-icons/fi';
import './Inventory.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const Inventory = () => {
  const [plants, setPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('crop_category');
  const [sortDirection, setSortDirection] = useState('asc');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    'Leafy Greens',
    'Herbs',
    'Fruits',
    'Vegetables',
    'Root Crops',
    'Flowers',
  ];

  useEffect(() => {
    const fetchPlants = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/plants`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setPlants(data.plants || []);
          setFilteredPlants(data.plants || []);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchPlants();
  }, []);

  useEffect(() => {
    let result = [...plants];

    if (searchTerm) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      result = result.filter(
        p => p.crop_category === selectedCategory
      );
    }

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'harvest_date') {
        const dateA = a.harvest_date ? new Date(a.harvest_date) : null;
        const dateB = b.harvest_date ? new Date(b.harvest_date) : null;

        if (!dateA && !dateB) comparison = 0;
        else if (!dateA) comparison = 1;
        else if (!dateB) comparison = -1;
        else comparison = dateA - dateB;
      } else {
        comparison = String(a[sortBy] || '').localeCompare(
          String(b[sortBy] || '')
        );
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredPlants(result);
  }, [searchTerm, selectedCategory, sortBy, sortDirection, plants]);

  const handleDelete = async (plantId) => {
    if (!window.confirm('Delete this plant from inventory?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/plants/${plantId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete plant');
        return;
      }

      setPlants(prev => prev.filter(p => p.plant_id !== plantId));
    } catch {
      setError('Network error');
    }
  };

  const handleListForSale = async (plant) => {
    const defaultPrice = plant.price ? String(plant.price) : '';
    const input = window.prompt('Set price for this plant (e.g. 9.90):', defaultPrice);
    if (input === null) return; // cancelled

    const price = Number(input);
    if (!Number.isFinite(price) || price < 0) {
      alert('Please enter a valid non-negative number for price.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/plants/${plant.plant_id}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ price }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update price');
        return;
      }

      setPlants(prev => prev.map(p =>
        p.plant_id === plant.plant_id ? { ...p, price } : p
      ));
    } catch {
      setError('Network error');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="inventory-page">
      <h1>Inventory</h1>

      <div className="inventory-toolbar">
        <div className="search-container">
          <FiSearch />
          <input
            placeholder="Search by name"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (sortBy === 'harvest_date') {
                setSortDirection(prev =>
                  prev === 'asc' ? 'desc' : 'asc'
                );
              } else {
                setSortBy('harvest_date');
                setSortDirection('asc');
              }
            }}
          >
            <FiBarChart2 />
            {' '}
            Sort by Harvest Date
            {sortBy === 'harvest_date'
              ? ` (${sortDirection.toUpperCase()})`
              : ''}
          </button>
        </div>
      </div>

      {filteredPlants.length === 0 ? (
        <p>Add plants to begin</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Seeding</th>
              <th>Harvest</th>
              <th>Price</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlants.map(p => (
              <tr key={p.plant_id}>
                <td>{p.name}</td>
                <td>{p.crop_category}</td>
                <td>{p.quantity}</td>
                <td>
                  {p.seeding_date
                    ? new Date(p.seeding_date).toLocaleDateString('en-CA')
                    : 'N/A'}
                </td>
                <td>
                  {p.harvest_date
                    ? new Date(p.harvest_date).toLocaleDateString('en-CA')
                    : 'N/A'}
                </td>
                <td>
                  {typeof p.price === 'number' && !Number.isNaN(p.price)
                    ? `$${Number(p.price).toFixed(2)}`
                    : '-'}
                </td>
                <td>
                  <img
                    src={`${API_URL}${p.image_url}`}
                    alt={p.name}
                    className="plant-image"
                  />
                </td>
                <td>
                  <button onClick={() => handleListForSale(p)}>
                    Send to Store
                  </button>
                  <button onClick={() => handleDelete(p.plant_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Inventory;
