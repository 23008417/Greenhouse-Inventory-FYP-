import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiMoreVertical, FiUserPlus, FiX } from 'react-icons/fi';
import './Customers.css';
import { API_URL } from '../apiConfig';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.email || !newCustomer.password || !newCustomer.first_name) {
      alert('Please fill in email, password, and first name');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newCustomer.email,
          password: newCustomer.password,
          firstName: newCustomer.first_name,
          lastName: newCustomer.last_name
        })
      });

      if (response.ok) {
        alert('Customer added successfully!');
        setShowAddModal(false);
        setNewCustomer({ email: '', password: '', first_name: '', last_name: '' });
        fetchCustomers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add customer');
      }
    } catch (err) {
      console.error('Failed to add customer:', err);
      alert('Network error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({
      ...prev,
      [name]: value
    }));
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
          <button className="add-customer-btn" onClick={() => setShowAddModal(true)}>
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Customer</h2>
              <button className="close-modal-btn" onClick={() => setShowAddModal(false)}>
                <FiX size={24} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={newCustomer.email}
                  onChange={handleInputChange}
                  placeholder="customer@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={newCustomer.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={newCustomer.first_name}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={newCustomer.last_name}
                  onChange={handleInputChange}
                  placeholder="Doe"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
