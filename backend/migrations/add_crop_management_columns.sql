-- Add Crop Management columns to plant_inventory table
-- Run this migration to enable crop lifecycle and health tracking features

-- Add growth_stage column
ALTER TABLE plant_inventory 
ADD COLUMN IF NOT EXISTS growth_stage VARCHAR(50) DEFAULT 'vegetative' 
COMMENT 'Crop growth stage: seeding, germination, vegetative, flowering, harvest-ready, harvested';

-- Add health_status column
ALTER TABLE plant_inventory 
ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) DEFAULT 'healthy' 
COMMENT 'Crop health status: healthy, attention, diseased';

-- Add notes column for additional information
ALTER TABLE plant_inventory 
ADD COLUMN IF NOT EXISTS notes TEXT 
COMMENT 'Additional notes about the crop';

-- Create index for faster filtering by growth stage
CREATE INDEX IF NOT EXISTS idx_growth_stage ON plant_inventory(growth_stage);

-- Create index for faster filtering by health status
CREATE INDEX IF NOT EXISTS idx_health_status ON plant_inventory(health_status);
