import React from 'react';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import './Dashboard.css';

function App() {
  return (
    <div className="app-layout">
      <GlobalHeader />
      <div className="main-content">
        <Sidebar />
        <Dashboard />
      </div>
    </div>
  );
}

export default App;