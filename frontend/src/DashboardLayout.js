import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar/Sidebar';
import Dashboard from './Dashboard/Dashboard';
import Inventory from './Inventory/inventory';
import AddPlant from './Inventory/AddPlant';
import EditPlant from './Inventory/EditPlant';
import StockHistory from './Inventory/StockHistory';
import PlantingInsights from './Reports/PlantingInsights/PlantingInsights';
import SalesInsights from './Reports/SalesInsights/SalesInsights';
import Customers from './Customers/Customers';
import CropManagement from './CropManagement/CropManagement';
import AddCrop from './CropManagement/AddCrop';
import './DashboardLayout.css';
import EventsPage from './Events/EventsPage';

const DashboardLayout = () => {
  return (
    <div className="app-layout">
      <GlobalHeader />

      <div className="main-content">
        <Sidebar />

        <Routes>
          {/* Default dashboard page */}
          <Route index element={<Dashboard />} />

          {/* Inventory */}
          <Route path="plants/inventory" element={<Inventory />} />
          <Route path="plants/inventory/addplant" element={<AddPlant />} />
          <Route path="plants/inventory/edit/:id" element={<EditPlant />} />

          {/* Inventory stock history */}
          <Route path="plants/stock-history" element={<StockHistory />} />

          {/* Growing systems
          <Route path="plants/growing-systems" element={<GrowingSystems />} />
          <Route
            path="plants/growing-systems/add-growing-system"
            element={<AddGrowingSystem />}
          />
          <Route
            path="plants/growing-systems/add-system-type"
            element={<AddSystemType />}
          />
          <Route
            path="plants/growing-systems/add-system-type/new"
            element={<AddSystemTypeForm />}
          /> */}

          <Route path="customers" element={<Customers />} />
          <Route path="reports/plantinginsights" element={<PlantingInsights />} />
          <Route path="reports/salesinsights" element={<SalesInsights />} />

          <Route path="event" element={<EventsPage />} />


          <Route path="crop-management" element={<CropManagement />} />
          <Route path="crops/add" element={<AddCrop />} />


          {/* Fallback */}
          <Route path="*" element={<Navigate to="." />} />
        </Routes>
      </div>
    </div>
  );
};

export default DashboardLayout;