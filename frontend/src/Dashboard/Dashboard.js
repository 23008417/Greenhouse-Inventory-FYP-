import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mqtt from 'mqtt'; // MQTT client for live sensor stream
import {
  FiFilter, FiChevronDown, FiArrowUp, FiArrowDown,
  FiCheckCircle, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiChevronRight, FiCalendar,
  FiInfo, FiClock, FiAlertTriangle
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';
import { API_URL } from '../apiConfig';

// Dashboard: Admin analytics + live sensor monitoring
const Dashboard = () => {
  const navigate = useNavigate();

  // Main dashboard data from backend
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter range (days) for sales history
  const [timeRange, setTimeRange] = useState(7);

  // Live sensor stream (temp + humidity) for charts
  const [sensorData, setSensorData] = useState([]);

  // HiveMQ client reference (used by demo buttons)
  const clientRef = useRef(null);

  // Danger flags to prevent repeated alert spam
  const [alertSent, setAlertSent] = useState(false);
  const [alertSentHumidity, setAlertSentHumidity] = useState(false);

  // Modal popups for critical sensor states
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [showHumidityDangerModal, setShowHumidityDangerModal] = useState(false);

  // Thresholds for alerting
  const HUMIDITY_DANGER_THRESHOLD = 85; // % RH
  const TEMP_DANGER_THRESHOLD = 35.0;   // degrees C

  // Local log of recent sensor alerts (persisted to localStorage)
  const [sensorAlerts, setSensorAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem('sensorAlertsLog');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Add a new sensor alert to the top of the list
  const addSensorAlert = (alert) => {
    setSensorAlerts((current) => {
      const updated = [alert, ...current];
      if (updated.length > 8) updated.pop();
      return updated;
    });
  };

  // Clear the log (with confirmation)
  const clearSensorAlerts = () => {
    if (!window.confirm('Clear the sensor alert log?')) return;
    setSensorAlerts([]);
    localStorage.removeItem('sensorAlertsLog');
  };

  // Persist sensor alerts log in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sensorAlertsLog', JSON.stringify(sensorAlerts));
    } catch {}
  }, [sensorAlerts]);

  // Save auto alert for high temperature to DB as an announcement
  const triggerAutoAnnouncement = async (tempVal) => {
    if (alertSent) return; // Stop if we already warned recently

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `CRITICAL: High Temp (${tempVal} C)`,
          description: `Automated Sensor Alert: Greenhouse Zone A is overheating. Ventilation systems activated.`,
          event_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toLocaleTimeString(),
          location: 'Sensor Node A',
          category: 'Maintenance',
          audience: 'Staff'
        })
      });
      console.log(" Critical Alert saved to DB!");
      setAlertSent(true);
    } catch (err) { console.error("Alert failed", err); }
  };

  // Save auto alert for high humidity to DB as an announcement
  const triggerHumidityAnnouncement = async (humVal) => {
    if (alertSentHumidity) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `CRITICAL: High Humidity (${humVal}%)`,
          description: `Automated Sensor Alert: Greenhouse Zone A humidity is too high. Dehumidification/ventilation advised.`,
          event_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toLocaleTimeString(),
          location: 'Sensor Node A',
          category: 'Maintenance',
          audience: 'Staff'
        })
      });
      console.log("Critical humidity alert saved to DB!");
      setAlertSentHumidity(true);
    } catch (err) { console.error("Humidity alert failed", err); }
  };

  // --- LIVE SENSOR STREAM (HiveMQ) ---
  useEffect(() => {
    // Connect to HiveMQ over WebSockets (MQTT broker)
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
    // Topic = channel name where sensors publish readings
    const topic = 'fyp/greenhouse/23008417/combined';

    clientRef.current = client;

    // When connected, subscribe and (demo) publish fake readings
    client.on('connect', () => {
      console.log('? Connected to HiveMQ Cloud');
      client.subscribe(topic);

      // Demo loop: publish random readings so charts animate
      const interval = setInterval(() => {
        const fakeTemp = (24 + Math.random() * 2).toFixed(1);
        const fakeHum = (55 + Math.random() * 10).toFixed(0);
        client.publish(topic, JSON.stringify({ temp: fakeTemp, hum: fakeHum }));
      }, 3000);

      return () => clearInterval(interval);
    });

    // Receive messages for the topic and update charts/alerts
    client.on('message', (receivedTopic, message) => {
      try {
        // Parse raw JSON string into usable numbers
        const data = JSON.parse(message.toString());
        const now = new Date();
        const timeLabel = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();

        // --- DANGER CHECKS: popup + staff announcement ---
        if (parseFloat(data.temp) > TEMP_DANGER_THRESHOLD) {
          setShowDangerModal(true);
          triggerAutoAnnouncement(data.temp);
          addSensorAlert({
            id: `temp-${Date.now()}`,
            type: 'Temp',
            value: `${data.temp}C`,
            time: now.toLocaleTimeString(),
            severity: 'high'
          });
        }
        if (parseFloat(data.hum) > HUMIDITY_DANGER_THRESHOLD) {
          setShowHumidityDangerModal(true);
          triggerHumidityAnnouncement(data.hum);
          addSensorAlert({
            id: `hum-${Date.now()}`,
            type: 'Humidity',
            value: `${data.hum}%`,
            time: now.toLocaleTimeString(),
            severity: 'medium'
          });
        }

        // Keep only the latest 20 points to keep charts readable
        setSensorData(current => {
          const updated = [...current, { time: timeLabel, temp: data.temp, hum: data.hum }];
          if (updated.length > 20) updated.shift();
          return updated;
        });
      } catch (err) { console.error(err); }
    });

    // Cleanup MQTT connection on unmount
    return () => { if (client) client.end(); };
  }, [alertSent, alertSentHumidity]);

  // --- FETCH DASHBOARD DATA (FROM DATABASE) ---
  useEffect(() => {
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
  }, [timeRange]);

  // Loading / error states
  if (loading) return (
      <main className="dashboard-main">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading real-time data...</p>
        </div>
      </main>
  );
  if (error) return (
    <main className="dashboard-main">
      <div style={{ color: 'red', padding: '2rem' }}>
        <h2> Error Loading Dashboard</h2>
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
          {/* Placeholder for future filter buttons */}
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
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />

                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="daily_revenue" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : <div style={{padding:'20px', color:'#999'}}>No sales history yet</div>}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. LIVE HUMIDITY (BLUE) */}
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Live Humidity</h4>

            {/* Demo button to simulate high humidity */}
            <button
              onClick={() => {
                if (clientRef.current) {
                  clientRef.current.publish('fyp/greenhouse/23008417/combined', JSON.stringify({ temp: 26.0, hum: 92 }));
                }
              }}
              style={{
                backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd',
                padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Simulate High Humidity
            </button>
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

        {/* 3. LIVE TEMPERATURE (RED) */}
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Live Greenhouse Temp</h4>

            {/* Demo button to simulate heatwave */}
            <button
              onClick={() => {
                if (clientRef.current) {
                  clientRef.current.publish('fyp/greenhouse/23008417/combined', JSON.stringify({ temp: 50.0, hum: 20 }));
                }
              }}
              style={{
                backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
                padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Simulate Heatwave
            </button>
          </div>
          <div className="chart-value">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="chart-label">Current Temp</span>
              <strong>
                {sensorData.length > 0 ? sensorData[sensorData.length - 1].temp : '--'}C
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

                <XAxis
                    dataKey="time"
                    tick={{fontSize: 10}}
                    interval="preserveStartEnd"
                />

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

        {/* 4. RECENT ORDERS LIST */}
        <div className="card capacity-card">
          <div className="card-header">
            <h4>Recent Orders <FiClock /></h4>
            <div className="card-actions">
             <button
                className="view-all-btn"
                onClick={() => navigate('/dashboard/customers')}
              >
                View all
              </button>
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

        {/* 5. LOW STOCK ALERTS */}
        <div className="card alerts-card">
          <div className="card-header">
            <h4>Low Stock Alerts <span className="alert-badge red">{data.alerts.length}</span> <FiInfo /></h4>
          </div>
          <div className="alert-list">
            {data.alerts.length === 0 ? <div className="alert-item"><span>Inventory levels are good!</span></div> : null}
            {data.alerts.map((item, index) => (
              <div
                key={index}
                className="alert-item"
                onClick={() => navigate('/dashboard/plants/inventory')}
                style={{cursor: 'pointer'}}
                title="Click to manage inventory"
              >
                <FiAlertTriangle className="icon red" />
                <span>
                    <b>{item.name}</b> is {item.quantity === 0 ? "Out of Stock" : `running low (${item.quantity} left)`}
                </span>
                <FiChevronRight className="arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* 6. SENSOR ALERTS TIMELINE */}
        <div className="card capacity-card">
          <div className="card-header">
            <h4>Sensor Alerts <FiAlertTriangle /></h4>
            <div className="card-actions">
              <button
                className="view-all-btn"
                onClick={clearSensorAlerts}
              >
                Clear log
              </button>
            </div>
          </div>
          <div className="capacity-list">
            <div className="capacity-header">
              <span>Type</span>
              <span>Value</span>
              <span>When</span>
            </div>
            {sensorAlerts.map((alert) => (
              <div key={alert.id} className="capacity-item">
                <span className="location" style={{fontWeight: '600'}}>
                  {alert.type}
                </span>
                <span
                  className="system"
                  style={{
                    color: alert.severity === 'high' ? '#b91c1c' : '#1e40af',
                    fontWeight: '600'
                  }}
                >
                  {alert.value}
                </span>
                <div className="item-progress">
                  <span className="capacity-partial">{alert.time}</span>
                </div>
              </div>
            ))}
            {sensorAlerts.length === 0 && <div style={{padding:'10px'}}>No sensor alerts yet.</div>}
          </div>
        </div>
      </section>

      {/* --- BOTTOM ROW (Charts) --- */}
      <section className="centered-chart-row">
        {/* Top Performing Crops */}
        <div className="chart-card pie-card-wide">
          <div className="chart-header">
            <h4>Top Performing Crops</h4>
          </div>
          <div style={{ width: '100%', height: 260 }}>
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

        {/* Inventory Breakdown Pie Chart */}
        <div className="chart-card pie-card-wide">
          <div className="chart-header">
            <h4>Inventory Composition</h4>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.categoryData && data.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '10px', fontSize: '0.75rem' }}>
              {data.categoryData && data.categoryData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][index % 5] }}></span>
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency popup for high temperature */}
        {showDangerModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: '#fee2e2', border: '4px solid #ef4444',
              padding: '2rem', borderRadius: '15px', textAlign: 'center',
              maxWidth: '500px', boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)'
            }}>
              <FiAlertTriangle size={60} color="#ef4444" />
              <h1 style={{ color: '#991b1b', margin: '1rem 0' }}>CRITICAL ALERT</h1>
              <p style={{ fontSize: '1.2rem', color: '#7f1d1d', marginBottom: '2rem' }}>
                High Temperature Detected! <br />
                <strong>Greenhouse Zone A is Overheating.</strong>
              </p>
              <button
                onClick={() => setShowDangerModal(false)}
                style={{
                  padding: '12px 24px', backgroundColor: '#ef4444', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                ACKNOWLEDGE ALARM
              </button>
            </div>
          </div>
        )}

        {/* Emergency popup for high humidity */}
        {showHumidityDangerModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{
              backgroundColor: '#dbeafe', border: '4px solid #3b82f6',
              padding: '2rem', borderRadius: '15px', textAlign: 'center',
              maxWidth: '500px', boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)'
            }}>
              <FiAlertTriangle size={60} color="#3b82f6" />
              <h1 style={{ color: '#1e3a8a', margin: '1rem 0' }}>CRITICAL HUMIDITY</h1>
              <p style={{ fontSize: '1.2rem', color: '#1e3a8a', marginBottom: '2rem' }}>
                High Humidity Detected! <br />
                <strong>Greenhouse Zone A is above safe RH.</strong>
              </p>
              <button
                onClick={() => setShowHumidityDangerModal(false)}
                style={{
                  padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                ACKNOWLEDGE ALARM
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;
