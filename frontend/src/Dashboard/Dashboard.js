import React, { useEffect, useState } from 'react';
import './Dashboard.css'; 
import { 
    LineChart, Line, BarChart, Bar, 
    CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { FaShoppingCart, FaUser, FaLeaf, FaDollarSign, FaExclamationTriangle } from 'react-icons/fa';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // --- SMART URL SELECTION ---
        // 1. If we are on 'localhost', assume backend is at http://localhost:5000
        // 2. If we are on Render (production), use relative path (same domain)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_BASE_URL = isLocal ? 'http://localhost:5000' : '';

        console.log(`Fetching from: ${API_BASE_URL}/api/admin/dashboard`);

        fetch(`${API_BASE_URL}/api/admin/dashboard`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setData(data);
                } else {
                    setError(data.message || "Backend returned an error");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch dashboard:", err);
                setError(err.message || "Network Error - Is the backend running?");
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="dashboard-main">Loading Dashboard...</div>;
    
    if (error) return (
        <div className="dashboard-main" style={{ color: 'red', padding: '2rem' }}>
            <h2>⚠️ Error Loading Dashboard</h2>
            <p><strong>Reason:</strong> {error}</p>
            <p>Please check your backend terminal for more details.</p>
        </div>
    );

    if (!data) return <div className="dashboard-main">No data found.</div>;

    return (
        <main className="dashboard-main">
            <div className="overview-header">
                <h2>Overview</h2>
            </div>

            {/* --- TOP ROW: STAT CARDS --- */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="card-title">Total Revenue <FaDollarSign /></div>
                    <div className="card-value">${data.stats.revenue}</div>
                    <div className="card-change positive">Since start</div>
                </div>
                <div className="stat-card">
                    <div className="card-title">Total Orders <FaShoppingCart /></div>
                    <div className="card-value">{data.stats.orders}</div>
                </div>
                <div className="stat-card">
                    <div className="card-title">Customers <FaUser /></div>
                    <div className="card-value">{data.stats.customers}</div>
                </div>
                <div className="stat-card">
                    <div className="card-title">Total Plants <FaLeaf /></div>
                    <div className="card-value">{data.stats.products}</div>
                </div>
            </div>

            {/* --- MIDDLE ROW: BAR CHART + ALERTS --- */}
            <div className="mid-row" style={{ gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                
                {/* 1. BAR CHART: Top Selling Products */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h4>Top Selling Products</h4>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tick={{dy: 10}} />
                                <YAxis stroke="#6b7280" fontSize={12}/>
                                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Units Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. ALERTS: Low Stock */}
                <div className="card capacity-card">
                    <div className="card-header">
                        <h4><FaExclamationTriangle style={{color: '#ef4444'}}/> Low Stock</h4>
                    </div>
                    <div className="alert-list">
                        {data.alerts.length === 0 ? <p style={{padding: '1rem', color: '#6b7280'}}>Inventory levels are good!</p> : null}
                        {data.alerts.map((item, index) => (
                            <div key={index} className="alert-item">
                                <div className="icon red">●</div>
                                <div>
                                    <div style={{fontWeight: 600}}>{item.name}</div>
                                    <div style={{fontSize: '0.85rem', color: '#6b7280'}}>Only {item.quantity} left</div>
                                </div>
                                <span className="alert-badge">Low</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW: LINE CHART + RECENT ORDERS --- */}
            <div className="bottom-row" style={{ display: 'grid', gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
                
                {/* 3. LINE CHART: Revenue History (Last 7 Days) */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h4>Revenue History (Last 7 Days)</h4>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            {data.revenueTrend && data.revenueTrend.length > 0 ? (
                                <LineChart data={data.revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#6b7280" 
                                        fontSize={12} 
                                        tickFormatter={(str) => {
                                            const date = new Date(str);
                                            return `${date.getMonth() + 1}/${date.getDate()}`;
                                        }}
                                        tick={{dy: 10}}
                                    />
                                    <YAxis stroke="#6b7280" fontSize={12} prefix="$"/>
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        formatter={(value) => [`$${value}`, "Revenue"]}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="daily_revenue" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6 }} 
                                        name="Daily Revenue"
                                    />
                                </LineChart>
                            ) : (
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', flexDirection: 'column'}}>
                                    <p>No sales data found for the last 7 days.</p>
                                    <small>(Try adding test orders with past dates)</small>
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. RECENT ORDERS LIST */}
                <div className="card">
                    <div className="card-header">
                        <h4>Recent Orders</h4>
                    </div>
                    <div className="capacity-list">
                        {data.recentOrders.length === 0 ? <p style={{padding: '1rem', color: '#6b7280'}}>No orders yet.</p> : null}
                        {data.recentOrders.map((order) => (
                            <div key={order.order_id} className="capacity-item" style={{gridTemplateColumns: "1fr 1fr", padding: '0.75rem 0'}}>
                                <div>
                                    <div className="location" style={{fontWeight: 'bold'}}>Order #{order.order_id}</div>
                                    <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>{new Date(order.order_date).toLocaleDateString()}</div>
                                </div>
                                <div className="system" style={{textAlign: 'right'}}>
                                    <div style={{color: '#10b981', fontWeight: '600'}}>${order.total_amount}</div>
                                    <span style={{fontSize: '0.75rem', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px'}}>{order.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
};

export default Dashboard;