-- Create dedicated crop_management table
-- This separates crop lifecycle tracking from inventory management
-- Run this migration to create the new crop_management table

CREATE TABLE IF NOT EXISTS crop_management (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(20) NOT NULL UNIQUE,
    plant_name VARCHAR(100) NOT NULL,
    location VARCHAR(50),
    stage ENUM('Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready') DEFAULT 'Seedling',
    health_status ENUM('Healthy', 'Needs Attention', 'Critical') DEFAULT 'Healthy',
    water_level ENUM('Low', 'Good', 'High') DEFAULT 'Good',
    planted_date DATE,
    expected_harvest_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
