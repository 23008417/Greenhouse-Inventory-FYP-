import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
// Removed FiFilter from imports
import { FiChevronDown, FiDownload } from 'react-icons/fi';
import './SalesInsights.css';
import { API_URL } from '../../apiConfig';

const metrics = ['Total revenue', 'Total orders', 'Total crops sold', 'Average order value'];
const chartTypes = ['Bar chart', 'Area chart', 'Line chart'];

const metricKeyMap = {
  'Total revenue': { current: 'revenue', previous: 'revenuePrev' },
  'Total orders': { current: 'orders', previous: 'ordersPrev' },
  'Total crops sold': { current: 'crops', previous: 'cropsPrev' },
  'Average order value': { current: 'avgOrder', previous: 'avgOrderPrev' }
};

const dateOptions = [
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Last 90 days', value: 'last_90_days' },
];

const SalesInsights = () => {
  const [selectedMetric, setSelectedMetric] = useState('Total revenue');
  const [selectedChart, setSelectedChart] = useState('Bar chart');

  // Date and Compare State
  const [dateRange, setDateRange] = useState('last_30_days');
  const [compareType, setCompareType] = useState('none');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown Toggles
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  const [chartData, setChartData] = useState([]);
  const [metricsData, setMetricsData] = useState({
    'Total revenue': { value: 0, change: 0, isPositive: true },
    'Total orders': { value: 0, change: 0, isPositive: true },
    'Total crops sold': { value: 0, change: 0, isPositive: true },
    'Average order value': { value: 0, change: 0, isPositive: true }
  });

  const compareOptions = useMemo(() => {
    const noneOption = { label: 'None', value: 'none' };

    if (dateRange === 'last_7_days') {
      return [
        noneOption,
        { label: 'Previous week', value: 'previous_week' },
        { label: 'Previous month', value: 'previous_month' },
        { label: 'Previous year', value: 'previous_year' }
      ];
    }
    if (dateRange === 'last_30_days') {
      return [
        noneOption,
        { label: 'Previous month', value: 'previous_month' },
        { label: 'Previous year', value: 'previous_year' }
      ];
    }
    if (dateRange === 'last_90_days') {
      return [
        noneOption,
        { label: 'Previous 3 months', value: 'previous_period' },
        { label: 'Previous year', value: 'previous_year' }
      ];
    }
    return [noneOption];
  }, [dateRange]);

  useEffect(() => {
    const isValid = compareOptions.find(c => c.value === compareType);
    if (!isValid) {
      setCompareType('none');
    }
  }, [dateRange, compareOptions, compareType]);

  useEffect(() => {
    const fetchSalesData = async () => {
      const token = localStorage.getItem('token');
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/api/sales/insights?range=${dateRange}&compare=${compareType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
          const m = json.metrics;

          setMetricsData({
            'Total revenue': {
              value: m.totalRevenue?.value || m.total_revenue?.value || 0,
              change: m.totalRevenue?.change || m.total_revenue?.change || 0,
              isPositive: (m.totalRevenue?.change || m.total_revenue?.change || 0) >= 0
            },
            'Total orders': {
              value: m.totalOrders?.value || m.total_orders?.value || 0,
              change: m.totalOrders?.change || m.total_orders?.change || 0,
              isPositive: (m.totalOrders?.change || m.total_orders?.change || 0) >= 0
            },
            'Total crops sold': {
              value: m.totalCropsSold?.value || m.total_crops_sold?.value || 0,
              change: m.totalCropsSold?.change || m.total_crops_sold?.change || 0,
              isPositive: (m.totalCropsSold?.change || m.total_crops_sold?.change || 0) >= 0
            },
            'Average order value': {
              value: m.avgOrderValue?.value || m.average_order_value?.value || 0,
              change: m.avgOrderValue?.change || m.average_order_value?.change || 0,
              isPositive: (m.avgOrderValue?.change || m.average_order_value?.change || 0) >= 0
            }
          });

          const finalData = json.chartData.map(item => ({
            date: item.date,
            datePrev: item.datePrev || '',
            revenue: item.revenue || 0,
            orders: item.orders || 0,
            crops: item.crops || 0,
            avgOrder: item.avgOrder || 0,
            revenuePrev: item.revenuePrev || 0,
            ordersPrev: item.ordersPrev || 0,
            cropsPrev: item.cropsPrev || 0,
            avgOrderPrev: item.avgOrderPrev || 0
          }));

          setChartData(finalData);
        }
      } catch (err) {
        console.error('Failed to fetch sales data', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [dateRange, compareType]);

  // --- EXPORT TO CSV FUNCTION ---
  const handleExport = () => {
    if (!chartData || chartData.length === 0) {
      alert("No data available to export.");
      return;
    }

    // 1. Define Headers
    const headers = ["Date", "Total Revenue", "Total Orders", "Total Crops Sold", "Average Order Value"];

    // 2. Format Data Rows
    const csvRows = [
      headers.join(','), // Header Row
      ...chartData.map(row => {
        return [
          `"${row.date}"`, // Wrap date in quotes to handle spaces/commas
          row.revenue.toFixed(2),
          row.orders,
          row.crops,
          row.avgOrder.toFixed(2)
        ].join(',');
      })
    ];

    // 3. Create Blob and Download
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_insights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { current: currentKey, previous: previousKey } = metricKeyMap[selectedMetric];
  const currentMetric = metricsData[selectedMetric];

  const currentRangeLabel = dateOptions.find(opt => opt.value === dateRange)?.label || 'Last 30 days';
  const currentCompareLabel = compareOptions.find(opt => opt.value === compareType)?.label || 'None';
  const isComparing = compareType !== 'none';

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <ul style={{ display: 'flex', justifyContent: 'center', listStyle: 'none', padding: 0, margin: '0 0 10px 0' }}>
        {payload.map((entry, index) => (
          <li key={`item-${index}`} style={{ marginRight: 20, color: '#0D0D0D', display: 'flex', alignItems: 'center', fontSize: 14 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: entry.color, marginRight: 6, borderRadius: 2 }}></span>
            {entry.value}
          </li>
        ))}
      </ul>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #D1D1D1",
        borderRadius: "6px",
        padding: "12px",
        fontSize: "0.875rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#111827" }}>
          {selectedMetric}
        </p>

        {payload.map((p, idx) => {
          const isCurrent = p.name === "Current";
          const displayDate = isCurrent ? label : data.datePrev;
          const rawValue = p.value;
          const formattedValue = (selectedMetric.includes('revenue') || selectedMetric.includes('value'))
            ? `$${Number(rawValue).toFixed(2)}`
            : Math.round(rawValue);

          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: idx !== payload.length - 1 ? '4px' : '0',
              minWidth: '180px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  backgroundColor: p.color, marginRight: 8, borderRadius: 2
                }}></span>
                <span>{displayDate}</span>
              </div>
              <span style={{ fontWeight: 500, color: '#111827', marginLeft: '12px' }}>
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    const prevColor = '#D1D1D1';
    const mainColor = '#047857';

    const previousProps = {
      name: currentCompareLabel,
      dataKey: previousKey,
      stroke: prevColor,
      fill: prevColor,
    };

    switch (selectedChart) {
      case 'Bar chart':
        return (
          <BarChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip cursor={{ fill: "#F5F5F5" }} content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Bar dataKey={currentKey} fill={mainColor} radius={[4, 4, 0, 0]} name="Current" />
            {isComparing && <Bar {...previousProps} radius={[4, 4, 0, 0]} />}
          </BarChart>
        );
      case 'Area chart':
        return (
          <AreaChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip cursor={{ fill: "#F5F5F5" }} content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Area dataKey={currentKey} stroke={mainColor} fill="#10b98133" name="Current" />
            {isComparing && <Area {...previousProps} fill="#D1D1D188" />}
          </AreaChart>
        );
      case 'Line chart':
        return (
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip cursor={{ fill: "#F5F5F5" }} content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Line dataKey={currentKey} stroke={mainColor} strokeWidth={3} name="Current" dot={false} />
            {isComparing && <Line {...previousProps} strokeWidth={3} dot={false} />}
          </LineChart>
        );
      default:
        return null;
    }
  };

  const formatValue = (metric, value) => {
    if (metric === 'Total revenue' || metric === 'Average order value') {
      return `$${Number(value).toFixed(2)}`;
    }
    return Math.round(value).toString();
  };

  if (loading) return <div className="sales-main">Loading sales insights...</div>;
  if (error) return <div className="sales-main"><p className="error-message">{error}</p></div>;

  return (
    <main className="sales-main">

      {/* 1. Header Title */}
      <div className="sales-header" style={{ marginBottom: '0' }}>
        <h1 style={{ marginBottom: '10px' }}>Sales insights</h1>
      </div>

      {/* 2. Divider */}
      <hr style={{ border: 'none', height: '1px', backgroundColor: '#e0e0e0', margin: '0 0 25px 0' }} />

      {/* 3. Actions Row */}
      <div className="sales-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>

        {/* LEFT: Date & Compare */}
        <div style={{ display: 'flex', gap: '10px' }}>

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompareDropdown(false); }}>
              {/* INLINE STYLES FORCED HERE to ensure Green Color */}
              <span style={{ color: '#6b7280' }}>Date range: </span>
              <span style={{ color: '#047857', fontWeight: 500 }}>{currentRangeLabel}</span>
              <FiChevronDown />
            </button>

            {showDateDropdown && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                {dateOptions.map((option) => (
                  <div key={option.value}
                    onClick={() => {
                      setDateRange(option.value);
                      setShowDateDropdown(false);
                      setCompareType('none');
                    }}
                    className="dropdown-item"
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: dateRange === option.value ? '#f3f4f6' : 'white' }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compare Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => { setShowCompareDropdown(!showCompareDropdown); setShowDateDropdown(false); }}>
              {/* INLINE STYLES FORCED HERE to ensure Green Color */}
              <span style={{ color: '#6b7280' }}>Compare: </span>
              <span style={{ color: '#047857', fontWeight: 500 }}>{currentCompareLabel}</span>
              <FiChevronDown />
            </button>

            {showCompareDropdown && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                {compareOptions.map((option) => (
                  <div key={option.value}
                    onClick={() => {
                      setCompareType(option.value);
                      setShowCompareDropdown(false);
                    }}
                    className="dropdown-item"
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: compareType === option.value ? '#f3f4f6' : 'white' }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Export Button */}
        <button className="icon-btn" onClick={handleExport}>
          <FiDownload /> Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="sales-kpis">
        {metrics.map((metric, idx) => {
          const metricData = metricsData[metric];
          const displayValue = formatValue(metric, metricData.value);
          const trendClass = metricData.isPositive ? 'positive' : 'negative';
          const trendSymbol = metricData.isPositive ? '↑' : '↓';

          return (
            <div key={idx} className="kpi-card" onClick={() => setSelectedMetric(metric)}>
              <span>{metric}</span>
              <h2 className="kpi-number">{displayValue}</h2>
              <span className={`kpi-trend ${trendClass}`}>{trendSymbol} {Math.abs(metricData.change).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      {/* Chart + Controls */}
      <div className="sales-content">
        <div className="sales-chart-card">
          <div className="chart-title">
            <h3>{selectedMetric}</h3>
            <strong className="metric-value">{formatValue(selectedMetric, currentMetric.value)}</strong>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sales-controls">
          <div className="control-box">
            <h4>Metrics</h4>
            <ul>
              {metrics.map((m, idx) => (
                <li key={idx} className={selectedMetric === m ? 'active' : ''} onClick={() => setSelectedMetric(m)}>
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <div className="control-box">
            <h4>Visualisation</h4>
            <ul>
              {chartTypes.map((c, idx) => (
                <li key={idx} className={selectedChart === c ? 'active' : ''} onClick={() => setSelectedChart(c)}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="sales-table-card">
        <div className="table-header">
          <h3>Breakdown</h3>
          {/* REMOVED FILTER BUTTON HERE */}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total revenue</th>
              <th>Total orders</th>
              <th>Total crops sold</th>
              <th>Average order value</th>
            </tr>
          </thead>
          <tbody>
            {chartData.length > 0 ? (
              chartData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{formatValue('Total revenue', row.revenue)}</td>
                  <td>{row.orders}</td>
                  <td>{row.crops}</td>
                  <td>{formatValue('Average order value', row.avgOrder)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default SalesInsights;