import React, { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { API_URL } from '../apiConfig';
import './Inventory.css';

const formatAction = (action) => {
  if (action === 'create') return 'Created';
  if (action === 'update') return 'Updated';
  return action;
};

const formatLocalDateTime = (value) => {
  if (!value) return '-';

  // 1. Check if we are on the Live Site
  const isLiveSite = window.location.hostname !== 'localhost';

  let dateString = value;

  // 2. If Live Site AND missing 'Z', treat as UTC (Add 'Z')
  // If Localhost, leave it alone (it's already local time)
  if (isLiveSite && !value.endsWith('Z')) {
     dateString = `${value}Z`;
  }

  const date = new Date(dateString);
  
  return date.toLocaleString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Singapore'
  });
};

const StockHistory = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMovements = async () => {
      setError('');
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/stock-movements`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load stock movements');
        } else {
          setMovements(data.movements || []);
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="inventory-page">
      <h1>Stock History</h1>

      {movements.length === 0 ? (
        <p>No stock movements recorded yet.</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table>
            <thead>
              <tr>
                <th><FiClock /> Date / Time</th>
                <th>Plant</th>
                <th>Action</th>
                <th>From</th>
                <th>To</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td>{formatLocalDateTime(m.created_at_sg || m.created_at)}</td>
                  <td>{m.plant_name}</td>
                  <td>{formatAction(m.action)}</td>
                  <td>{m.quantity_before}</td>
                  <td>{m.quantity_after}</td>
                  <td>
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockHistory;
