import React, { useEffect, useState } from 'react';
import './Dashboard.css'; 
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FaShoppingCart, FaUser, FaLeaf, FaDollarSign, FaExclamationTriangle } from 'react-icons/fa';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Just use the relative path. 
        // The Proxy (local) or the Server (live) will figure out the rest.
        fetch('/api/admin/dashboard')
            .then(async (res) => {
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    if (json.success) {
                        setData(json);
                    } else {
                        setError(json.message || "Backend Error");
                    }
                } catch (e) {
                    // If we get here, it means the server sent HTML (404/Index). 
                    // This confirms the route is missing on the server.
                    console.error("Server HTML response:", text);
                    throw new Error("Server connection error (Received HTML instead of JSON)");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="dashboard-main">Loading Dashboard...</div>;
    
    if (error) return (
        <div className="dashboard-main" style={{ color: 'red', padding: '2rem' }}>
            <h2>⚠️ Error Loading Dashboard</h2>
            <p><strong>Reason:</strong> {error}</p>
        </div>
    );

    if (!data) return <div className="dashboard-main">No data found.</div>;

    return (
        <main className="dashboard-main">
            <div className="overview-header"><h2>Overview</h2></div>
            {/* STAT CARDS */}
            <div className="stat-cards">
                <div className="stat-card"><div className="card-title">Revenue <FaDollarSign /></div><div className="card-value">${data.stats.revenue}</div></div>
                <div className="stat-card"><div className="card-title">Orders <FaShoppingCart /></div><div className="card-value">{data.stats.orders}</div></div>
                <div className="stat-card"><div className="card-title">Customers <FaUser /></div><div className="card-value">{data.stats.customers}</div></div>
                <div className="stat-card"><div className="card-title">Plants <FaLeaf /></div><div className="card-value">{data.stats.products}</div></div>
            </div>
            
            {/* CHARTS */}
            <div className="mid-row" style={{ gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div className="chart-card">
                    <div className="chart-header"><h4>Top Selling</h4></div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer><BarChart data={data.chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="sales" fill="#10b981" /></BarChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="card capacity-card">
                    <div className="card-header"><h4>Low Stock</h4></div>
                    <div className="alert-list">{data.alerts.map((item, i) => (<div key={i} className="alert-item"><div>{item.name}</div><span className="alert-badge">Low</span></div>))}</div>
                </div>
            </div>

            {/* LINE CHART */}
            <div className="bottom-row" style={{ display: 'grid', gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
                <div className="chart-card">
                    <div className="chart-header"><h4>Revenue (7 Days)</h4></div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            {data.revenueTrend?.length > 0 ? (
                                <LineChart data={data.revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tickFormatter={(str) => new Date(str).toLocaleDateString()} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="daily_revenue" stroke="#3b82f6" strokeWidth={3} />
                                </LineChart>
                            ) : <div style={{display:'flex', height:'100%', justifyContent:'center', alignItems:'center'}}>No data</div>}
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card"><div className="card-header"><h4>Recent Orders</h4></div><div className="capacity-list">{data.recentOrders.map(o => (<div key={o.order_id} className="capacity-item">Order #{o.order_id} - ${o.total_amount}</div>))}</div></div>
            </div>
        </main>
    );
};

export default Dashboard;