import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar/Sidebar';
import Dashboard from './Dashboard/Dashboard';
import Inventory from './Inventory/inventory';
import AddPlant from './Inventory/AddPlant';
import GrowingSystems from './GrowingSystems/GrowingSystems';
import Orders from './Orders/Orders';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <div className="app-layout">
      <GlobalHeader />
      <div className="main-content">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plants/inventory" element={<Inventory />} />
          <Route path="/plants/inventory/add-plant" element={<AddPlant />} />
          <Route path="/plants/store-listings" element={<div style={{padding: '2rem'}}>Store Listings - Coming Soon</div>} />
          <Route path="/plants/growing-systems" element={<GrowingSystems />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </div>
    </div>
  );
};

export default DashboardLayout;