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
      price
    } = req.body;

    if (!name || !crop_category || !seeding_date || !quantity) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const image_url = req.file
      ? `/uploads/${req.file.filename}`
      : 'https://placehold.co/400x300?text=Plant';

    await pool.query(
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
        Number(quantity),
        Number(price) || 0,
        image_url
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
    const [plants] = await pool.query(
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
      WHERE seller_id = ?`,
      [req.user.id]
    );

    res.json({ plants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plants' });
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

// Public store items (plants listed for sale)
app.get('/api/store/items', authenticate, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT
        plant_id,
        name,
        price,
        image_url
      FROM plant_inventory
      WHERE quantity > 0 AND price > 0`
    );

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch store items' });
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

  try {
    // On the client we already call actions.order.capture().
    // Here we just GET the order to verify it and then
    // treat it as confirmed on our side.
    const request = new paypal.orders.OrdersGetRequest(orderID);
    const response = await client.execute(request);

    const status = response.result.status;
    if (status !== 'COMPLETED') {
      return res.status(400).json({ error: `Unexpected PayPal status: ${status}` });
    }

    // TODO: persist order + decrement inventory using `items` and `total`.

    res.json({
      success: true,
      orderId: orderID,
      paypalStatus: status,
    });
  } catch (err) {
    console.error('PayPal verification failed', err);
    res.status(500).json({ error: 'Failed to verify PayPal order' });
  }
});

/* =====================
   STATIC FILES
===================== */
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
