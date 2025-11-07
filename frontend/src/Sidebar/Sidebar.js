import React, { useState } from 'react';
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

const NavItem = ({ icon, children, hasDropdown, active, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasDropdown) {
      setIsOpen(!isOpen);
    }
    onClick();
  };

  return (
    <li 
      className={`menu-item ${active ? 'active' : ''}`}
      onClick={handleClick}
    >
      <div className="menu-item-content">
        {icon}
        <span>{children}</span>
      </div>
      {hasDropdown && <FiChevronDown className={`dropdown-icon ${isOpen ? 'open' : ''}`} />}
    </li>
  );
};

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState('Home');

  return (
    <nav className="sidebar">
      <ul className="sidebar-menu">
        <NavItem 
          icon={<FiHome />} 
          active={activeItem === 'Home'}
          onClick={() => setActiveItem('Home')}
        >
          Home
        </NavItem>
        
        <NavItem 
          icon={<FiPackage />} 
          hasDropdown 
          active={activeItem === 'Plants'}
          onClick={() => setActiveItem('Plants')}
        >
          Plants
        </NavItem>

        <NavItem 
          icon={<FiShoppingCart />} 
          active={activeItem === 'Orders'}
          onClick={() => setActiveItem('Orders')}
        >
          Orders
        </NavItem>

        <NavItem 
          icon={<FiUsers />} 
          active={activeItem === 'Customers'}
          onClick={() => setActiveItem('Customers')}
        >
          Customers
        </NavItem>

        <NavItem 
          icon={<FiBarChart2 />} 
          active={activeItem === 'Reports'}
          onClick={() => setActiveItem('Reports')}
        >
          Reports
        </NavItem>

        <NavItem 
          icon={<FiShoppingBag />} 
          active={activeItem === 'Store'}
          onClick={() => setActiveItem('Store')}
        >
          Store
        </NavItem>
      </ul>
    </nav>
  );
};

export default Sidebar;