import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiPackage, 
  FiShoppingCart, 
  FiUsers, 
  FiBarChart2, 
  FiShoppingBag,
  FiChevronDown,
  FiChevronRight
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

const ExpandableNavItem = ({ icon, children, subItems }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  
  // Check if any sub-item is active
  const hasActiveChild = subItems.some(item => location.pathname === item.to);

  return (
    <div className="expandable-menu-item">
      <div 
        className={`menu-item ${hasActiveChild ? 'has-active-child' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="menu-item-content">
          {icon}
          <span>{children}</span>
        </div>
        {isOpen ? <FiChevronDown className="dropdown-icon" /> : <FiChevronRight className="dropdown-icon" />}
      </div>
      
      {isOpen && (
        <div className="submenu">
          {subItems.map((item, index) => (
            <Link 
              key={index}
              to={item.to} 
              className={`submenu-item ${location.pathname === item.to ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const plantsSubItems = [
    { label: 'Store listings', to: '/dashboard/plants/store-listings' },
    { label: 'Inventory', to: '/dashboard/plants/inventory' },
    { label: 'Growing systems', to: '/dashboard/plants/growing-systems' }
  ];

  return (
    <nav className="sidebar">
      <ul className="sidebar-menu">
        <NavItem to="/dashboard" icon={<FiHome />}>
          Home
        </NavItem>
        
        <ExpandableNavItem icon={<FiPackage />} subItems={plantsSubItems}>
          Plants
        </ExpandableNavItem>

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