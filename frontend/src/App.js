import React from 'react';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar/Sidebar';       
import Dashboard from './Dashboard/Dashboard';   
import './Dashboard/Dashboard.css'; 

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