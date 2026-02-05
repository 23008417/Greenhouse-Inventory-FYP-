// plantinginisghts.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { FiChevronDown, FiDownload } from 'react-icons/fi';
import './PlantingInsights.css';
import { API_URL } from '../../apiConfig';

const metrics = ['Total Plantings', 'Crop Varieties', 'Avg. Days to Maturity', 'Planting Interval'];
const chartTypes = ['Bar chart', 'Area chart', 'Line chart'];

const metricKeyMap = {
  'Total Plantings': { current: 'plantings', previous: 'plantingsPrev' },
  'Crop Varieties': { current: 'varieties', previous: 'varietiesPrev' },
  'Avg. Days to Maturity': { current: 'avgMaturityDays', previous: 'avgMaturityDaysPrev' },
  'Planting Interval': { current: 'plantingInterval', previous: 'plantingIntervalPrev' }
};

const dateOptions = [
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Last 90 days', value: 'last_90_days' },
  { label: 'All time', value: 'all_time' },
  { label: 'Custom range', value: 'custom' }
];

const PlantingInsights = () => {
  const [selectedMetric, setSelectedMetric] = useState('Total Plantings');
  const [selectedChart, setSelectedChart] = useState('Bar chart');

  const [dateRange, setDateRange] = useState('last_30_days');
  const [compareType, setCompareType] = useState('none');

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const [customCompareStartDate, setCustomCompareStartDate] = useState('');
  const [customCompareEndDate, setCustomCompareEndDate] = useState('');
  const [showCustomCompareDatePicker, setShowCustomCompareDatePicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  const [chartData, setChartData] = useState([]);
  const [metricsData, setMetricsData] = useState({
    'Total Plantings': { value: 0, change: 0, isPositive: true },
    'Crop Varieties': { value: 0, change: 0, isPositive: true },
    'Avg. Days to Maturity': { value: 0, change: 0, isPositive: true },
    'Planting Interval': { value: 0, change: 0, isPositive: true }
  });

  const compareOptions = useMemo(() => {
    const noneOption = { label: 'None', value: 'none' };

    if (dateRange === 'all_time') return [noneOption];

    if (dateRange === 'custom') {
      return [
        noneOption,
        { label: 'Previous period', value: 'previous_period' },
        { label: 'Previous year', value: 'previous_year' },
        { label: 'Custom range', value: 'custom_compare' }
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

    return [
      noneOption,
      { label: 'Previous week', value: 'previous_week' },
      { label: 'Previous month', value: 'previous_month' },
      { label: 'Previous year', value: 'previous_year' }
    ];
  }, [dateRange]);

  useEffect(() => {
    const isValid = compareOptions.find(c => c.value === compareType);
    if (!isValid && compareType !== 'custom_compare') setCompareType('none');
  }, [dateRange, compareOptions, compareType]);

  // --- MAIN DATA FETCHING ---
  useEffect(() => {
    const fetchAndProcessData = async () => {
      const token = localStorage.getItem('token');
      setLoading(true);

      try {
        // UPDATED: Endpoint is now /api/planting/insights
        let url = `${API_URL}/api/planting/insights?range=${dateRange}&compare=${compareType}`;

        if (dateRange === 'custom' && customStartDate && customEndDate) {
          url += `&start_date=${customStartDate}&end_date=${customEndDate}`;
        }

        if (compareType === 'custom_compare' && customCompareStartDate && customCompareEndDate) {
          url += `&compare_start_date=${customCompareStartDate}&compare_end_date=${customCompareEndDate}`;
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.success) {
          setChartData(json.chartData);
          setMetricsData({
            'Total Plantings': json.metrics.total_plantings,
            'Crop Varieties': json.metrics.crop_varieties,
            'Avg. Days to Maturity': json.metrics.avg_maturity_days,
            'Planting Interval': json.metrics.planting_interval
          });
        } else {
          setError('Failed to load data structure');
        }

      } catch (err) {
        console.error('Failed to fetch planting data', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    let shouldFetch = true;
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) shouldFetch = false;
    if (compareType === 'custom_compare' && (!customCompareStartDate || !customCompareEndDate)) shouldFetch = false;

    if (shouldFetch) {
      fetchAndProcessData();
    }
  }, [dateRange, compareType, customStartDate, customEndDate, customCompareStartDate, customCompareEndDate]);

  // --- HANDLERS ---
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setShowDateDropdown(false);
    if (value === 'all_time') setCompareType('none');

    if (value === 'custom') {
      setShowCustomDatePicker(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      setCustomEndDate(end.toISOString().split('T')[0]);
      setCustomStartDate(start.toISOString().split('T')[0]);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const handleCompareChange = (value) => {
    setCompareType(value);
    setShowCompareDropdown(false);

    if (value === 'custom_compare') {
      setShowCustomCompareDatePicker(true);
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const duration = end - start;

        const compEnd = new Date(start);
        compEnd.setDate(compEnd.getDate() - 1);
        const compStart = new Date(compEnd.getTime() - duration);

        setCustomCompareEndDate(compEnd.toISOString().split('T')[0]);
        setCustomCompareStartDate(compStart.toISOString().split('T')[0]);
      }
    } else {
      setShowCustomCompareDatePicker(false);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) { alert('Please select both start and end dates'); return; }
    if (new Date(customStartDate) > new Date(customEndDate)) { alert('Start date must be before end date'); return; }
    setShowCustomDatePicker(false);
  };

  const handleApplyCustomCompareDates = () => {
    if (!customCompareStartDate || !customCompareEndDate) { alert('Please select comparison start and end dates'); return; }
    if (new Date(customCompareStartDate) > new Date(customCompareEndDate)) { alert('Comparison start date must be before end date'); return; }
    setShowCustomCompareDatePicker(false);
  };

  const handleExport = () => {
    if (!chartData || chartData.length === 0) { alert("No data available to export."); return; }
    const headers = ["Date", "Total Plantings", "Crop Varieties", "Avg Days to Maturity", "Avg Days Between Planting"];
    const csvRows = [
      headers.join(','),
      ...chartData.map(row => {
        const daysBetween = row.plantingInterval > 0 ? (7 / row.plantingInterval).toFixed(1) : 'N/A';
        return [
          `"${row.date}"`, row.plantings, row.varieties, row.avgMaturityDays.toFixed(1), daysBetween
        ].join(',');
      })
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `planting_insights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { current: currentKey, previous: previousKey } = metricKeyMap[selectedMetric];
  const currentMetric = metricsData[selectedMetric];

  let currentRangeLabel = dateOptions.find(opt => opt.value === dateRange)?.label || 'Last 30 days';
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (dateRange === 'custom' && customStartDate && customEndDate) {
    currentRangeLabel = `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
  }

  let currentCompareLabel = compareOptions.find(opt => opt.value === compareType)?.label || 'None';
  if (compareType === 'custom_compare' && customCompareStartDate && customCompareEndDate) {
    currentCompareLabel = `${formatDate(customCompareStartDate)} - ${formatDate(customCompareEndDate)}`;
  }

  const isComparing = compareType !== 'none';
  const showCompareButton = dateRange !== 'all_time';

  const formatValue = (metric, value) => {
    if (metric === 'Avg. Days to Maturity') return `${Number(value).toFixed(1)} days`;
    else if (metric === 'Planting Interval') {
      if (value <= 0) return 'No plantings';
      const daysBetween = 7 / value;
      return `Every ${Math.round(daysBetween)} days`;
    }
    return Math.round(value).toString();
  };

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
      <div style={{ backgroundColor: "#fff", border: "1px solid #D1D1D1", borderRadius: "6px", padding: "12px", fontSize: "0.875rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#111827" }}>{selectedMetric}</p>
        {payload.map((p, idx) => {
          const isCurrent = p.name === "Current";
          const displayDate = isCurrent ? label : data.datePrev;
          const rawValue = p.value;
          let formattedValue;

          if (selectedMetric === 'Avg. Days to Maturity') formattedValue = `${Number(rawValue).toFixed(1)} days`;
          else if (selectedMetric === 'Planting Interval') formattedValue = rawValue <= 0 ? 'N/A' : `Every ${Math.round(7 / rawValue)} days`;
          else formattedValue = Math.round(rawValue);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '180px', marginBottom: idx !== payload.length - 1 ? '4px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: p.color, marginRight: 8, borderRadius: 2 }}></span>
                <span>{displayDate}</span>
              </div>
              <span style={{ fontWeight: 500, color: '#111827', marginLeft: '12px' }}>{formattedValue}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    const prevColor = '#D1D1D1';
    const mainColor = '#047857';
    const previousProps = { name: isComparing ? 'Previous' : '', dataKey: previousKey, stroke: prevColor, fill: prevColor };

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
      default: return null;
    }
  };

  if (loading) return <div className="planting-main">Loading planting insights...</div>;
  if (error) return <div className="planting-main"><p className="error-message">{error}</p></div>;

  return (
    <main className="planting-main">
      <div className="planting-header" style={{ marginBottom: '0' }}>
        <h1 style={{ marginBottom: '10px' }}>Planting Insights</h1>
      </div>
      <hr style={{ border: 'none', height: '1px', backgroundColor: '#e0e0e0', margin: '0 0 25px 0' }} />

      <div className="planting-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

          {/* 1. Main Date Range Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompareDropdown(false); }}>
              <span style={{ color: '#6b7280' }}>Date range: </span>
              <span style={{ color: '#047857', fontWeight: 500 }}>{currentRangeLabel}</span>
              <FiChevronDown />
            </button>
            {showDateDropdown && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                {dateOptions.map((option) => (
                  <div key={option.value} onClick={() => handleDateRangeChange(option.value)} className="dropdown-item" style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: dateRange === option.value ? '#f3f4f6' : 'white' }}>
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Main Date Picker Modal */}
          {showCustomDatePicker && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '400px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Select Date Range</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Start Date</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #D1D1D1', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>End Date</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #D1D1D1', borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowCustomDatePicker(false); setDateRange('last_30_days'); }} style={{ padding: '8px 16px', border: '1px solid #D1D1D1', borderRadius: '6px', backgroundColor: 'white' }}>Cancel</button>
                  <button onClick={handleApplyCustomDates} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#047857', color: 'white' }}>Apply</button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Compare Dropdown */}
          {showCompareButton && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={() => { setShowCompareDropdown(!showCompareDropdown); setShowDateDropdown(false); }}
              >
                <span style={{ color: '#6b7280' }}>Compare: </span>
                <span style={{ color: '#047857', fontWeight: 500 }}>{currentCompareLabel}</span>
                <FiChevronDown />
              </button>

              {showCompareDropdown && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                  {compareOptions.map((option) => (
                    <div key={option.value} onClick={() => handleCompareChange(option.value)} className="dropdown-item" style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: compareType === option.value ? '#f3f4f6' : 'white' }}>
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Comparison Date Picker */}
          {showCustomCompareDatePicker && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '400px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Select Comparison Range</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Compare Start Date</label>
                  <input type="date" value={customCompareStartDate} onChange={(e) => setCustomCompareStartDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #D1D1D1', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Compare End Date</label>
                  <input type="date" value={customCompareEndDate} onChange={(e) => setCustomCompareEndDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #D1D1D1', borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowCustomCompareDatePicker(false); setCompareType('none'); }} style={{ padding: '8px 16px', border: '1px solid #D1D1D1', borderRadius: '6px', backgroundColor: 'white' }}>Cancel</button>
                  <button onClick={handleApplyCustomCompareDates} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#047857', color: 'white' }}>Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={handleExport}>
          <FiDownload /> Export
        </button>
      </div>

      <div className="planting-kpis">
        {metrics.map((metric, idx) => {
          const metricData = metricsData[metric];
          const displayValue = formatValue(metric, metricData.value);
          const isNeutral = Math.abs(metricData.change) === 0;
          const trendClass = isNeutral ? 'neutral' : (metricData.isPositive ? 'positive' : 'negative');
          const trendSymbol = isNeutral ? '—' : (metricData.isPositive ? '↑' : '↓');
          return (
            <div key={idx} className="kpi-card" onClick={() => setSelectedMetric(metric)}>
              <span>{metric}</span>
              <h2 className="kpi-number">{displayValue}</h2>
              <span className={`kpi-trend ${trendClass}`} style={isNeutral ? { color: '#9CA3AF' } : {}}>{trendSymbol} {Math.abs(metricData.change).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <div className="planting-content">
        <div className="planting-chart-card">
          <div className="chart-title"><h3>{selectedMetric}</h3><strong className="metric-value">{formatValue(selectedMetric, currentMetric.value)}</strong></div>
          <div className="chart-wrapper"><ResponsiveContainer width="100%" height={280}>{renderChart()}</ResponsiveContainer></div>
        </div>
        <div className="planting-controls">
          <div className="control-box"><h4>Metrics</h4><ul>{metrics.map((m, idx) => (<li key={idx} className={selectedMetric === m ? 'active' : ''} onClick={() => setSelectedMetric(m)}>{m}</li>))}</ul></div>
          <div className="control-box"><h4>Visualisation</h4><ul>{chartTypes.map((c, idx) => (<li key={idx} className={selectedChart === c ? 'active' : ''} onClick={() => setSelectedChart(c)}>{c}</li>))}</ul></div>
        </div>
      </div>

      <div className="planting-table-card">
        <div className="table-header"><h3>Breakdown</h3></div>
        <table>
          <thead><tr><th>Date</th><th>Total Plantings</th><th>Crop Varieties</th><th>Avg. Days to Maturity</th><th>Planting Interval</th></tr></thead>
          <tbody>
            {chartData.length > 0 ? (
              chartData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{row.plantings}</td>
                  <td>{row.varieties}</td>
                  <td>{row.avgMaturityDays.toFixed(1)} days</td>
                  <td>{formatValue('Planting Interval', row.plantingInterval)}</td>
                </tr>
              ))
            ) : (<tr><td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>No data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default PlantingInsights;