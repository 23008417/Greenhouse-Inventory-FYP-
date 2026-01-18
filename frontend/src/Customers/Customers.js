import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiMoreVertical, FiUserPlus } from 'react-icons/fi';
import './Customers.css';
import { API_URL } from '../apiConfig';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load customers');
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Network error');
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return <div className="customers-page">Loading customers...</div>;
  }

  if (error) {
    return <div className="customers-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="customers-page">
      <div className="customers-header">
        <h1>
          <span className="header-icon">👥</span>
          Customers
        </h1>
        <div className="header-actions">
          <button className="export-btn">Export</button>
          <button className="add-customer-btn">
            <FiUserPlus /> Add customer
          </button>
        </div>
      </div>

      <div className="customers-controls">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search customers"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-controls">
          <button className="filter-btn">
            <FiFilter /> Filter
          </button>
          <button className="sort-btn">
            ↕ Sort
          </button>
        </div>
      </div>

      <div className="customers-table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                />
              </th>
              <th>Customer name</th>
              <th>Contact</th>
              <th>Created on</th>
              <th>Last order</th>
              <th>Orders</th>
              <th>Amount spent</th>
              <th className="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleSelectCustomer(customer.id)}
                    />
                  </td>
                  <td>
                    <div className="customer-name-cell">
                      <div
                        className="customer-avatar"
                        style={{ backgroundColor: getAvatarColor(customer.name) }}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <span>{customer.name}</span>
                    </div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{formatDate(customer.created_at)}</td>
                  <td>{formatDate(customer.last_order_date)}</td>
                  <td>{customer.total_orders || 0}</td>
                  <td>${Number(customer.total_spent || 0).toFixed(2)}</td>
                  <td className="actions-col">
                    <button className="more-btn">
                      <FiMoreVertical />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
