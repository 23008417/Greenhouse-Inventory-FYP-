import React, { useState } from 'react';
import { FiSearch, FiDownload, FiPlus } from 'react-icons/fi';
import { BsSliders, BsArrowDownUp } from 'react-icons/bs';
import './Orders.css';

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="orders-page">
      {/* Page Header */}
      <div className="orders-header">
        <div className="orders-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <h1>Orders</h1>
        </div>
        <div className="orders-header-actions">
          <button className="export-btn">
            <FiDownload /> Export
          </button>
          <button className="create-order-btn">
            <FiPlus /> Create order
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="orders-content-card">
        {/* Search and Filter Bar */}
        <div className="orders-toolbar">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search orders"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-btn">
              <BsSliders /> Filter
            </button>
            <button className="toolbar-btn">
              <BsArrowDownUp /> Sort
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="orders-empty-state">
          <div className="empty-state-content">
            <h2>Start managing your orders</h2>
            <p>Add and track customer orders to keep records of your greenhouse sales, fulfillment, and order history.</p>
            <div className="empty-state-actions">
              <button className="create-order-btn">
                <FiPlus /> Create order
              </button>
              <button className="export-btn">
                <FiDownload /> Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
