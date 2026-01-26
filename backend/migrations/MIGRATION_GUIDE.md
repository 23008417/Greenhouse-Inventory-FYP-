# Database Migrations

This folder contains SQL migration scripts for database schema updates.

## How to Run Migrations

### For Local MySQL/MariaDB:
```bash
mysql -u your_username -p your_database_name < backend/migrations/create_crop_management_table.sql
```

### For Production (Render, etc.):
1. Access your database via the Render dashboard or MySQL client
2. Copy and paste the SQL commands from the migration file
3. Execute them in the SQL console

## Migration List

### **NEW: create_crop_management_table.sql** ⭐
Creates a dedicated `crop_management` table separate from `plant_inventory`.

**Purpose**: Separates crop lifecycle tracking from inventory/sales management.

**Features**:
- Independent crop tracking with growth stages and health status
- Timeline management (seeding date, harvest date)
- Notes and image support
- Proper indexing for performance

**Run this first!**

### add_crop_management_columns.sql (Legacy)
Adds growth_stage, health_status, and notes columns to plant_inventory table.

**Note**: This is now optional. The new crop management feature uses the dedicated `crop_management` table instead.

## Important Changes

**🚨 Crop Management is now separate from Inventory!**

- **Crop Management** (`crop_management` table): Track crop lifecycle, growth, and health
  - API endpoints: `/api/crops/*`
  - Frontend route: `/dashboard/crop-management`

- **Plant Inventory** (`plant_inventory` table): Manage products for sale in the store
  - API endpoints: `/api/plants/*`
  - Frontend route: `/dashboard/plants/inventory`

Both systems can coexist and serve different purposes.

## Migration Order

1. Run `create_crop_management_table.sql` (Required for new crop management)
2. Skip `add_crop_management_columns.sql` (unless you need crop fields in inventory too)

## Notes
- Always backup your database before running migrations
- Test migrations on a development database first
- Migrations are designed to be safe with `IF NOT EXISTS` clauses
- Check constraints ensure data integrity for growth stages and health statuses
