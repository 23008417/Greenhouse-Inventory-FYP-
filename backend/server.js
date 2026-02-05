// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const paypal = require('@paypal/checkout-server-sdk');
const { sendWelcomeEmail } = require('./emailService');

/* =====================
   ENV VALIDATION
===================== */
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET missing');
  process.exit(1);
}

/* =====================
   APP SETUP
===================== */
const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : true,
  credentials: true
}));

app.use(express.json());

// Simple health/root endpoint
app.get('/', (_req, res) => {
  res.send('Cropflow is running');
});

/* =====================
   UPLOADS
===================== */
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Images only'));
    }
    cb(null, true);
  }
});

/* =====================
   DATABASE
===================== */
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

/* =====================
   PAYPAL CLIENT
   - Controlled via PAYPAL_MODE env: 'sandbox' (default) or 'live'
===================== */
const createPayPalClient = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  const Environment = mode === 'live'
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment;

  const env = new Environment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(env);
};

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [[user]] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/* =====================
   AUTH ROUTES
===================== */
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'Email exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, 'Buyer')`,
      [email.toLowerCase(), hash, firstName || null, lastName || null]
    );

    
    sendWelcomeEmail({
      to: email.toLowerCase(),
      firstName
    }).catch((emailErr) => {
      console.error('Failed to send welcome email:', emailErr);
    });

    res.status(201).json({
      token: generateToken(result.insertId),
      user: {
        id: result.insertId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'Buyer'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [[user]] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

/* =====================
   CUSTOMERS
===================== */
app.get('/api/customers', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const [customers] = await pool.query(
      `SELECT 
        id,
        email,
        first_name,
        last_name,
        created_at,
        (SELECT COUNT(*) FROM orders WHERE buyer_id = users.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE buyer_id = users.id) as total_spent,
        (SELECT MAX(order_date) FROM orders WHERE buyer_id = users.id) as last_order_date
      FROM users 
      WHERE role = 'Buyer'
      ORDER BY created_at DESC`
    );

    // Format the response to match what the frontend expects
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email.split('@')[0],
      email: customer.email,
      created_at: customer.created_at,
      last_order_date: customer.last_order_date,
      total_orders: customer.total_orders,
      total_spent: parseFloat(customer.total_spent || 0),
      status: customer.total_orders > 0 ? 'Active' : 'New'
    }));

    res.json(formattedCustomers);
  } catch (err) {
    console.error('Failed to fetch customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Delete customer
app.delete('/api/customers/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const customerId = req.params.id;

  try {
    // Check if customer exists
    const [customer] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND role = "Buyer"',
      [customerId]
    );

    if (customer.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Delete the customer
    await pool.query('DELETE FROM users WHERE id = ?', [customerId]);

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Failed to delete customer:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

/* =====================
   PLANTS
===================== */
app.post('/api/plants/add', authenticate, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const {
      name,
      crop_category,
      growth_duration_weeks,
      seeding_date,
      harvest_date,
      quantity,
      price,
      movementTime
    } = req.body;

    if (!name || !crop_category || !seeding_date || !quantity) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const image_url = req.file
      ? `/uploads/${req.file.filename}`
      : 'https://placehold.co/400x300?text=Plant';

    const numericQuantity = Number(quantity);
    const numericPrice = Number(price) || 0;
    const movementDate = movementTime ? new Date(movementTime) : new Date();

    const [insertResult] = await pool.query(
      `INSERT INTO plant_inventory
      (seller_id, name, crop_category, growth_duration_weeks,
       seeding_date, harvest_date, quantity, price, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        name,
        crop_category,
        growth_duration_weeks || null,
        seeding_date,
        harvest_date || null,
        numericQuantity,
        numericPrice,
        image_url
      ]
    );

    const plantId = insertResult.insertId;

    // Log initial stock movement
    await pool.query(
      `INSERT INTO plant_inventory_movements
        (plant_id, seller_id, action, quantity_before, quantity_after, quantity_change, created_at)
       VALUES (?, ?, 'create', ?, ?, ?, ?)` ,
      [
        plantId,
        req.user.id,
        0,
        numericQuantity,
        numericQuantity,
        movementDate
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add plant' });
  }
});

app.get('/api/plants', authenticate, async (req, res) => {
  try {
    // First, check if columns exist by querying the table structure
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'plant_inventory' 
       AND COLUMN_NAME IN ('growth_stage', 'health_status', 'notes')`
    );
    
    const hasNewColumns = columns.length > 0;
    
    // Build query based on available columns
    let query = `SELECT
        plant_id as id,
        name,
        crop_category,
        quantity,
        price,
        seeding_date,
        harvest_date,
        image_url`;
    
    if (hasNewColumns) {
      const columnNames = columns.map(c => c.COLUMN_NAME);
      if (columnNames.includes('growth_stage')) query += `,\n        growth_stage`;
      if (columnNames.includes('health_status')) query += `,\n        health_status`;
      if (columnNames.includes('notes')) query += `,\n        notes`;
    }
    
    query += `\n      FROM plant_inventory
      WHERE seller_id = ?`;

    const [plants] = await pool.query(query, [req.user.id]);

    res.json({ plants });
  } catch (err) {
    console.error('Error fetching plants:', err);
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

// Get a single plant by id (for editing)
app.get('/api/plants/:id', authenticate, async (req, res) => {
  const plantId = Number(req.params.id);

  if (!plantId) {
    return res.status(400).json({ error: 'Invalid plant id' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
        plant_id,
        name,
        crop_category,
        quantity,
        price,
        seeding_date,
        harvest_date,
        growth_duration_weeks,
        image_url
      FROM plant_inventory
      WHERE plant_id = ? AND seller_id = ?`,
      [plantId, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.json({ plant: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plant' });
  }
});

// Delete a plant from inventory
app.delete('/api/plants/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const plantId = Number(req.params.id);

  if (!plantId) {
    return res.status(400).json({ error: 'Invalid plant id' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM plant_inventory WHERE plant_id = ? AND seller_id = ?',
      [plantId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

// Update plant details (name, category, dates, quantity, image)
app.put('/api/plants/:id', authenticate, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const plantId = Number(req.params.id);

  if (!plantId) {
    return res.status(400).json({ error: 'Invalid plant id' });
  }

  const {
    name,
    crop_category,
    growth_duration_weeks,
    seeding_date,
    harvest_date,
    quantity,
    movementTime
  } = req.body;

  if (!name || !crop_category || !seeding_date || !quantity) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT quantity, image_url FROM plant_inventory WHERE plant_id = ? AND seller_id = ?`,
      [plantId, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const current = rows[0];
    const quantityBefore = Number(current.quantity) || 0;
    const newImageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : current.image_url;

    const durationWeeks = growth_duration_weeks
      ? parseInt(String(growth_duration_weeks).replace(/\D/g, ''), 10) || null
      : null;

    const numericQuantity = Number(quantity);
    const movementDate = movementTime ? new Date(movementTime) : new Date();

    await pool.query(
      `UPDATE plant_inventory
       SET name = ?,
           crop_category = ?,
           growth_duration_weeks = ?,
           seeding_date = ?,
           harvest_date = ?,
           quantity = ?,
           image_url = ?
       WHERE plant_id = ? AND seller_id = ?`,
      [
        name,
        crop_category,
        durationWeeks,
        seeding_date,
        harvest_date || null,
        numericQuantity,
        newImageUrl,
        plantId,
        req.user.id
      ]
    );

    const quantityAfter = numericQuantity;
    const quantityChange = quantityAfter - quantityBefore;

    await pool.query(
      `INSERT INTO plant_inventory_movements
        (plant_id, seller_id, action, quantity_before, quantity_after, quantity_change, created_at)
       VALUES (?, ?, 'update', ?, ?, ?, ?)` ,
      [
        plantId,
        req.user.id,
        quantityBefore,
        quantityAfter,
        quantityChange,
        movementDate
      ]
    );

    const [updatedRows] = await pool.query(
      `SELECT
        plant_id,
        name,
        crop_category,
        quantity,
        price,
        seeding_date,
        harvest_date,
        growth_duration_weeks,
        image_url
      FROM plant_inventory
      WHERE plant_id = ? AND seller_id = ?`,
      [plantId, req.user.id]
    );

    res.json({ success: true, plant: updatedRows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

// Update crop growth stage
app.put('/api/plants/:id/stage', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const plantId = Number(req.params.id);
  const { growth_stage } = req.body;

  const validStages = ['seeding', 'germination', 'vegetative', 'flowering', 'harvest-ready', 'harvested'];
  
  if (!validStages.includes(growth_stage)) {
    return res.status(400).json({ error: 'Invalid growth stage' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE plant_inventory SET growth_stage = ? WHERE plant_id = ? AND seller_id = ?',
      [growth_stage, plantId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.json({ success: true, growth_stage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update growth stage' });
  }
});

// Update crop health status
app.put('/api/plants/:id/health', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const plantId = Number(req.params.id);
  const { health_status } = req.body;

  const validStatuses = ['healthy', 'attention', 'diseased'];
  
  if (!validStatuses.includes(health_status)) {
    return res.status(400).json({ error: 'Invalid health status' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE plant_inventory SET health_status = ? WHERE plant_id = ? AND seller_id = ?',
      [health_status, plantId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.json({ success: true, health_status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update health status' });
  }
});

// Update plant price (used to list for sale)
app.patch('/api/plants/:id/price', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const plantId = Number(req.params.id);
  const price = Number(req.body.price);

  if (!plantId || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'Invalid price or plant id' });
  }

  try {
    const [updateResult] = await pool.query(
      'UPDATE plant_inventory SET price = ? WHERE plant_id = ? AND seller_id = ?',
      [price, plantId, req.user.id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const [rows] = await pool.query(
      `SELECT
        plant_id,
        name,
        crop_category,
        quantity,
        price,
        seeding_date,
        harvest_date,
        image_url
      FROM plant_inventory
      WHERE plant_id = ? AND seller_id = ?`,
      [plantId, req.user.id]
    );

    res.json({ success: true, plant: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Stock movement history for inventory (Admin only)
app.get('/api/stock-movements', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
         m.id,
         m.created_at,
         m.action,
         m.quantity_before,
         m.quantity_after,
         m.quantity_change,
         p.name AS plant_name,
         u.email AS email,
         u.first_name AS admin_first_name,
         u.last_name AS admin_last_name
       FROM plant_inventory_movements m
       JOIN plant_inventory p ON p.plant_id = m.plant_id
       JOIN users u ON u.id = m.seller_id
       WHERE m.seller_id = ?
       ORDER BY m.created_at DESC, m.id DESC`,
      [req.user.id]
    );

    res.json({ movements: rows });
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Public store items (plants listed for sale)
app.get('/api/store/items', authenticate, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT
        plant_id,
        name,
        quantity,
        price,
        image_url
      FROM plant_inventory
      WHERE quantity >= 0 AND price > 0`
    );

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch store items' });
  }
});

/* =====================
   CROP MANAGEMENT (Separate from Inventory)
===================== */

// Get all crops for crop management
app.get('/api/crops', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const [crops] = await pool.query(
      `SELECT 
        batch_id as id,
        batch_code,
        plant_name as name,
        location,
        stage as growth_stage,
        health_status,
        water_level,
        planted_date as seeding_date,
        expected_harvest_date as harvest_date,
        created_at
      FROM crop_management
      ORDER BY created_at DESC`
    );

    res.json({ crops });
  } catch (err) {
    console.error('Error fetching crops:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// Add new crop to crop management
app.post('/api/crops/add', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const {
    batch_code,
    plant_name,
    location,
    stage,
    health_status,
    water_level,
    planted_date,
    expected_harvest_date
  } = req.body;

  if (!batch_code || !plant_name) {
    return res.status(400).json({ error: 'Batch code and plant name required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO crop_management
        (batch_code, plant_name, location, stage, health_status, water_level,
         planted_date, expected_harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batch_code,
        plant_name,
        location || null,
        stage || 'Seedling',
        health_status || 'Healthy',
        water_level || 'Good',
        planted_date || null,
        expected_harvest_date || null
      ]
    );

    res.json({ 
      success: true, 
      batch_id: result.insertId,
      message: 'Crop batch added successfully' 
    });
  } catch (err) {
    console.error('Error adding crop:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Batch code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add crop' });
    }
  }
});

// Get single crop details
app.get('/api/crops/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);

  try {
    const [rows] = await pool.query(
      `SELECT 
        batch_id as id,
        batch_code,
        plant_name as name,
        location,
        stage as growth_stage,
        health_status,
        water_level,
        planted_date as seeding_date,
        expected_harvest_date as harvest_date,
        created_at
      FROM crop_management
      WHERE batch_id = ?`,
      [batchId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    res.json({ crop: rows[0] });
  } catch (err) {
    console.error('Error fetching crop:', err);
    res.status(500).json({ error: 'Failed to fetch crop' });
  }
});

// Update crop details
app.put('/api/crops/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);
  const {
    batch_code,
    plant_name,
    location,
    stage,
    health_status,
    water_level,
    planted_date,
    expected_harvest_date
  } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (batch_code) {
      updateFields.push('batch_code = ?');
      updateValues.push(batch_code);
    }
    if (plant_name) {
      updateFields.push('plant_name = ?');
      updateValues.push(plant_name);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location || null);
    }
    if (stage) {
      updateFields.push('stage = ?');
      updateValues.push(stage);
    }
    if (health_status) {
      updateFields.push('health_status = ?');
      updateValues.push(health_status);
    }
    if (water_level) {
      updateFields.push('water_level = ?');
      updateValues.push(water_level);
    }
    if (planted_date !== undefined) {
      updateFields.push('planted_date = ?');
      updateValues.push(planted_date || null);
    }
    if (expected_harvest_date !== undefined) {
      updateFields.push('expected_harvest_date = ?');
      updateValues.push(expected_harvest_date || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(batchId);

    const [result] = await pool.query(
      `UPDATE crop_management
       SET ${updateFields.join(', ')}
       WHERE batch_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    // Fetch updated crop
    const [[updatedCrop]] = await pool.query(
      `SELECT 
        batch_id as id,
        batch_code,
        plant_name as name,
        location,
        stage as growth_stage,
        health_status,
        water_level,
        planted_date as seeding_date,
        expected_harvest_date as harvest_date
      FROM crop_management
      WHERE batch_id = ?`,
      [batchId]
    );

    res.json({ success: true, crop: updatedCrop });
  } catch (err) {
    console.error('Error updating crop:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Batch code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update crop' });
    }
  }
});

// Delete crop
app.delete('/api/crops/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);

  try {
    const [result] = await pool.query(
      'DELETE FROM crop_management WHERE batch_id = ?',
      [batchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    res.json({ success: true, message: 'Crop batch deleted successfully' });
  } catch (err) {
    console.error('Error deleting crop:', err);
    res.status(500).json({ error: 'Failed to delete crop' });
  }
});

// Update crop growth stage
app.put('/api/crops/:id/stage', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);
  const { growth_stage } = req.body;

  const validStages = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];
  
  if (!validStages.includes(growth_stage)) {
    return res.status(400).json({ error: 'Invalid growth stage' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE crop_management SET stage = ? WHERE batch_id = ?',
      [growth_stage, batchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    res.json({ success: true, growth_stage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update growth stage' });
  }
});

// Update crop health status
app.put('/api/crops/:id/health', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);
  const { health_status } = req.body;

  const validStatuses = ['Healthy', 'Needs Attention', 'Critical'];
  
  if (!validStatuses.includes(health_status)) {
    return res.status(400).json({ error: 'Invalid health status' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE crop_management SET health_status = ? WHERE batch_id = ?',
      [health_status, batchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    res.json({ success: true, health_status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update health status' });
  }
});

// Update crop water level
app.put('/api/crops/:id/water', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const batchId = Number(req.params.id);
  const { water_level } = req.body;

  const validLevels = ['Low', 'Good', 'High'];
  
  if (!validLevels.includes(water_level)) {
    return res.status(400).json({ error: 'Invalid water level' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE crop_management SET water_level = ? WHERE batch_id = ?',
      [water_level, batchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Crop batch not found' });
    }

    res.json({ success: true, water_level });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update water level' });
  }
});

// Verify PayPal order (client already captures)
app.post('/api/paypal/capture', authenticate, async (req, res) => {
  const client = createPayPalClient();
  if (!client) {
    return res.status(500).json({ error: 'PayPal not configured' });
  }

  const { orderID, items, total } = req.body || {};

  if (!orderID || !Array.isArray(items) || !Number.isFinite(Number(total))) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // We get a specific connection so we can use a "Transaction"
  // (This ensures we don't save the order if the inventory update fails)
  const connection = await pool.getConnection();

  try {
    // 1. Verify with PayPal first
    const request = new paypal.orders.OrdersGetRequest(orderID);
    const response = await client.execute(request);
    const status = response.result.status;

    if (status !== 'COMPLETED') {
      connection.release();
      return res.status(400).json({ error: `Unexpected PayPal status: ${status}` });
    }

    // 2. Start Database Transaction
    await connection.beginTransaction();

    // 3. Insert into 'orders' table
    const [orderResult] = await connection.query(
      `INSERT INTO orders (buyer_id, total_amount, status, order_date) VALUES (?, ?, 'Completed', NOW())`,
      [req.user.id, Number(total)]
    );
    const newOrderId = orderResult.insertId;

    // 4. Insert items and update inventory
    for (const item of items) {
      // Save item to order_items
      await connection.query(
        `INSERT INTO order_items (order_id, plant_id, quantity_purchased, unit_price_at_sale)
         VALUES (?, ?, ?, ?)`,
        [newOrderId, item.plant_id, item.quantity_purchased || 1, item.unit_price_at_sale]
      );

      // Subtract stock from plant_inventory
      await connection.query(
        `UPDATE plant_inventory SET quantity = GREATEST(quantity - ?, 0) WHERE plant_id = ?`,
        [item.quantity_purchased || 1, item.plant_id]
      );
    }

    // 5. Commit (Save) the transaction
    await connection.commit();
    connection.release();

    console.log(`✅ Order #${newOrderId} saved to database!`);

    res.json({
      success: true,
      orderId: orderID,
      dbOrderId: newOrderId,
      paypalStatus: status,
    });

  } catch (err) {
    // If anything fails, undo changes
    await connection.rollback();
    connection.release();
    console.error('PayPal verification/DB save failed', err);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

/* =====================
   ANNOUNCEMENTS (Events)
   - Updated for Staff vs. Customer audiences
===================== */

// Get announcements for EventsPage and StoreEvents (optional ?type=Customer filter)
// 1. Get announcements (With optional filter ?type=Customer)
// Fetch announcements (optionally filtered by audience)
app.get('/api/announcements', async (req, res) => {
  // Query param: ?type=Customer or ?type=Staff
  const { type } = req.query; // Check if frontend wants specific audience
  
  try {
    // 1) Base query: only events today or in the future
    let query = 'SELECT * FROM announcements WHERE event_date >= CURDATE()';
    const params = [];

    // 2) Optional audience filter (Customer/Staff)
    if (type) {
      query += ' AND audience = ?';
      params.push(type);
    }

    // 3) Sort by soonest date first
    query += ' ORDER BY event_date ASC';

    const [events] = await pool.query(query, params);
    res.json(events);
  } catch (err) {
    console.error("Fetch Events Error:", err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new announcement (used by EventsPage form)
// 2. Create a new announcement
app.post('/api/announcements', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  // ADDED 'audience' to the input
  const { title, description, event_date, start_time, location, category, audience } = req.body;
  
  if (!title || !event_date) return res.status(400).json({ error: 'Title and Date required' });

  try {
    await pool.query(
      `INSERT INTO announcements (title, description, event_date, start_time, location, category, audience)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, event_date, start_time, location, category, audience || 'Staff']
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an announcement by id
// 3. Delete an announcement
app.delete('/api/announcements/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Update an announcement by id (edit mode)
// 4. Edit an announcement
app.put('/api/announcements/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { title, description, event_date, start_time, location, category, audience } = req.body;
  
  if (!title || !event_date) return res.status(400).json({ error: 'Title and Date required' });

  try {
    await pool.query(
      `UPDATE announcements 
       SET title=?, description=?, event_date=?, start_time=?, location=?, category=?, audience=?
       WHERE id=?`,
      [title, description, event_date, start_time, location, category, audience || 'Staff', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Increment interest counter for public events
// 5. Increment Interest (Simplified)
app.post('/api/announcements/:id/interest', async (req, res) => {
  try {
    // REMOVED: ", updated_at = updated_at" to prevent syntax errors
    await pool.query(
      'UPDATE announcements SET interested_count = interested_count + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

// Decrement interest counter (never below zero)
// 6. Decrement Interest (Simplified)
app.post('/api/announcements/:id/uninterest', async (req, res) => {
  try {
    // REMOVED: ", updated_at = updated_at"
    await pool.query(
      'UPDATE announcements SET interested_count = GREATEST(interested_count - 1, 0) WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

/* =====================
   SALES INSIGHTS API
===================== */
app.get('/api/sales/insights', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const range = req.query.range;
  const compareType = req.query.compare || 'none';

  let days;
  let startDateStr, endDateStr;

  try {
    // 1. Handle Date Ranges
    if (range === 'custom') {
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      if (!startDate || !endDate) return res.status(400).json({ error: 'Custom range requires start_date and end_date' });

      startDateStr = startDate;
      endDateStr = endDate;

      const start = new Date(startDate);
      const end = new Date(endDate);
      days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    } else if (range === 'all_time') {
      // Find the very first order date
      const [minDateResult] = await pool.query("SELECT MIN(order_date) as first_date FROM orders");

      const firstDate = minDateResult[0].first_date ? new Date(minDateResult[0].first_date) : new Date();
      const today = new Date();

      startDateStr = firstDate.toISOString().split('T')[0];
      endDateStr = today.toISOString().split('T')[0];

      days = Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    } else {
      // Predefined ranges
      days = range === 'last_7_days' ? 7 : range === 'last_90_days' ? 90 : 30;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (days - 1));

      endDateStr = endDate.toISOString().split('T')[0];
      startDateStr = startDate.toISOString().split('T')[0];
    }

    // 2. Determine Comparison Dates
    let prevStartDateStr = '';
    let prevEndDateStr = '';
    let hasComparison = false;

    if (range !== 'all_time') {
      if (compareType === 'custom_compare') {
        if (req.query.compare_start_date && req.query.compare_end_date) {
          prevStartDateStr = req.query.compare_start_date;
          prevEndDateStr = req.query.compare_end_date;
          hasComparison = true;
        }
      } else {
        let compareOffset = 0;
        if (compareType === 'previous_period') {
          compareOffset = days;
          hasComparison = true;
        } else if (compareType === 'previous_week') {
          compareOffset = 7;
          hasComparison = true;
        } else if (compareType === 'previous_month') {
          compareOffset = 30;
          hasComparison = true;
        } else if (compareType === 'previous_year') {
          compareOffset = 365;
          hasComparison = true;
        }

        if (hasComparison) {
          const calcPrevDate = (dateStr, offsetDays) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - offsetDays);
            return d.toISOString().split('T')[0];
          };
          prevStartDateStr = calcPrevDate(startDateStr, compareOffset);
          prevEndDateStr = calcPrevDate(endDateStr, compareOffset);
        }
      }
    }

    // 3. AGGREGATE QUERY (Updated to use specific dates)
    const getAggregates = (start, end) => {
      return pool.query(`
        SELECT 
          COUNT(*) as orders, 
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM((SELECT SUM(quantity_purchased) FROM order_items WHERE order_id = orders.order_id)), 0) as crops
        FROM orders 
        WHERE order_date >= ? AND order_date <= ?
      `, [start, end]);
    };

    // 4. DAILY DATA QUERY (Updated to use specific dates and fix GROUP BY)
    const getDailyData = (start, end) => {
      return pool.query(`
        SELECT 
          DATE_FORMAT(t1.order_date, '%e %b %Y') as date, 
          DATE(t1.order_date) as raw_date,
          COUNT(t1.order_id) as orders, 
          COALESCE(SUM(t1.total_amount), 0) as revenue, 
          COALESCE(SUM(t2.crops_count), 0) as crops 
        FROM orders t1
        LEFT JOIN (
          SELECT order_id, SUM(quantity_purchased) as crops_count 
          FROM order_items 
          GROUP BY order_id
        ) t2 ON t1.order_id = t2.order_id
        WHERE t1.order_date >= ? AND t1.order_date <= ?
        GROUP BY raw_date, date
        ORDER BY raw_date ASC
      `, [start, end]);
    };

    // Execute Queries
    const [currentStats] = await getAggregates(startDateStr, endDateStr);
    const [currentRows] = await getDailyData(startDateStr, endDateStr);

    let prevStats = [{}];
    let prevRows = [];

    if (hasComparison) {
      const [pStats] = await getAggregates(prevStartDateStr, prevEndDateStr);
      prevStats = pStats;
      const [pRows] = await getDailyData(prevStartDateStr, prevEndDateStr);
      prevRows = pRows;
    }

    const curr = currentStats[0] || {};
    const prev = prevStats[0] || {};

    const calcChange = (c, p) => p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;

    const m_revenue = {
      value: curr.revenue || 0,
      change: hasComparison ? calcChange(curr.revenue || 0, prev.revenue || 0) : 0
    };
    const m_orders = {
      value: curr.orders || 0,
      change: hasComparison ? calcChange(curr.orders || 0, prev.orders || 0) : 0
    };
    const m_crops = {
      value: curr.crops || 0,
      change: hasComparison ? calcChange(curr.crops || 0, prev.crops || 0) : 0
    };

    const currAvgOrder = curr.orders > 0 ? curr.revenue / curr.orders : 0;
    const prevAvgOrder = prev.orders > 0 ? prev.revenue / prev.orders : 0;

    const m_avgOrder = {
      value: currAvgOrder,
      change: hasComparison ? calcChange(currAvgOrder, prevAvgOrder) : 0
    };

    // Format Chart Data
    const chartData = [];

    const currMap = {};
    currentRows.forEach(r => { currMap[r.date] = r; });

    const prevMap = {};
    prevRows.forEach(r => { prevMap[r.date] = r; });

    const formatDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    let prevDateIterator = hasComparison ? new Date(prevStartDateStr) : null;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);

      let prevDateStr = '';
      if (hasComparison && prevDateIterator && prevDateIterator <= new Date(prevEndDateStr)) {
        prevDateStr = formatDate(prevDateIterator);
      }

      const cData = currMap[dateStr] || { orders: 0, revenue: 0, crops: 0 };
      const pData = (hasComparison && prevDateStr) ? (prevMap[prevDateStr] || { orders: 0, revenue: 0, crops: 0 }) : { orders: 0, revenue: 0, crops: 0 };

      chartData.push({
        date: dateStr,
        datePrev: prevDateStr || 'N/A',
        revenue: Number(cData.revenue),
        orders: Number(cData.orders),
        crops: Number(cData.crops),
        avgOrder: Number(cData.orders) > 0 ? Number(cData.revenue) / Number(cData.orders) : 0,

        revenuePrev: hasComparison ? Number(pData.revenue) : 0,
        ordersPrev: hasComparison ? Number(pData.orders) : 0,
        cropsPrev: hasComparison ? Number(pData.crops) : 0,
        avgOrderPrev: hasComparison ? (Number(pData.orders) > 0 ? Number(pData.revenue) / Number(pData.orders) : 0) : 0
      });

      if (prevDateIterator) prevDateIterator.setDate(prevDateIterator.getDate() + 1);
    }

    res.json({
      success: true,
      metrics: {
        total_revenue: m_revenue,
        total_orders: m_orders,
        total_crops_sold: m_crops,
        average_order_value: m_avgOrder
      },
      chartData: chartData
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales insights' });
  }
});

/* =====================
   PLANTING INSIGHTS API
===================== */
app.get('/api/planting/insights', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const range = req.query.range;
  const compareType = req.query.compare || 'none';

  let days;
  let startDateStr, endDateStr;

  try {
    // 1. Handle Date Ranges
    if (range === 'custom') {
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      if (!startDate || !endDate) return res.status(400).json({ error: 'Custom range requires start_date and end_date' });
      startDateStr = startDate;
      endDateStr = endDate;
      const start = new Date(startDate);
      const end = new Date(endDate);
      days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (range === 'all_time') {
      const [minDateResult] = await pool.query("SELECT MIN(planted_date) as first_date FROM crop_management WHERE planted_date IS NOT NULL");
      const firstDate = minDateResult[0].first_date ? new Date(minDateResult[0].first_date) : new Date();
      const today = new Date();
      startDateStr = firstDate.toISOString().split('T')[0];
      endDateStr = today.toISOString().split('T')[0];
      days = Math.ceil((today - firstDate) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      days = range === 'last_7_days' ? 7 : range === 'last_90_days' ? 90 : 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (days - 1));
      endDateStr = endDate.toISOString().split('T')[0];
      startDateStr = startDate.toISOString().split('T')[0];
    }

    // 2. Comparison Logic
    let prevStartDateStr = '';
    let prevEndDateStr = '';
    let hasComparison = false;

    if (range !== 'all_time') {
      if (compareType === 'custom_compare') {
        if (req.query.compare_start_date && req.query.compare_end_date) {
          prevStartDateStr = req.query.compare_start_date;
          prevEndDateStr = req.query.compare_end_date;
          hasComparison = true;
        }
      } else {
        let compareOffset = 0;
        if (compareType === 'previous_period') compareOffset = days;
        else if (compareType === 'previous_week') compareOffset = 7;
        else if (compareType === 'previous_month') compareOffset = 30;
        else if (compareType === 'previous_year') compareOffset = 365;

        if (compareOffset > 0) {
          hasComparison = true;
          const calcPrevDate = (dateStr, offsetDays) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - offsetDays);
            return d.toISOString().split('T')[0];
          };
          prevStartDateStr = calcPrevDate(startDateStr, compareOffset);
          prevEndDateStr = calcPrevDate(endDateStr, compareOffset);
        }
      }
    }

    // 3. Database Queries
    const getAggregates = (start, end) => {
      return pool.query(`
        SELECT 
          COUNT(*) as seedings,
          COUNT(DISTINCT plant_name) as unique_crops,
          AVG(DATEDIFF(expected_harvest_date, planted_date)) as avg_growth_days
        FROM crop_management
        WHERE planted_date IS NOT NULL AND planted_date >= ? AND planted_date <= ?
      `, [start, end]);
    };

    const getDailyData = (start, end) => {
      return pool.query(`
        SELECT 
          DATE_FORMAT(planted_date, '%e %b %Y') as date,
          planted_date as raw_date,
          COUNT(batch_id) as seedings,
          COUNT(DISTINCT plant_name) as unique_crops,
          AVG(DATEDIFF(expected_harvest_date, planted_date)) as daily_avg_days
        FROM crop_management
        WHERE planted_date IS NOT NULL AND planted_date >= ? AND planted_date <= ?
        GROUP BY planted_date
        ORDER BY raw_date ASC
      `, [start, end]);
    };

    const [currentStats] = await getAggregates(startDateStr, endDateStr);
    const [currentRows] = await getDailyData(startDateStr, endDateStr);

    let prevStats = [{}];
    let prevRows = [];

    if (hasComparison) {
      const [pStats] = await getAggregates(prevStartDateStr, prevEndDateStr);
      prevStats = pStats;
      const [pRows] = await getDailyData(prevStartDateStr, prevEndDateStr);
      prevRows = pRows;
    }

    const curr = currentStats[0] || {};
    const prev = prevStats[0] || {};

    const calcChange = (c, p) => p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;

    const m_plantings = {
      value: curr.seedings || 0,
      change: hasComparison ? calcChange(curr.seedings || 0, prev.seedings || 0) : 0,
      isPositive: (curr.seedings - prev.seedings) >= 0
    };

    const m_varieties = {
      value: curr.unique_crops || 0,
      change: hasComparison ? calcChange(curr.unique_crops || 0, prev.unique_crops || 0) : 0,
      isPositive: (curr.unique_crops - prev.unique_crops) >= 0
    };

    const currAvgDays = Number(curr.avg_growth_days) || 0;
    const prevAvgDays = Number(prev.avg_growth_days) || 0;
    const m_avgMaturity = {
      value: currAvgDays,
      change: hasComparison ? calcChange(currAvgDays, prevAvgDays) : 0,
      isPositive: (currAvgDays - prevAvgDays) <= 0
    };

    const weeks = days / 7;
    const currFreq = weeks > 0 ? (curr.seedings || 0) / weeks : 0;
    const prevFreq = weeks > 0 ? (prev.seedings || 0) / weeks : 0;
    const m_interval = {
      value: currFreq,
      change: hasComparison ? calcChange(currFreq, prevFreq) : 0,
      isPositive: (currFreq - prevFreq) >= 0
    };

    const chartData = [];
    const currMap = {};
    currentRows.forEach(r => { currMap[r.date] = r; });
    const prevMap = {};
    prevRows.forEach(r => { prevMap[r.date] = r; });
    const formatDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    let prevDateIterator = hasComparison ? new Date(prevStartDateStr) : null;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      let prevDateStr = '';
      if (hasComparison && prevDateIterator && prevDateIterator <= new Date(prevEndDateStr)) {
        prevDateStr = formatDate(prevDateIterator);
      }

      const cData = currMap[dateStr] || { seedings: 0, unique_crops: 0, daily_avg_days: 0 };
      const pData = (hasComparison && prevDateStr) ? (prevMap[prevDateStr] || { seedings: 0, unique_crops: 0, daily_avg_days: 0 }) : { seedings: 0, unique_crops: 0, daily_avg_days: 0 };

      const daysPassed = Math.ceil((d - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const weeksPassed = daysPassed / 7;

      chartData.push({
        date: dateStr,
        datePrev: prevDateStr || 'N/A',
        plantings: Number(cData.seedings),
        varieties: Number(cData.unique_crops),
        avgMaturityDays: Number(cData.daily_avg_days),
        plantingInterval: weeksPassed > 0 ? (Number(cData.seedings) / weeksPassed) : 0,
        plantingsPrev: hasComparison ? Number(pData.seedings) : 0,
        varietiesPrev: hasComparison ? Number(pData.unique_crops) : 0,
        avgMaturityDaysPrev: hasComparison ? Number(pData.daily_avg_days) : 0,
        plantingIntervalPrev: hasComparison ? (weeksPassed > 0 ? Number(pData.seedings) / weeksPassed : 0) : 0
      });

      if (prevDateIterator) prevDateIterator.setDate(prevDateIterator.getDate() + 1);
    }

    res.json({
      success: true,
      metrics: {
        total_plantings: m_plantings,
        crop_varieties: m_varieties,
        avg_maturity_days: m_avgMaturity,
        planting_interval: m_interval
      },
      chartData: chartData
    });

  } catch (err) {
    console.error('Planting Insights Error:', err);
    res.status(500).json({ error: 'Failed to fetch planting insights', details: err.message });
  }
});

/* =====================
   STATIC FILES
===================== */
app.use('/uploads', express.static('uploads'));

/* =========================================
   ADMIN DASHBOARD API (Admin-only)
   Provides analytics for Dashboard page
   ========================================= */
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
  // Only allow Admin users to access dashboard analytics
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    console.log("📊 Fetching dashboard data for admin:", req.user.id);
    
    // 1. Get Stats (aggregated totals for top cards)
    const [orderStats] = await pool.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders`);
    const [productStats] = await pool.query(`SELECT COUNT(*) as total_products FROM plant_inventory`);
    const [customerStats] = await pool.query(`SELECT COUNT(*) as total_customers FROM users WHERE role = 'Buyer'`);
    
    // 2. Get Top Products (total units sold per crop)
    const [topProducts] = await pool.query(`
      SELECT p.name, COALESCE(SUM(oi.quantity_purchased), 0) as sales
      FROM plant_inventory p LEFT JOIN order_items oi ON p.plant_id = oi.plant_id
      GROUP BY p.plant_id, p.name ORDER BY sales DESC LIMIT 5
    `);

    // 3. Get Revenue History (Dynamic Range)
    // Frontend sends ?range=7/30/90 based on the dropdown filter
    const days = req.query.range ? Number(req.query.range) : 7;

    const [revenueRaw] = await pool.query(`
      SELECT DATE_FORMAT(order_date, '%Y-%m-%d') as date, SUM(total_amount) as daily_revenue
      FROM orders 
      WHERE order_date >= DATE_SUB(NOW(), INTERVAL ? DAY) 
      GROUP BY date 
      ORDER BY date ASC
    `, [days]);
    const revenueTrend = revenueRaw.map(row => ({ date: row.date, daily_revenue: parseFloat(row.daily_revenue) }));
    
    // 4. Get Alerts & Recent Orders
    // Low stock list for dashboard alerts (threshold < 5)
    const [lowStock] = await pool.query(`SELECT name, quantity FROM plant_inventory WHERE quantity < 5 ORDER BY quantity ASC LIMIT 5`);
    // Latest 5 orders with buyer name for the dashboard list
    const [recentOrders] = await pool.query(`
      SELECT o.order_id, u.first_name, o.total_amount, o.status, o.order_date
      FROM orders o JOIN users u ON o.buyer_id = u.id ORDER BY o.order_date DESC LIMIT 5
    `);

    // 5. Category Breakdown (For Pie Chart)
    const [categoryRows] = await pool.query(`
      SELECT crop_category as name, SUM(quantity) as value
      FROM plant_inventory
      GROUP BY crop_category
    `);

    // Convert quantity totals to numbers so the chart can read them
    const categoryStats = categoryRows.map(row => ({
      name: row.name,
      value: Number(row.value)
    }));

    // Response shape is used directly by Dashboard.js (data.stats, chartData, etc.)
    res.json({
      success: true,
      stats: { 
        revenue: orderStats[0].total_revenue, 
        orders: orderStats[0].total_orders, 
        products: productStats[0].total_products, 
        customers: customerStats[0].total_customers 
      },
      chartData: topProducts, // consumed by Dashboard.js Top Performing Crops
      alerts: lowStock, // consumed by Dashboard.js Low Stock Alerts
      recentOrders: recentOrders, // consumed by Dashboard.js Recent Orders card
      revenueTrend: revenueTrend,
      categoryData: categoryStats // consumed by Dashboard.js Inventory Composition pie chart
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
