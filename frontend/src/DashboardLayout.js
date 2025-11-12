import React from 'react';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar/Sidebar';
import Dashboard from './Dashboard/Dashboard';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <div className="app-layout">
      <GlobalHeader />
      <div className="main-content">
        <Sidebar />
        <Dashboard />
      </div>
    </div>
  );
};

export default DashboardLayout;