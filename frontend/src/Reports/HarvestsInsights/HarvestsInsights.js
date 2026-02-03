import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
// Removed FiFilter from imports
import { FiChevronDown, FiDownload } from 'react-icons/fi';
import './HarvestsInsights.css';
import { API_URL } from '../../apiConfig';

const metrics = ['Total harvests', 'Unique crops harvested', 'Average time to harvest', 'Harvest frequency'];
const chartTypes = ['Bar chart', 'Area chart', 'Line chart'];

const metricKeyMap = {
  'Total harvests': { current: 'harvests', previous: 'harvestsPrev' },
  'Unique crops harvested': { current: 'uniqueCrops', previous: 'uniqueCropsPrev' },
  'Average time to harvest': { current: 'avgDaysToHarvest', previous: 'avgDaysToHarvestPrev' },
  'Harvest frequency': { current: 'harvestFrequency', previous: 'harvestFrequencyPrev' }
};

const dateOptions = [
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Last 90 days', value: 'last_90_days' },
];

const HarvestsInsights = () => {
  const [selectedMetric, setSelectedMetric] = useState('Total harvests');
  const [selectedChart, setSelectedChart] = useState('Bar chart');

  const [dateRange, setDateRange] = useState('last_30_days');
  const [compareType, setCompareType] = useState('none');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);

  const [chartData, setChartData] = useState([]);
  const [metricsData, setMetricsData] = useState({
    'Total harvests': { value: 0, change: 0, isPositive: true },
    'Unique crops harvested': { value: 0, change: 0, isPositive: true },
    'Average time to harvest': { value: 0, change: 0, isPositive: true },
    'Harvest frequency': { value: 0, change: 0, isPositive: true }
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

  // --- MAIN DATA FETCHING AND PROCESSING ---
  useEffect(() => {
    const fetchAndProcessData = async () => {
      const token = localStorage.getItem('token');
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/api/crops`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const cropsList = json.crops || [];

        // 1. Determine Date Boundaries
        const durationDays = dateRange === 'last_7_days' ? 7 : dateRange === 'last_90_days' ? 90 : 30;

        // Current Period
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        const currentEndDate = new Date(now);
        const currentStartDate = new Date(now);
        currentStartDate.setDate(currentEndDate.getDate() - (durationDays - 1));
        currentStartDate.setHours(0, 0, 0, 0);

        // --- UPDATED LOGIC START ---
        // Always calculate a previous period for the metrics, 
        // even if comparison is 'none'.

        let offsetDays = durationDays; // Default: Compare vs Previous Period implicitly

        // If user explicitly chose a different comparison, use that instead
        if (compareType === 'previous_week') {
          offsetDays = 7;
        } else if (compareType === 'previous_month') {
          offsetDays = 30;
        } else if (compareType === 'previous_year') {
          offsetDays = 365;
        }

        // Previous Period Calculation
        const prevEndDate = new Date(currentEndDate);
        prevEndDate.setDate(prevEndDate.getDate() - offsetDays);

        const prevStartDate = new Date(currentStartDate);
        prevStartDate.setDate(prevStartDate.getDate() - offsetDays);
        // --- UPDATED LOGIC END ---

        const processWindow = (start, end, allCrops) => {
          const filtered = allCrops.filter(crop => {
            const hDate = new Date(crop.harvest_date);
            return hDate >= start && hDate <= end && crop.harvest_date;
          });

          const totalHarvests = filtered.length;
          const uniqueCropsSet = new Set();
          let daysToHarvestSum = 0;
          let daysToHarvestCount = 0;
          const dailyMap = {};

          filtered.forEach(crop => {
            uniqueCropsSet.add(crop.name);
            if (crop.seeding_date && crop.harvest_date) {
              const seedDate = new Date(crop.seeding_date);
              const harvestDate = new Date(crop.harvest_date);
              const diff = Math.floor((harvestDate - seedDate) / (1000 * 60 * 60 * 24));
              if (diff >= 0) {
                daysToHarvestSum += diff;
                daysToHarvestCount += 1;
              }
            }

            const dateKey = new Date(crop.harvest_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            if (!dailyMap[dateKey]) {
              dailyMap[dateKey] = {
                harvests: 0, uniqueSet: new Set(), daysSum: 0, daysCount: 0
              };
            }
            dailyMap[dateKey].harvests += 1;
            dailyMap[dateKey].uniqueSet.add(crop.name);

            if (crop.seeding_date && crop.harvest_date) {
              const seedDate = new Date(crop.seeding_date);
              const harvestDate = new Date(crop.harvest_date);
              const diff = Math.floor((harvestDate - seedDate) / (1000 * 60 * 60 * 24));
              if (diff >= 0) {
                dailyMap[dateKey].daysSum += diff;
                dailyMap[dateKey].daysCount += 1;
              }
            }
          });

          const avgDays = daysToHarvestCount > 0 ? daysToHarvestSum / daysToHarvestCount : 0;
          const weeks = durationDays / 7;
          const freq = weeks > 0 ? totalHarvests / weeks : 0;

          return {
            metrics: {
              harvests: totalHarvests,
              uniqueCrops: uniqueCropsSet.size,
              avgDays: avgDays,
              frequency: freq
            },
            dailyMap
          };
        };

        // 2. Process Data (Always process both now)
        const currentData = processWindow(currentStartDate, currentEndDate, cropsList);
        const prevData = processWindow(prevStartDate, prevEndDate, cropsList);

        // 3. Generate Chart Data
        const finalChartData = [];
        const dateIterator = new Date(currentStartDate);

        while (dateIterator <= currentEndDate) {
          const dateStr = dateIterator.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          const prevDateIter = new Date(dateIterator);
          prevDateIter.setDate(prevDateIter.getDate() - offsetDays);
          const prevDateStr = prevDateIter.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          const currDayStats = currentData.dailyMap[dateStr] || { harvests: 0, uniqueSet: new Set(), daysSum: 0, daysCount: 0 };
          const prevDayStats = prevData.dailyMap[prevDateStr] || { harvests: 0, uniqueSet: new Set(), daysSum: 0, daysCount: 0 };

          const getCumulativeHarvests = (map, start, end) => {
            let sum = 0;
            const iter = new Date(start);
            while (iter <= end) {
              const k = iter.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              if (map[k]) sum += map[k].harvests;
              iter.setDate(iter.getDate() + 1);
            }
            return sum;
          };

          const daysSinceStart = Math.max(1, (dateIterator - currentStartDate) / (1000 * 60 * 60 * 24) + 1);
          const weeksPassed = daysSinceStart / 7;
          const currCumHarvests = getCumulativeHarvests(currentData.dailyMap, currentStartDate, dateIterator);
          const prevCumHarvests = getCumulativeHarvests(prevData.dailyMap, prevStartDate, prevDateIter);

          // Important: We populate prev data here for metrics, but we hide it in the chart later if isComparing is false
          finalChartData.push({
            date: dateStr,
            datePrev: prevDateStr,

            harvests: currDayStats.harvests,
            uniqueCrops: currDayStats.uniqueSet.size,
            avgDaysToHarvest: currDayStats.daysCount > 0 ? currDayStats.daysSum / currDayStats.daysCount : 0,
            harvestFrequency: weeksPassed > 0 ? currCumHarvests / weeksPassed : 0,

            harvestsPrev: prevDayStats.harvests,
            uniqueCropsPrev: prevDayStats.uniqueSet.size,
            avgDaysToHarvestPrev: prevDayStats.daysCount > 0 ? prevDayStats.daysSum / prevDayStats.daysCount : 0,
            harvestFrequencyPrev: weeksPassed > 0 ? prevCumHarvests / weeksPassed : 0,
          });

          dateIterator.setDate(dateIterator.getDate() + 1);
        }

        setChartData(finalChartData);

        // 4. Set Metrics Data with "Always On" Change Calculation
        const calcChange = (curr, prev) => {
          // Case 1: Previous was 0, but we have data now -> 100% Growth
          if (prev === 0 && curr > 0) return 100;
          // Case 2: Both 0 -> No change
          if (prev === 0) return 0;
          // Case 3: Standard calc
          return ((curr - prev) / prev) * 100;
        };

        const cm = currentData.metrics;
        const pm = prevData.metrics;

        setMetricsData({
          'Total harvests': {
            value: cm.harvests,
            change: calcChange(cm.harvests, pm.harvests),
            isPositive: (cm.harvests - pm.harvests) >= 0
          },
          'Unique crops harvested': {
            value: cm.uniqueCrops,
            change: calcChange(cm.uniqueCrops, pm.uniqueCrops),
            isPositive: (cm.uniqueCrops - pm.uniqueCrops) >= 0
          },
          'Average time to harvest': {
            value: cm.avgDays,
            change: calcChange(cm.avgDays, pm.avgDays),
            isPositive: (cm.avgDays - pm.avgDays) <= 0
          },
          'Harvest frequency': {
            value: cm.frequency,
            change: calcChange(cm.frequency, pm.frequency),
            isPositive: (cm.frequency - pm.frequency) >= 0
          }
        });

      } catch (err) {
        console.error('Failed to fetch harvest data', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, [dateRange, compareType]);

  const handleExport = () => {
    if (!chartData || chartData.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Date", "Total Harvests", "Unique Crops Harvested", "Average Time to Harvest (days)", "Avg Days Between Harvests"];
    const csvRows = [
      headers.join(','),
      ...chartData.map(row => {
        const daysBetween = row.harvestFrequency > 0 ? (7 / row.harvestFrequency).toFixed(1) : 'N/A';
        return [
          `"${row.date}"`,
          row.harvests,
          row.uniqueCrops,
          row.avgDaysToHarvest.toFixed(1),
          daysBetween
        ].join(',');
      })
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `harvest_insights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { current: currentKey, previous: previousKey } = metricKeyMap[selectedMetric];
  const currentMetric = metricsData[selectedMetric];

  const currentRangeLabel = dateOptions.find(opt => opt.value === dateRange)?.label || 'Last 30 days';
  const currentCompareLabel = compareOptions.find(opt => opt.value === compareType)?.label || 'None';

  // Only show the comparison visual on the CHART if explicitly requested
  const isComparing = compareType !== 'none';

  const formatValue = (metric, value) => {
    if (metric === 'Average time to harvest') {
      return `${Number(value).toFixed(1)} days`;
    } else if (metric === 'Harvest frequency') {
      if (value <= 0) return 'No harvests';
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
          let formattedValue;

          if (selectedMetric === 'Average time to harvest') {
            formattedValue = `${Number(rawValue).toFixed(1)} days`;
          } else if (selectedMetric === 'Harvest frequency') {
            if (rawValue <= 0) formattedValue = 'N/A';
            else formattedValue = `Every ${Math.round(7 / rawValue)} days`;
          } else {
            formattedValue = Math.round(rawValue);
          }

          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '180px',
              marginBottom: idx !== payload.length - 1 ? '4px' : '0'
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

  if (loading) return <div className="harvests-main">Loading harvest insights...</div>;
  if (error) return <div className="harvests-main"><p className="error-message">{error}</p></div>;

  return (
    <main className="harvests-main">

      {/* 1. Header Title */}
      <div className="harvests-header" style={{ marginBottom: '0' }}>
        <h1 style={{ marginBottom: '10px' }}>Harvests insights</h1>
      </div>

      {/* 2. Divider */}
      <hr style={{ border: 'none', height: '1px', backgroundColor: '#e0e0e0', margin: '0 0 25px 0' }} />

      {/* 3. Actions Row */}
      <div className="harvests-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>

        {/* LEFT: Date & Compare */}
        <div style={{ display: 'flex', gap: '10px' }}>

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompareDropdown(false); }}>
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
      <div className="harvests-kpis">
        {metrics.map((metric, idx) => {
          const metricData = metricsData[metric];
          const displayValue = formatValue(metric, metricData.value);

          // Neutral State Logic
          const isNeutral = Math.abs(metricData.change) === 0;
          const trendClass = isNeutral ? 'neutral' : (metricData.isPositive ? 'positive' : 'negative');
          const trendSymbol = isNeutral ? '—' : (metricData.isPositive ? '↑' : '↓');
          const trendStyle = isNeutral ? { color: '#9CA3AF' } : {};

          return (
            <div key={idx} className="kpi-card" onClick={() => setSelectedMetric(metric)}>
              <span>{metric}</span>
              <h2 className="kpi-number">{displayValue}</h2>
              <span className={`kpi-trend ${trendClass}`} style={trendStyle}>
                {trendSymbol} {Math.abs(metricData.change).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart + Controls */}
      <div className="harvests-content">
        <div className="harvests-chart-card">
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

        <div className="harvests-controls">
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
      <div className="harvests-table-card">
        <div className="table-header">
          <h3>Breakdown</h3>
          {/* REMOVED FILTER BUTTON */}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total harvests</th>
              <th>Unique crops harvested</th>
              <th>Average time to harvest</th>
              <th>Harvest frequency</th>
            </tr>
          </thead>
          <tbody>
            {chartData.length > 0 ? (
              chartData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{row.harvests}</td>
                  <td>{row.uniqueCrops}</td>
                  <td>{formatValue('Average time to harvest', row.avgDaysToHarvest)}</td>
                  <td>{formatValue('Harvest frequency', row.harvestFrequency)}</td>
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

export default HarvestsInsights;