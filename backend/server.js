// server.js — FINAL VERSION (Auth + Admin Dashboard 7-Day Fix)
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors({ origin: true, credentials: true })); 
app.use(express.json());

// --- DATABASE CONNECTION ---
const pool = mysql.createPool(process.env.DATABASE_URL);

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// --- 1. SIGNUP ROUTE ---
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid email and password (6+ chars) required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES (?, ?, ?, ?, 'Buyer')`,
      [email.toLowerCase(), hashed, (firstName || '').trim(), (lastName || '').trim()]
    );

    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Account created!',
      user: {
        id: result.insertId,
        email: email.toLowerCase(),
        firstName: (firstName || '').trim(),
        lastName: (lastName || '').trim(),
        role: 'Buyer'
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- 2. LOGIN ROUTE ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- 3. GET CURRENT USER ---
app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) return res.json({ user: null });

    const u = rows[0];
    res.json({
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        role: u.role
      }
    });
  } catch {
    res.json({ user: null });
  }
});

// --- 4. LOGOUT ---
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});


// ==========================================
//  ADMIN DASHBOARD API (Stats & Charts)
// ==========================================
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        console.log("📊 Fetching dashboard data...");

        // A. STAT CARDS
        const [orderStats] = await pool.query(`
            SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue 
            FROM orders
        `);
        
        const [productStats] = await pool.query(`SELECT COUNT(*) as total_products FROM plant_inventory`);
        const [customerStats] = await pool.query(`SELECT COUNT(*) as total_customers FROM users WHERE role = 'Buyer'`);

        // B. CHART DATA: Top 5 Best Selling Plants
        const [topProducts] = await pool.query(`
            SELECT p.name, COALESCE(SUM(oi.quantity_purchased), 0) as sales
            FROM plant_inventory p
            LEFT JOIN order_items oi ON p.plant_id = oi.plant_id
            GROUP BY p.plant_id, p.name
            ORDER BY sales DESC
            LIMIT 5
        `);

        // C. ALERTS: Low Stock Inventory
        const [lowStock] = await pool.query(`
            SELECT name, quantity 
            FROM plant_inventory 
            WHERE quantity < 20 
            ORDER BY quantity ASC 
            LIMIT 5
        `);

        // D. RECENT ACTIVITY: Latest 5 Orders
        const [recentOrders] = await pool.query(`
            SELECT o.order_id, u.first_name, o.total_amount, o.status, o.order_date
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            ORDER BY o.order_date DESC
            LIMIT 5
        `);

        // E. LINE CHART: Revenue History (Last 7 Days)
        // Updated to use 7 DAY interval instead of 30
        const [revenueRaw] = await pool.query(`
            SELECT 
                DATE_FORMAT(order_date, '%Y-%m-%d') as date, 
                SUM(total_amount) as daily_revenue
            FROM orders
            WHERE order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            GROUP BY date
            ORDER BY date ASC
        `);

        // Format numbers for the graph
        const revenueTrend = revenueRaw.map(row => ({
            date: row.date,
            daily_revenue: parseFloat(row.daily_revenue)
        }));

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


// --- STATIC FILES & START SERVER ---
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));

  app.get('/*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));