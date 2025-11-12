import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiPackage, 
  FiShoppingCart, 
  FiUsers, 
  FiBarChart2, 
  FiShoppingBag,
  FiChevronDown 
} from 'react-icons/fi';
import './Sidebar.css';

const NavItem = ({ icon, children, to }) => {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link to={to} className={`menu-item ${active ? 'active' : ''}`}>
      <div className="menu-item-content">
        {icon}
        <span>{children}</span>
      </div>
    </Link>
  );
};

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <ul className="sidebar-menu">
        <NavItem to="/" icon={<FiHome />}>
          Home
        </NavItem>
        
        <NavItem to="/plants" icon={<FiPackage />}>
          Plants
        </NavItem>

        <NavItem to="/orders" icon={<FiShoppingCart />}>
          Orders
        </NavItem>

        <NavItem to="/customers" icon={<FiUsers />}>
          Customers
        </NavItem>

        <NavItem to="/reports" icon={<FiBarChart2 />}>
          Reports
        </NavItem>

        <NavItem to="/store" icon={<FiShoppingBag />}>
          Store
        </NavItem>
      </ul>
    </nav>
  );
};

export default Sidebar;