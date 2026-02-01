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
  res.send('Cropflow API is running');
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

// 1. Get announcements (With optional filter ?type=Customer)
app.get('/api/announcements', async (req, res) => {
  const { type } = req.query; // Check if frontend wants specific audience
  
  try {
    // 1. The base query now ONLY looks for events Today or in the Future
    let query = 'SELECT * FROM announcements WHERE event_date >= CURDATE()';
    const params = [];

    // 2. If the frontend sent ?type=Customer, we add AND instead of WHERE
    if (type) {
      query += ' AND audience = ?';
      params.push(type);
    }

    // 3. Keep events in order of date (soonest first)
    query += ' ORDER BY event_date ASC';

    const [events] = await pool.query(query, params);
    res.json(events);
  } catch (err) {
    console.error("Fetch Events Error:", err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

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
 
  // 1. Determine Duration (Days)
  const range = req.query.range;
  const days = range === 'last_7_days' ? 7 : 
               range === 'last_90_days' ? 90 : 
               range === 'last_year' ? 365 : 30; // Default 30
 
  // 2. Determine Comparison Offset
  const compareType = req.query.compare || 'none';
  let compareOffset = 0;
  let hasComparison = false;
 
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
 
  try {
    // --- Helper Query Function ---
    const getAggregates = (startOffset, duration) => {
      return pool.query(`
        SELECT 
          COUNT(*) as orders, 
          COALESCE(SUM(total_amount), 0) as revenue,
          COALESCE(SUM((SELECT SUM(quantity_purchased) FROM order_items WHERE order_id = orders.order_id)), 0) as crops
        FROM orders 
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL ? DAY) 
        AND order_date < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [startOffset + duration, startOffset]);
    };
 
    const getDailyData = (startOffset, duration) => {
      // UPDATED SQL: 
      // Changed '%d' (01-31) to '%e' (1-31) to remove leading zero
      return pool.query(`
        SELECT 
          DATE_FORMAT(t1.order_date, '%e %b %Y') as date, 
          MIN(t1.order_date) as raw_date,
          COUNT(t1.order_id) as orders, 
          SUM(t1.total_amount) as revenue, 
          COALESCE(SUM(t2.crops_count), 0) as crops 
        FROM orders t1
        LEFT JOIN (
          SELECT order_id, SUM(quantity_purchased) as crops_count 
          FROM order_items 
          GROUP BY order_id
        ) t2 ON t1.order_id = t2.order_id
        WHERE t1.order_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND t1.order_date < DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY date
        ORDER BY raw_date ASC
      `, [startOffset + duration, startOffset]);
    };
 
    // --- Execute Queries ---
    const [currentStats] = await getAggregates(0, days);
    const [prevStats] = await getAggregates(days, days);
    const [currentRows] = await getDailyData(0, days);
 
    // We still fetch previous rows to get the metric values (revenue, orders, etc.)
    let prevRows = [];
    if (hasComparison) {
      const [rows] = await getDailyData(compareOffset, days);
      prevRows = rows;
    }
 
    const curr = currentStats[0];
    const prev = prevStats[0];
    const calcChange = (c, p) => p === 0 ? 0 : ((c - p) / p) * 100;
 
    // --- Helper: Date Formatter (DD Mon YYYY) ---
    const formatDate = (dateObj) => {
        return dateObj.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };
 
    // --- Merge Chart Data ---
    const chartData = currentRows.map((row, index) => {
      const r = Number(row.revenue);
      const o = Number(row.orders);
      const c = Number(row.crops);
      // Get previous metrics (if they exist in DB)
      const prevRow = prevRows[index] || {}; 
      const rPrev = hasComparison ? Number(prevRow.revenue || 0) : 0;
      const oPrev = hasComparison ? Number(prevRow.orders || 0) : 0;
      const cPrev = hasComparison ? Number(prevRow.crops || 0) : 0;
 
      // --- FIX FOR DATES ---
      // 1. We use the raw_date from the current row
      const currentRawDate = new Date(row.raw_date);
      // 2. We CALCULATE the previous date mathematically (Current - Offset)
      // This ensures we always have a date, even if the DB has no sales (N/A) for that day
      let calculatedPrevDate = '';
      if (hasComparison) {
          const prevDateObj = new Date(currentRawDate);
          prevDateObj.setDate(prevDateObj.getDate() - compareOffset);
          calculatedPrevDate = formatDate(prevDateObj);
      }
 
      return {
        date: row.date, // This now includes Year from SQL (%d %b %Y)
        // Use our Calculated Date instead of the DB date to avoid "N/A"
        datePrev: calculatedPrevDate,
 
        revenue: r,
        orders: o,
        crops: c,
        avgOrder: o > 0 ? r / o : 0,
 
        revenuePrev: rPrev,
        ordersPrev: oPrev,
        cropsPrev: cPrev,
        avgOrderPrev: oPrev > 0 ? rPrev / oPrev : 0
      };
    });
 
    res.json({
      success: true,
      metrics: {
        total_revenue: { 
            value: curr.revenue, 
            change: calcChange(curr.revenue, prev.revenue) 
        },
        total_orders: { 
            value: curr.orders, 
            change: calcChange(curr.orders, prev.orders) 
        },
        total_crops_sold: { 
            value: curr.crops, 
            change: calcChange(curr.crops, prev.crops) 
        },
        average_order_value: { 
            value: curr.orders > 0 ? curr.revenue / curr.orders : 0, 
            change: calcChange((curr.orders > 0 ? curr.revenue / curr.orders : 0), (prev.orders > 0 ? prev.revenue / prev.orders : 0))
        }
      },
      chartData: chartData
    });
 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales insights' });
  }
});

/* =====================
   HARVESTS INSIGHTS API
   Updated to use only existing database columns
===================== */
app.get('/api/harvests/insights', authenticate, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
 
  // 1. Determine Duration (Days)
  const range = req.query.range;
  const days = range === 'last_7_days' ? 7 :
               range === 'last_90_days' ? 90 :
               range === 'last_year' ? 365 : 30; // Default 30
 
  // 2. Determine Comparison Offset
  const compareType = req.query.compare || 'none';
  let compareOffset = 0;
  let hasComparison = false;
 
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
 
  try {
    // --- Helper Query Function for Aggregates ---
    const getAggregates = (startOffset, duration) => {
      return pool.query(`
        SELECT
          COUNT(*) as harvests,
          COALESCE(SUM(quantity), 0) as total_crops_kg
        FROM plant_inventory
        WHERE harvest_date IS NOT NULL
        AND harvest_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND harvest_date < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [startOffset + duration, startOffset]);
    };
 
    // Get count of "Harvest Ready" batches from crop_management
    const getReadyBatches = (startOffset, duration) => {
      return pool.query(`
        SELECT COUNT(*) as ready_batches
        FROM crop_management
        WHERE stage = 'Harvest Ready'
        AND expected_harvest_date IS NOT NULL
        AND expected_harvest_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND expected_harvest_date < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [startOffset + duration, startOffset]);
    };
 
    const getDailyData = (startOffset, duration) => {
      return pool.query(`
        SELECT
          DATE_FORMAT(harvest_date, '%e %b %Y') as date,
          MIN(harvest_date) as raw_date,
          COUNT(plant_id) as harvests,
          COALESCE(SUM(quantity), 0) as crops_kg
        FROM plant_inventory
        WHERE harvest_date IS NOT NULL
        AND harvest_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND harvest_date < DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(harvest_date)
        ORDER BY raw_date ASC
      `, [startOffset + duration, startOffset]);
    };
 
    // Get daily ready batches count
    const getDailyReadyBatches = (startOffset, duration) => {
      return pool.query(`
        SELECT
          DATE_FORMAT(expected_harvest_date, '%e %b %Y') as date,
          COUNT(*) as ready_batches
        FROM crop_management
        WHERE stage = 'Harvest Ready'
        AND expected_harvest_date IS NOT NULL
        AND expected_harvest_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND expected_harvest_date < DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(expected_harvest_date)
      `, [startOffset + duration, startOffset]);
    };
 
    // --- Execute Queries ---
    const [currentStats] = await getAggregates(0, days);
    const [prevStats] = await getAggregates(days, days);
    const [currentReady] = await getReadyBatches(0, days);
    const [prevReady] = await getReadyBatches(days, days);
    const [currentRows] = await getDailyData(0, days);
 
    // Fetch previous period data if comparing
    let prevRows = [];
    if (hasComparison) {
      const [rows] = await getDailyData(compareOffset, days);
      prevRows = rows;
    }
 
    const curr = currentStats[0];
    const prev = prevStats[0];
    const currReady = currentReady[0];
    const prevReadyBatches = prevReady[0];
    const calcChange = (c, p) => p === 0 ? 0 : ((c - p) / p) * 100;
 
    // Calculate average yield per batch
    const currentAvgYield = curr.harvests > 0 ? curr.total_crops_kg / curr.harvests : 0;
    const prevAvgYield = prev.harvests > 0 ? prev.total_crops_kg / prev.harvests : 0;
 
    // --- Helper: Date Formatter (DD Mon YYYY) ---
    const formatDate = (dateObj) => {
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    };
 
    // Get daily ready batches for chart
    const [currentReadyDaily] = await getDailyReadyBatches(0, days);
    let prevReadyDaily = [];
    if (hasComparison) {
      const [rows] = await getDailyReadyBatches(compareOffset, days);
      prevReadyDaily = rows;
    }
 
    // Create a map for ready batches by date
    const readyMap = {};
    currentReadyDaily.forEach(row => { readyMap[row.date] = row.ready_batches; });
 
    const prevReadyMap = {};
    prevReadyDaily.forEach(row => { prevReadyMap[row.date] = row.ready_batches; });
 
    // --- Merge Chart Data ---
    const chartData = currentRows.map((row, index) => {
      const h = Number(row.harvests);
      const kg = Number(row.crops_kg);
      const ready = Number(readyMap[row.date] || 0);
      const prevRow = prevRows[index] || {};
      const hPrev = hasComparison ? Number(prevRow.harvests || 0) : 0;
      const kgPrev = hasComparison ? Number(prevRow.crops_kg || 0) : 0;
      const readyPrev = hasComparison ? Number(prevReadyMap[prevRow.date] || 0) : 0;
 
      const currentRawDate = new Date(row.raw_date);
      let calculatedPrevDate = '';
      if (hasComparison) {
          const prevDateObj = new Date(currentRawDate);
          prevDateObj.setDate(prevDateObj.getDate() - compareOffset);
          calculatedPrevDate = formatDate(prevDateObj);
      }
 
      return {
        date: row.date,
        datePrev: calculatedPrevDate,
        harvests: h,
        cropsKg: kg,
        readyBatches: ready,
        avgYield: h > 0 ? kg / h : 0,
        harvestsPrev: hPrev,
        cropsKgPrev: kgPrev,
        readyBatchesPrev: readyPrev,
        avgYieldPrev: hPrev > 0 ? kgPrev / hPrev : 0
      };
    });
 
    res.json({
      success: true,
      metrics: {
        total_harvests: {
          value: curr.harvests,
          change: calcChange(curr.harvests, prev.harvests)
        },
        crops_harvested: {
          value: curr.total_crops_kg,
          change: calcChange(curr.total_crops_kg, prev.total_crops_kg)
        },
        harvest_ready: {
          value: currReady.ready_batches,
          change: calcChange(currReady.ready_batches, prevReadyBatches.ready_batches)
        },
        average_yield_per_batch: {
          value: currentAvgYield,
          change: calcChange(currentAvgYield, prevAvgYield)
        }
      },
      chartData: chartData
    });
  } catch (err) {
    console.error('Harvest Insights Error:', err);
    res.status(500).json({ error: 'Failed to fetch harvest insights' });
  }
});

/* =====================
   STATIC FILES
===================== */
app.use('/uploads', express.static('uploads'));

/* =========================================
   ADMIN DASHBOARD API (Admin-only)
   ========================================= */
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
  // Only allow Admin users to access dashboard analytics
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    console.log("📊 Fetching dashboard data for admin:", req.user.id);
    
    // 1. Get Stats
    const [orderStats] = await pool.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders`);
    const [productStats] = await pool.query(`SELECT COUNT(*) as total_products FROM plant_inventory`);
    const [customerStats] = await pool.query(`SELECT COUNT(*) as total_customers FROM users WHERE role = 'Buyer'`);
    
    // 2. Get Top Products
    const [topProducts] = await pool.query(`
      SELECT p.name, COALESCE(SUM(oi.quantity_purchased), 0) as sales
      FROM plant_inventory p LEFT JOIN order_items oi ON p.plant_id = oi.plant_id
      GROUP BY p.plant_id, p.name ORDER BY sales DESC LIMIT 5
    `);

    // 3. Get Revenue History (Dynamic Range)
        // Check if frontend sent a specific range (e.g. ?range=30), default to 7
        const days = req.query.range ? Number(req.query.range) : 7;

        const [revenueRaw] = await pool.query(`
            SELECT DATE_FORMAT(order_date, '%Y-%m-%d') as date, SUM(total_amount) as daily_revenue
            FROM orders 
            WHERE order_date >= DATE_SUB(NOW(), INTERVAL ? DAY) 
            GROUP BY date 
            ORDER BY date ASC
        `, [days]); // <--- Pass the variable here
    const revenueTrend = revenueRaw.map(row => ({ date: row.date, daily_revenue: parseFloat(row.daily_revenue) }));
    
    // 4. Get Alerts & Recent Orders
    const [lowStock] = await pool.query(`SELECT name, quantity FROM plant_inventory WHERE quantity < 5 ORDER BY quantity ASC LIMIT 5`);
    const [recentOrders] = await pool.query(`
      SELECT o.order_id, u.first_name, o.total_amount, o.status, o.order_date
      FROM orders o JOIN users u ON o.buyer_id = u.id ORDER BY o.order_date DESC LIMIT 5
    `);

    res.json({
      success: true,
      stats: { 
        revenue: orderStats[0].total_revenue, 
        orders: orderStats[0].total_orders, 
        products: productStats[0].total_products, 
        customers: customerStats[0].total_customers 
      },
      chartData: topProducts,
      alerts: lowStock,
      recentOrders: recentOrders,
      revenueTrend: revenueTrend
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
