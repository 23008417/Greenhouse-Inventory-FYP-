import React from 'react';
import { FiSearch, FiBell, FiGrid } from 'react-icons/fi';
import './GlobalHeader.css';

const GlobalHeader = () => {
  return (
    <header className="global-header">
      <div className="logo-header">
        <h3>Cropflow</h3>
      </div>
      {/* <div className="search-bar">
        <FiSearch />
        <input type="text" placeholder="Search" />
      </div> */}
      <div className="header-icons">
        {/* <FiGrid /> */}
        <FiBell />
        <div className="profile-badge">
        <img src="/RPLOGO.png" alt="RP Logo" className="profile-logo-img" />
          <span>RP Greenhouse</span>
          
          
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;