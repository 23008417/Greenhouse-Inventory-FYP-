import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt'; // <--- NEW IMPORT
import { 
  FiFilter, FiChevronDown, FiArrowUp, FiArrowDown,
  FiCheckCircle, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiChevronRight, FiCalendar,
  FiInfo, FiClock, FiAlertTriangle
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts'; // <--- ADDED AreaChart, Area to this list
import './Dashboard.css';
import { API_URL } from '../apiConfig';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: State for the filter (Default to 7 days)
  const [timeRange, setTimeRange] = useState(7);

  // --- HIVEMQ LIVE SENSOR LOGIC (TEMP + HUMIDITY) ---
  const [sensorData, setSensorData] = useState([]);

  useEffect(() => {
    // 1. Connect to HiveMQ
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt'); // Or use the EMQX URL if that worked better for you
    const topic = 'fyp/greenhouse/23008417/combined'; // New topic for clean data

    client.on('connect', () => {
      console.log('✅ Connected to HiveMQ Cloud');
      client.subscribe(topic);
      
      // 2. Publish Fake Temp AND Humidity every 3 seconds
      const interval = setInterval(() => {
         const fakeTemp = (24 + Math.random() * 2).toFixed(1);
         const fakeHum = (55 + Math.random() * 10).toFixed(0); // Random Humidity 55-65%
         
         // Send both as a JSON package
         const payload = JSON.stringify({ temp: fakeTemp, hum: fakeHum });
         client.publish(topic, payload);
      }, 3000);

      return () => clearInterval(interval);
    });

    client.on('message', (receivedTopic, message) => {
      try {
        // 3. Receive and Parse JSON
        const data = JSON.parse(message.toString());
        const now = new Date();
        const timeLabel = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();

        setSensorData(current => {
          const updated = [...current, { time: timeLabel, temp: data.temp, hum: data.hum }];
          if (updated.length > 20) updated.shift();
          return updated;
        });
      } catch (err) {
        console.error("Error parsing MQTT message:", err);
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // --- FETCH DASHBOARD DATA (FROM DATABASE) ---
  useEffect(() => {
    // UPDATED: Now includes ?range=${timeRange}
    console.log(`Fetching from: ${API_URL}/api/admin/dashboard?range=${timeRange}`);

    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/api/admin/dashboard?range=${timeRange}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
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
  }, [timeRange]); // <--- IMPORTANT: Re-runs fetch whenever 'timeRange' changes

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
         
        </div>
      </section>

      {/* --- STAT CARDS (REAL DATA) --- */}
      <section className="stat-cards">
        <div className="stat-card">
          <span className="card-title">Total Plants</span>
          <div className="card-value">{data.stats.products}</div>
          <div className="card-change positive"><FiArrowUp /> Active Inventory</div>
        </div>

        <div className="stat-card">
          <span className="card-title">Total Orders</span>
          <div className="card-value">{data.stats.orders}</div>
          <div className="card-change positive"><FiCheckCircle /> Completed</div>
        </div>

        <div className="stat-card">
          <span className="card-title">Total Customers</span>
          <div className="card-value">{data.stats.customers}</div>
          {/* Kept this bottom icon for alignment with other cards */}
          <div className="card-change neutral"><FiInfo /> Registered</div>
        </div>

        <div className="stat-card">
          <span className="card-title">Total Revenue</span>
          <div className="card-value">${Number(data.stats.revenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div className="card-change positive"><FiTrendingUp /> Sales</div>
        </div>
      </section>

      {/* --- MID ROW (CHARTS & LISTS) --- */}
      <section className="mid-row">
        
       {/* 1. SALES LINE CHART (Revenue History) */}
        <div className="chart-card">
          {/* Header with Filter Dropdown */}
          <div className="chart-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h4>Sales Performance</h4>
            
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
              style={{
                padding: '4px 8px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db', 
                fontSize: '0.85rem',
                color: '#374151',
                outline: 'none',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 3 Months</option>
            </select>
          </div>

          <div className="chart-value">
            <div><span className="chart-label">Revenue</span><strong>${Number(data.stats.revenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
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

        {/* 2. LIVE HUMIDITY (BLUE) */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>Live Humidity 💧</h4>
          </div>
          <div className="chart-value">
            <span className="chart-label">Current: </span>
            <strong>{sensorData.length > 0 ? sensorData[sensorData.length - 1].hum : '--'}%</strong>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{fontSize: 10}} interval="preserveStartEnd"/>
                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} width={30}/>
                <Tooltip />
                <Area type="monotone" dataKey="hum" stroke="#3b82f6" fill="url(#colorHum)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- NEW: LIVE HIVEMQ TEMPERATURE --- */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>Live Greenhouse Temp 🔴 <FiInfo title="Real-time data streaming via HiveMQ MQTT" /></h4>
          </div>
          <div className="chart-value">
            <div>
                <span className="chart-label">Current Temp</span>
                <strong>
                    {sensorData.length > 0 ? sensorData[sensorData.length - 1].temp : '--'}°C
                </strong>
            </div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                {/* UPDATED: Visible Time Axis */}
                <XAxis 
                    dataKey="time" 
                    tick={{fontSize: 10}} 
                    interval="preserveStartEnd"
                />
                
                {/* NEW: Temperature Scale Axis */}
                <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 10}} 
                    width={30}
                />
                
                <Tooltip />
                <Area 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorTemp)" 
                    isAnimationActive={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. TOP PRODUCTS BAR CHART */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>Top Performing Crops </h4>
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
              <span>Customer</span>
              <span>Status</span>
              <span>Amount</span>
            </div>
            {data.recentOrders.map((order) => (
              <div key={order.order_id} className="capacity-item">
                
                {/* CHANGED HERE: Shows Name instead of ID */}
                <span className="location" style={{fontWeight: '600'}}>
                    {order.first_name || 'Customer'}
                </span>

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
                <span><b>{item.name}</b> is {item.quantity === 0 ? "Out of Stock" : `running low (${item.quantity} left)`}</span>
                <FiChevronRight className="arrow" />
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* --- BOTTOM ROW (ALERTS) --- */}
      <section className="bottom-row">
        
       

      </section>
    </main>
  );
};

export default Dashboard;