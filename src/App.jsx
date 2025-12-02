import { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')
  const [viewMode, setViewMode] = useState('graphs') // 'graphs' or 'table'

  useEffect(() => {
    const fetchCrimeData = async () => {
      try {
        setLoading(true)
        setError(null)
        setProgress('Fetching aggregated crime data from 2020...')

        // Optimized: Fetch sample data for table view (limited to 1000 for performance)
        // For charts, we'll process a sample that's representative
        const sampleLimit = 50000 // Sample size for analysis
        const tableLimit = 1000 // Limit for table view
        
        const baseUrl = 'https://data.lacity.org/resource/2nrs-mtv8.json'
        const whereClause = "date_rptd >= '2020-01-01'"
        
        // Fetch sample data for chart analysis
        const sampleUrl = `${baseUrl}?$limit=${sampleLimit}&$where=${whereClause}&$order=date_rptd DESC`
        
        setProgress('Loading data sample...')
        const sampleResponse = await fetch(sampleUrl)
        
        if (!sampleResponse.ok) {
          throw new Error(`Failed to fetch data: ${sampleResponse.status} ${sampleResponse.statusText}`)
        }
        
        const sampleData = await sampleResponse.json()
        setProgress('Processing data...')
        
        // Store sample data for charts
        setData(sampleData)
        setProgress(`Loaded ${sampleData.length.toLocaleString()} records for analysis`)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching crime data:', err)
      } finally {
        setLoading(false)
        setTimeout(() => setProgress(''), 2000)
      }
    }

    fetchCrimeData()
  }, [])

  // Get column headers from first record
  const columns = data.length > 0 ? Object.keys(data[0]) : []

  // Process data for charts - optimized with early returns and efficient processing
  const chartData = useMemo(() => {
    if (data.length === 0) return { crimesByType: [], crimesByArea: [], crimesOverTime: [], totalCount: 0 }

    // Use Map for better performance with large datasets
    const typeCount = new Map()
    const areaCount = new Map()
    const timeCount = new Map()
    let processed = 0

    // Process in batches to avoid blocking
    for (const record of data) {
      // Crimes by type
      const type = record.crm_cd_desc || 'Unknown'
      typeCount.set(type, (typeCount.get(type) || 0) + 1)
      
      // Crimes by area
      const area = record.area_name || record.area || 'Unknown'
      areaCount.set(area, (areaCount.get(area) || 0) + 1)
      
      // Crimes over time
      if (record.date_rptd) {
        const date = new Date(record.date_rptd)
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          timeCount.set(monthKey, (timeCount.get(monthKey) || 0) + 1)
        }
      }
      processed++
    }

    // Convert Maps to arrays and sort
    const crimesByType = Array.from(typeCount.entries())
      .map(([name, value]) => ({ 
        name: name.length > 40 ? name.substring(0, 37) + '...' : name, 
        fullName: name,
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)

    const crimesByArea = Array.from(areaCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)

    const crimesOverTime = Array.from(timeCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { crimesByType, crimesByArea, crimesOverTime, totalCount: processed }
  }, [data])

  // Limit table data for performance
  const tableData = useMemo(() => {
    return data.slice(0, 1000) // Only show first 1000 records in table
  }, [data])

  // Colors for pie chart - dark mode friendly
  const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="App">
      <h1>Los Angeles Crime Data (2020 - Present)</h1>
      <p className="source-info">
        Data from: <a href="https://data.lacity.org/d/2nrs-mtv8" target="_blank" rel="noopener noreferrer">
          City of Los Angeles Open Data
        </a>
      </p>

      <div className="controls">
        <div className="view-toggle">
          <button 
            className={viewMode === 'graphs' ? 'active' : ''}
            onClick={() => setViewMode('graphs')}
          >
            📊 Graphs
          </button>
          <button 
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading all crime data from 2020...</p>
          {progress && <p className="progress-text">{progress}</p>}
        </div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <p>Note: This dataset may require CORS headers. You may need to use a proxy or backend API.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="data-container">
          {data.length > 0 ? (
            <>
              <p className="record-count">
                📊 Sample Analysis: <strong>{data.length.toLocaleString()}</strong> records analyzed from 2020 to present
                {viewMode === 'table' && <span className="table-note"> (Showing first 1,000 in table)</span>}
              </p>
              
              {viewMode === 'graphs' ? (
                <div className="charts-container">
                  <div className="chart-section">
                    <h2>Top 15 Crime Types</h2>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={chartData.crimesByType} layout="vertical" margin={{ left: 200, right: 20, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={190}
                          stroke="#94a3b8"
                          fontSize={11}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [value.toLocaleString(), 'Number of Crimes']}
                          contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.98)', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]}>
                          {chartData.crimesByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${210 + index * 8}, 70%, ${60 + index * 1.5}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-section">
                    <h2>Crimes Over Time (Monthly Trends)</h2>
                    <ResponsiveContainer width="100%" height={450}>
                      <LineChart data={chartData.crimesOverTime} margin={{ left: 20, right: 30, top: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          stroke="#94a3b8"
                          fontSize={11}
                          interval="preserveStartEnd"
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          fontSize={12}
                          tickFormatter={(value) => value.toLocaleString()}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <Tooltip 
                          formatter={(value) => value.toLocaleString()}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.98)', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#34d399" 
                          strokeWidth={3}
                          dot={{ fill: '#34d399', r: 3 }}
                          activeDot={{ r: 6, fill: '#10b981' }}
                          name="Number of Crimes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-section">
                    <h2>Top 15 Areas by Crime Count</h2>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={chartData.crimesByArea} layout="vertical" margin={{ left: 150, right: 20, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis 
                          type="number" 
                          stroke="#94a3b8"
                          fontSize={12}
                          tickFormatter={(value) => value.toLocaleString()}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={140}
                          stroke="#94a3b8"
                          fontSize={12}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <Tooltip 
                          formatter={(value) => value.toLocaleString()}
                          contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.98)', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} name="Number of Crimes">
                          {chartData.crimesByArea.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${40 + index * 4}, 80%, ${55 + index * 1.5}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-section">
                    <h2>Crime Distribution by Area</h2>
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie
                          data={chartData.crimesByArea}
                          cx="50%"
                          cy="50%"
                          labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          label={({ name, percent, value }) => 
                            `${name.length > 15 ? name.substring(0, 12) + '...' : name}: ${(percent * 100).toFixed(1)}%`
                          }
                          outerRadius={140}
                          fill="#8884d8"
                          dataKey="value"
                          fontSize={11}
                          style={{ fill: '#e2e8f0' }}
                        >
                          {chartData.crimesByArea.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${value.toLocaleString()} crimes (${(props.payload.percent * 100).toFixed(1)}%)`,
                            props.payload.name
                          ]}
                          contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.98)', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', color: '#e2e8f0' }}
                          formatter={(value, entry) => `${entry.payload.name}: ${entry.payload.value.toLocaleString()}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column}>{column.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((record, index) => (
                        <tr key={index}>
                          {columns.map((column) => (
                            <td key={column}>
                              {record[column] || 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p>No data available</p>
          )}
        </div>
      )}
    </div>
  )
}

export default App
