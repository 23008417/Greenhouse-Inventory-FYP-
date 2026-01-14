import React, { useEffect, useState } from 'react';
import { 
  FiFilter, FiChevronDown, FiArrowUp, FiArrowDown,
  FiCheckCircle, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiChevronRight, FiCalendar,
  FiInfo, FiClock, FiAlertTriangle
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // --- SMART URL SELECTION ---
    // 1. Local: Use localhost:5000
    // 2. Production: Use the REAL Backend URL directly (cropflow-backend)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // CONFIRMED BACKEND URL from your team
    const LIVE_BACKEND_URL = 'https://cropflow-backend.onrender.com';
    
    const API_BASE_URL = isLocal ? 'http://localhost:5000' : LIVE_BACKEND_URL;

    console.log(`Fetching from: ${API_BASE_URL}/api/admin/dashboard`);

    fetch(`${API_BASE_URL}/api/admin/dashboard`)
      .then(async (res) => {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.success) {
            setData(json);
          } else {
            setError(json.message || "Backend returned an error");
          }
        } catch (e) {
          console.error("Server returned HTML:", text);
          throw new Error("Server returned HTML instead of Data. Check API URL.");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <main className="dashboard-main"><div style={{padding: '2rem'}}>Loading real-time data...</div></main>;
  
  if (error) return (
    <main className="dashboard-main">
      <div style={{ color: 'red', padding: '2rem' }}>
        <h2>⚠️ Error Loading Dashboard</h2>
        <p><strong>Reason:</strong> {error}</p>
        <p><strong>Fix:</strong> Ensure backend CORS allows this frontend domain.</p>
      </div>
    </main>
  );

  if (!data) return <main className="dashboard-main"><div>No data found.</div></main>;

  return (
    <main className="dashboard-main">
      <section className="overview-header">
        <h2>Your overview</h2>
        <div className="filters">
          <button><FiFilter /> Filter</button>
          <button>Date range: Last 7 days <FiChevronDown /></button>
          <button><FiCalendar /> Compare: Previous period <FiChevronDown /></button>
        </div>
      </section>

      {/* --- STAT CARDS (REAL DATA) --- */}
      <section className="stat-cards">
        <div className="stat-card">
          <span className="card-title">Total Plants <FiInfo /></span>
          <div className="card-value">{data.stats.products}</div>
          <div className="card-change positive"><FiArrowUp /> Active Inventory</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Total Orders <FiInfo /></span>
          <div className="card-value">{data.stats.orders}</div>
          <div className="card-change positive"><FiCheckCircle /> Completed</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Total Customers <FiInfo /></span>
          <div className="card-value">{data.stats.customers}</div>
          <div className="card-change neutral"><FiInfo /> Registered</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Total Revenue <FiInfo /></span>
          <div className="card-value">${data.stats.revenue}</div>
          <div className="card-change positive"><FiTrendingUp /> Sales</div>
        </div>
      </section>

      {/* --- MID ROW (CHARTS & LISTS) --- */}
      <section className="mid-row">
        
        {/* 1. SALES LINE CHART (Revenue History) */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>Sales Performance (7 Days) <FiInfo /></h4>
          </div>
          <div className="chart-value">
            <div><span className="chart-label">Revenue</span><strong>${data.stats.revenue}</strong></div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              {data.revenueTrend && data.revenueTrend.length > 0 ? (
                <LineChart data={data.revenueTrend} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    fontSize={10} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="daily_revenue" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : <div style={{padding:'20px', color:'#999'}}>No sales history yet</div>}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. TOP PRODUCTS BAR CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>Top Performing Crops <FiInfo /></h4>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
               <BarChart data={data.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                 <Tooltip cursor={{fill: '#f9fafb'}} />
                 <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                 <YAxis fontSize={12} axisLine={false} tickLine={false} />
                 <Bar dataKey="sales" fill="#047857" radius={[4, 4, 0, 0]} name="Units Sold" />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. RECENT ORDERS LIST (Replaces Capacity) */}
        <div className="card capacity-card">
          <div className="card-header">
            <h4>Recent Orders <FiClock /></h4>
            <div className="card-actions">
              <button>View all</button>
            </div>
          </div>
          <div className="capacity-list">
            <div className="capacity-header">
              <span>Order ID</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {data.recentOrders.map((order) => (
              <div key={order.order_id} className="capacity-item">
                <span className="location">#{order.order_id}</span>
                <span className="system" style={{color: order.status === 'Completed' ? 'green' : 'orange'}}>
                    {order.status}
                </span>
                <div className="item-progress">
                  <span className="capacity-partial">${order.total_amount}</span>
                </div>
              </div>
            ))}
            {data.recentOrders.length === 0 && <div style={{padding:'10px'}}>No recent orders.</div>}
          </div>
        </div>
      </section>

      {/* --- BOTTOM ROW (ALERTS) --- */}
      <section className="bottom-row">
        
        {/* Low Stock Alerts */}
        <div className="card alerts-card">
          <div className="card-header">
            <h4>Low Stock Alerts <span className="alert-badge red">{data.alerts.length}</span> <FiInfo /></h4>
          </div>
          <div className="alert-list">
            {data.alerts.length === 0 ? <div className="alert-item"><span>Inventory levels are good!</span></div> : null}
            {data.alerts.map((item, index) => (
              <div key={index} className="alert-item">
                <FiAlertTriangle className="icon red" />
                <span><b>{item.name}</b> is running low ({item.quantity} left)</span>
                <FiChevronRight className="arrow" />
              </div>
            ))}
          </div>
        </div>

      </section>
    </main>
  );
};

export default Dashboard;