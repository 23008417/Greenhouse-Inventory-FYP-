# Database Migrations

This folder contains SQL migration scripts for database schema updates.

## How to Run Migrations

### For Local MySQL/MariaDB:
```bash
mysql -u your_username -p your_database_name < migrations/add_crop_management_columns.sql
```

### For Production (Render, etc.):
1. Access your database via the Render dashboard or MySQL client
2. Copy and paste the SQL commands from the migration file
3. Execute them in the SQL console

## Migration List

- `add_crop_management_columns.sql` - Adds growth_stage, health_status, and notes columns to plant_inventory table for crop management features

## Notes
- Always backup your database before running migrations
- Test migrations on a development database first
- Migrations are designed to be safe with `IF NOT EXISTS` clauses
