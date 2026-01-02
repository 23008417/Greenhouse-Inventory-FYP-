import React from 'react';
import { 
  FiFilter, FiChevronDown, FiArrowUp, FiArrowDown,
  FiCheckCircle, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiChevronRight, FiCalendar,
  FiInfo, FiClock, FiAlertTriangle
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './Dashboard.css';

const harvestData = [
  { name: 'Sep 30', value: 210 }, { name: 'Oct 05', value: 230 }, { name: 'Oct 10', value: 200 },
  { name: 'Oct 15', value: 250 }, { name: 'Oct 20', value: 220 }, { name: 'Oct 25', value: 280 },
  { name: 'Oct 30', value: 260 },
];

const salesData = [
  { name: 'Sep 30', value: 2000 }, { name: 'Oct 05', value: 2100 }, { name: 'Oct 10', value: 1900 },
  { name: 'Oct 15', value: 2300 }, { name: 'Oct 20', value: 2200 }, { name: 'Oct 25', value: 2500 },
  { name: 'Oct 30', value: 2400 },
];

const cropData = [
  { name: 'Lettuce', Current: 150, 'Last 30 days': 120 },
  { name: 'Peppermint', Current: 380, 'Last 30 days': 320 },
  { name: 'Choysum', Current: 220, 'Last 30 days': 200 },
  { name: 'Kale', Current: 400, 'Last 30 days': 300 },
];

const Dashboard = () => {
  return (
    <main className="dashboard-main">
      <section className="overview-header">
        <h2>Your overview</h2>
        <div className="filters">
          <button><FiFilter /> Filter</button>
          <button>Date range: Last 30 days <FiChevronDown /></button>
          <button><FiCalendar /> Compare: Previous period <FiChevronDown /></button>
        </div>
      </section>

      <section className="stat-cards">
        <div className="stat-card">
          <span className="card-title">Total active plants <FiInfo /></span>
          <div className="card-value">120</div>
          <div className="card-change positive"><FiArrowUp /> 5.8%</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Harvest-ready <FiInfo /></span>
          <div className="card-value">12</div>
          <div className="card-change neutral">-</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Total harvest <FiInfo /></span>
          <div className="card-value">200</div>
          <div className="card-change negative"><FiArrowDown /> 3.1%</div>
        </div>
        <div className="stat-card">
          <span className="card-title">Total sales <FiInfo /></span>
          <div className="card-value">$2.2k</div>
          <div className="card-change positive"><FiArrowUp /> 10.8%</div>
        </div>
      </section>

      <section className="mid-row">
        <div className="chart-card">
          <div className="chart-header">
            <h4>Harvest performance <FiInfo /></h4>
            <span>Previous period</span>
          </div>
          <div className="chart-value">
            <div><span className="chart-label">Harvest volume <FiInfo /></span><strong>200</strong></div>
            <div><span className="chart-label">Previous</span><strong>206</strong></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={harvestData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h4>Sales performance <FiInfo /></h4>
            <span>Previous period</span>
          </div>
          <div className="chart-value">
            <div><span className="chart-label">Sales revenue <FiInfo /></span><strong>$2200.54</strong></div>
            <div><span className="chart-label">Previous</span><strong>$1986.62</strong></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card capacity-card">
          <div className="card-header">
            <h4>Capacity utilisation <FiInfo /></h4>
            <div className="card-actions">
              <button><FiFilter /> Filter</button>
              <button>View all</button>
            </div>
          </div>
          <div className="capacity-list">
            <div className="capacity-header">
              <span>Location</span>
              <span>System Type</span>
              <span>Capacity</span>
            </div>
            <div className="capacity-item">
              <span className="location">Glasshouse</span>
              <span className="system">Multi-Tier</span>
              <div className="item-progress">
                <div className="progress-bar">
                  <div style={{ width: '100%', backgroundColor: 'var(--red-500)' }}></div>
                </div>
                <span className="capacity-full">180/180</span>
              </div>
            </div>
            <div className="capacity-item">
              <span className="location">Glasshouse</span>
              <span className="system">MGS</span>
              <div className="item-progress">
                <div className="progress-bar">
                  <div style={{ width: '90%', backgroundColor: 'var(--orange-500)' }}></div>
                </div>
                <span className="capacity-partial">72/80</span>
              </div>
            </div>
            <div className="capacity-item">
              <span className="location">Glasshouse</span>
              <span className="system">DWC</span>
              <div className="item-progress">
                <div className="progress-bar">
                  <div style={{ width: '11%', backgroundColor: 'var(--green-500)' }}></div>
                </div>
                <span className="capacity-partial">10/90</span>
              </div>
            </div>
            <div className="capacity-item">
              <span className="location">Lab</span>
              <span className="system">MGS</span>
              <div className="item-progress">
                <div className="progress-bar">
                  <div style={{ width: '0%', backgroundColor: 'var(--green-500)' }}></div>
                </div>
                <span className="capacity-partial">0/180</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bottom-row">
        <div className="card alerts-card">
          <div className="card-header">
            <h4>Harvest alerts <span className="alert-badge red">5</span> <FiInfo /></h4>
            <button>View all</button>
          </div>
          <div className="alert-list">
            <div className="alert-item">
              <FiCheckCircle className="icon green" />
              <span>12 crops ready for harvest</span>
              <FiChevronRight className="arrow" />
            </div>
            <div className="alert-item">
              <FiClock className="icon orange" />
              <span>30 crops maturing within 7 days</span>
              <FiChevronRight className="arrow" />
            </div>
            <div className="alert-item">
              <FiTrendingDown className="icon orange" />
              <span>Lettuce running low on stock (2 left)</span>
              <FiChevronRight className="arrow" />
            </div>
            <div className="alert-item">
              <FiAlertCircle className="icon red" />
              <span>System MGS capacity full — harvesting delayed</span>
              <FiChevronRight className="arrow" />
            </div>
          </div>
        </div>
        
        <div className="card alerts-card">
          <div className="card-header">
            <h4>Sales alerts <span className="alert-badge red">3</span> <FiInfo /></h4>
            <button>View all</button>
          </div>
          <div className="alert-list">
            <div className="alert-item">
              <FiClock className="icon orange" />
              <span>6 orders pending</span>
              <FiChevronRight className="arrow" />
            </div>
            <div className="alert-item">
              <FiAlertTriangle className="icon red" />
              <span>2 orders failed payment</span>
              <FiChevronRight className="arrow" />
            </div>
            <div className="alert-item">
              <FiTrendingUp className="icon green" />
              <span>Peppermint sales increased by 15% from last week</span>
              <FiChevronRight className="arrow" />
            </div>
          </div>
        </div>

        <div className="card crops-card">
          <div className="card-header">
            <h4>Top performing crops <FiInfo /></h4>
            <button><FiFilter /> Filter</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cropData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <Tooltip cursor={{fill: '#f9fafb'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} />
              <Bar dataKey="Current" fill="#047857" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Last 30 days" fill="#a7f3d0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;