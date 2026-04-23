import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../../config'
import { extractError } from '../../utils/error'
import StatusBadge from '../UI/StatusBadge'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const emptyProductForm = {
  product_name: '',
  category: '',
  price: '',
  unit: '',
  stock_qty: '',
  image: null,
}

function VendorAnalytics({ vendorOrders }) {
  const [chartView, setChartView] = useState('sales') // 'sales' | 'products'
  const [dateRange, setDateRange] = useState(14) // 7 | 14 | 30
  const [barMetric, setBarMetric] = useState('qty') // 'qty' | 'revenue'
  const chartRef = useRef(null)

  // Helper: check if a date string falls within a date range
  const isInRange = (dateStr, startDate, endDate) => {
    const d = new Date(dateStr.split(' ')[0])
    return d >= startDate && d <= endDate
  }

  // Current period date boundaries
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(now.getDate() - (dateRange - 1))
  currentStart.setHours(0, 0, 0, 0)

  // Previous period (same length, immediately before current)
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevEnd.getDate() - (dateRange - 1))
  prevStart.setHours(0, 0, 0, 0)

  // Range-aware aggregation
  let rangeRevenue = 0, rangeOrders = 0, rangeItems = 0
  let prevRevenue = 0, prevOrders = 0, prevItems = 0

  vendorOrders.forEach(o => {
    const amt = parseFloat(o.total_amount) || 0
    const items = o.items.reduce((s, i) => s + (parseInt(i.quantity, 10) || 0), 0)
    if (isInRange(o.ordered_at, currentStart, now)) {
      rangeRevenue += amt; rangeOrders++; rangeItems += items
    }
    if (isInRange(o.ordered_at, prevStart, prevEnd)) {
      prevRevenue += amt; prevOrders++; prevItems += items
    }
  })

  const rangeAvg = rangeOrders ? rangeRevenue / rangeOrders : 0
  const prevAvg = prevOrders ? prevRevenue / prevOrders : 0

  // % change helper
  const pctChange = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : 0
    return ((cur - prev) / prev) * 100
  }

  const stats = [
    { label: 'Total Revenue', value: `₱${rangeRevenue.toFixed(2)}`, change: pctChange(rangeRevenue, prevRevenue), color: '#3b82f6' },
    { label: 'Total Orders', value: rangeOrders, change: pctChange(rangeOrders, prevOrders), color: '#8b5cf6' },
    { label: 'Items Sold', value: rangeItems, change: pctChange(rangeItems, prevItems), color: '#10b981' },
    { label: 'Avg Order Value', value: `₱${rangeAvg.toFixed(2)}`, change: pctChange(rangeAvg, prevAvg), color: '#f59e0b' },
  ]

  // Group sales by Date (format: YYYY-MM-DD)
  const salesByDate = {}
  vendorOrders.forEach(o => {
    const dStr = o.ordered_at ? o.ordered_at.split(' ')[0] : 'Unknown'
    if (!salesByDate[dStr]) salesByDate[dStr] = 0
    salesByDate[dStr] += parseFloat(o.total_amount) || 0
  })

  // Build a continuous calendar-day range ending today, filling gaps with ₱0
  const buildContinuousRange = (days) => {
    const dates = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toISOString().split('T')[0]) // YYYY-MM-DD
    }
    return dates
  }
  const sortedDates = buildContinuousRange(dateRange).map(d => {
    if (!salesByDate[d]) salesByDate[d] = 0
    return d
  })

  // Top Products
  const productTally = {}
  vendorOrders.forEach(o => {
    o.items.forEach(i => {
      const name = i.product_name
      if (!productTally[name]) productTally[name] = { qty: 0, rev: 0 }
      productTally[name].qty += parseFloat(i.quantity) || 0
      productTally[name].rev += parseFloat(i.subtotal) || 0
    })
  })
  const topProducts = Object.entries(productTally)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 8)

  // ── Gradient helper for the line chart fill ──
  const getGradient = (ctx, chartArea) => {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.28)')
    gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
    return gradient
  }

  // ── Chart Data: Sales Line Chart ──
  const salesLineData = {
    labels: sortedDates.map(d => {
      const parts = d.split('-')
      return `${parts[1]}-${parts[2]}`
    }),
    datasets: [
      {
        label: 'Revenue (₱)',
        data: sortedDates.map(d => salesByDate[d]),
        borderColor: '#3b82f6',
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart
          if (!chartArea) return 'rgba(59, 130, 246, 0.1)'
          return getGradient(ctx, chartArea)
        },
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: dateRange <= 14 ? 5 : 3,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
      },
    ],
  }

  // ── Crosshair vertical line plugin ──
  const crosshairPlugin = {
    id: 'crosshairLine',
    afterDraw: (chart) => {
      if (chart.tooltip?._active?.length) {
        const ctx = chart.ctx
        const activePoint = chart.tooltip._active[0]
        const x = activePoint.element.x
        const topY = chart.scales.y.top
        const bottomY = chart.scales.y.bottom

        ctx.save()
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.moveTo(x, topY)
        ctx.lineTo(x, bottomY)
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
        ctx.stroke()
        ctx.restore()
      }
    },
  }

  const salesLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `₱${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 12 }, maxRotation: dateRange > 14 ? 45 : 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
          callback: (v) => `₱${v.toLocaleString()}`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  }

  // ── Chart Data: Products Bar Chart ──
  const barColors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
  ]

  // Sort by the selected metric
  const sortedProducts = [...topProducts].sort((a, b) =>
    barMetric === 'qty' ? b[1].qty - a[1].qty : b[1].rev - a[1].rev
  )

  const productsBarData = {
    labels: sortedProducts.map(([name]) => name),
    datasets: [
      {
        label: barMetric === 'qty' ? 'Quantity Sold' : 'Revenue (₱)',
        data: sortedProducts.map(([, data]) => barMetric === 'qty' ? data.qty : data.rev),
        backgroundColor: sortedProducts.map((_, i) => barColors[i % barColors.length]),
        borderColor: sortedProducts.map((_, i) => barColors[i % barColors.length]),
        borderWidth: 0,
        borderRadius: 6,
        barPercentage: 0.7,
      },
    ],
  }

  // ── Bar value label plugin ──
  const barLabelPlugin = {
    id: 'barValueLabels',
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx
      chart.data.datasets.forEach((dataset, dsIndex) => {
        const meta = chart.getDatasetMeta(dsIndex)
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index]
          const formatted = barMetric === 'qty'
            ? value.toString()
            : `₱${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

          ctx.save()
          ctx.fillStyle = '#374151'
          ctx.font = 'bold 11px Inter, system-ui, sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          // Position label just after the bar end
          const x = bar.x + 6
          const y = bar.y
          ctx.fillText(formatted, x, y)
          ctx.restore()
        })
      })
    },
  }

  const productsBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    layout: {
      padding: { right: barMetric === 'revenue' ? 70 : 30 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const [, data] = sortedProducts[ctx.dataIndex]
            return barMetric === 'qty'
              ? `Qty: ${data.qty}`
              : `Revenue: ₱${data.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          },
          afterLabel: (ctx) => {
            const [, data] = sortedProducts[ctx.dataIndex]
            return barMetric === 'qty'
              ? `Revenue: ₱${data.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : `Qty Sold: ${data.qty}`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
          ...(barMetric === 'qty' ? { stepSize: 1 } : {
            callback: (v) => `₱${v.toLocaleString()}`,
          }),
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#374151',
          font: { size: 13, weight: '500' },
        },
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
  }

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Order ID,Date,Shopper,Delivery Status,Total Amount\n"
    
    vendorOrders.forEach(o => {
      const row = [o.order_id, o.ordered_at, o.shopper_name, o.delivery_status, o.total_amount]
      csvContent += row.join(",") + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "vendor_sales_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const chartToggleStyle = (active) => ({
    padding: '8px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: active ? '#3b82f6' : '#f1f5f9',
    color: active ? '#fff' : '#64748b',
  })

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111' }}>📊 System Report & Analytics</h3>
        <button onClick={handleExportCSV} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          📥 Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {stats.map((s, i) => {
          const isUp = s.change >= 0
          return (
            <div key={i} style={{ flex: '1 1 200px', background: '#f3f4f6', padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', marginTop: '8px' }}>{s.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: s.change === 0 ? '#9ca3af' : isUp ? '#059669' : '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  background: s.change === 0 ? '#f3f4f6' : isUp ? '#ecfdf5' : '#fef2f2',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}>
                  {s.change === 0 ? '—' : isUp ? '↑' : '↓'} {Math.abs(s.change).toFixed(1)}%
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>vs prev {dateRange}d</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart Section */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px' }}>
        {/* Chart Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setChartView('sales')}
              style={chartToggleStyle(chartView === 'sales')}
            >
              📈 Sales Chart
            </button>
            <button
              onClick={() => setChartView('products')}
              style={chartToggleStyle(chartView === 'products')}
            >
              📊 Top Products
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {chartView === 'sales' && (
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                {[7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDateRange(d)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: dateRange === d ? '#3b82f6' : 'transparent',
                      color: dateRange === d ? '#fff' : '#94a3b8',
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            )}
            {chartView === 'products' && (
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                {[{ key: 'qty', label: 'Qty Sold' }, { key: 'revenue', label: 'Revenue' }].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setBarMetric(m.key)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: barMetric === m.key ? '#8b5cf6' : 'transparent',
                      color: barMetric === m.key ? '#fff' : '#94a3b8',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {chartView === 'sales'
                ? `Revenue over last ${dateRange} days`
                : `Top ${sortedProducts.length} products by ${barMetric === 'qty' ? 'quantity sold' : 'revenue'}`}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div style={{ height: '320px', position: 'relative' }}>
          {chartView === 'sales' ? (
            sortedDates.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                <p>No sales data available yet.</p>
              </div>
            ) : (
              <Line data={salesLineData} options={salesLineOptions} plugins={[crosshairPlugin]} />
            )
          ) : (
            topProducts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                <p>No products sold yet.</p>
              </div>
            ) : (
              <Bar data={productsBarData} options={productsBarOptions} plugins={[barLabelPlugin]} />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function VendorDashboard({ currentUser, token, onLogout }) {
  const [vendorTab, setVendorTab] = useState('analytics')
  
  // Product State
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productError, setProductError] = useState('')
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState(emptyProductForm)

  // Sales State
  const [vendorOrders, setVendorOrders] = useState([])
  const [salesFilter, setSalesFilter] = useState('all') // 'all' | delivery_status values
  const [lowStockDismissed, setLowStockDismissed] = useState(false)

  // Banner Profile State
  const [bannerFile, setBannerFile] = useState(null)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [bannerSuccess, setBannerSuccess] = useState('')

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  const fetchProducts = async () => {
    if (!token) return
    setProductsLoading(true); setProductError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { headers: authHeaders })
      if (!res.ok) { setProductError(await extractError(res)); if (res.status === 401) onLogout(); return }
      const d = await res.json()
      setProducts(Array.isArray(d) ? d : d?.data ?? [])
    } catch { setProductError('Unable to load products.') }
    finally { setProductsLoading(false) }
  }

  const fetchVendorOrders = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/history`, { headers: authHeaders })
      if (!res.ok) return
      const d = await res.json()
      setVendorOrders(Array.isArray(d) ? d : [])
    } catch { /* silent */ }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault(); setIsSavingProduct(true); setProductError('')
    const isEdit = Boolean(editingProductId)
    const url = isEdit ? `${API_BASE_URL}/api/products/${editingProductId}` : `${API_BASE_URL}/api/products`

    const formData = new FormData()
    formData.append('product_name', productForm.product_name)
    formData.append('category', productForm.category)
    formData.append('price', Number(productForm.price))
    formData.append('unit', productForm.unit)
    formData.append('stock_qty', Number(productForm.stock_qty))
    if (productForm.image) {
      formData.append('image', productForm.image)
    }
    if (isEdit) {
      formData.append('_method', 'PUT')
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      })
      if (!res.ok) { setProductError(await extractError(res)); return }
      setProductForm(emptyProductForm); setEditingProductId(null);
      const fileInput = document.getElementById('productImageInput');
      if (fileInput) fileInput.value = '';
      await fetchProducts()
    } catch { setProductError('Unable to save product.') }
    finally { setIsSavingProduct(false) }
  }

  const startEditProduct = (p) => {
    setEditingProductId(p.id)
    setProductForm({ product_name: p.product_name ?? '', category: p.category ?? '', price: String(p.price ?? ''), unit: p.unit ?? '', stock_qty: String(p.stock_qty ?? ''), image: null })
    const fileInput = document.getElementById('productImageInput');
    if (fileInput) fileInput.value = '';
    setProductError('')
  }

  const cancelEdit = () => { 
    setEditingProductId(null); 
    setProductForm(emptyProductForm);
    const fileInput = document.getElementById('productImageInput');
    if (fileInput) fileInput.value = '';
  }

  const handleDeleteProduct = async (id) => {
    setProductError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE', headers: authHeaders })
      if (!res.ok) { setProductError(await extractError(res)); return }
      setProducts((prev) => prev.filter((p) => p.id !== id))
      if (editingProductId === id) cancelEdit()
    } catch { setProductError('Unable to delete product.') }
  }

  const handleBannerUpload = async (e) => {
    e.preventDefault()
    if (!bannerFile) return
    setIsUploadingBanner(true)
    setBannerError('')
    setBannerSuccess('')

    const formData = new FormData()
    formData.append('banner', bannerFile)

    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) { setBannerError(await extractError(res)); return }
      const data = await res.json()
      setBannerSuccess('Banner updated successfully!')
      localStorage.setItem('mercago_user', JSON.stringify(data.user))
      currentUser.banner_url = data.user.banner_url
    } catch {
      setBannerError('Unable to upload banner.')
    } finally {
      setIsUploadingBanner(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchProducts()
    fetchVendorOrders()
  }, [token])

  return (
    <section>
      <div className="dashboard-head">
        <div>
          <h2>Vendor Dashboard</h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
            {currentUser.first_name} {currentUser.last_name} &bull; <em>vendor</em>
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={vendorTab === 'analytics' ? 'tab active' : 'tab'} type="button" onClick={() => { setVendorTab('analytics'); fetchVendorOrders() }}>Analytics</button>
        <button className={vendorTab === 'products' ? 'tab active' : 'tab'} type="button" onClick={() => setVendorTab('products')}>My Products</button>
        <button className={vendorTab === 'sales' ? 'tab active' : 'tab'} type="button" onClick={() => { setVendorTab('sales'); fetchVendorOrders() }}>Sales History</button>
        <button className={vendorTab === 'profile' ? 'tab active' : 'tab'} type="button" onClick={() => setVendorTab('profile')}>Store Profile</button>
      </div>

      {vendorTab === 'analytics' && (
        <>
          {/* ── Low Stock Alert Banner ── */}
          {!lowStockDismissed && products.filter(p => p.stock_qty < 5).length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '16px', gap: '12px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '0.9rem' }}>
                    {products.filter(p => p.stock_qty < 5).length} product{products.filter(p => p.stock_qty < 5).length > 1 ? 's are' : ' is'} running low on stock
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9a3412', marginTop: '2px' }}>
                    {products.filter(p => p.stock_qty < 5).map(p => (
                      <span key={p.id} style={{
                        display: 'inline-block', background: '#ffedd5', border: '1px solid #fed7aa',
                        borderRadius: '4px', padding: '1px 8px', marginRight: '6px', marginTop: '2px',
                      }}>
                        {p.product_name} <strong style={{ color: p.stock_qty === 0 ? '#dc2626' : '#ea580c' }}>({p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`})</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => setVendorTab('products')}
                  style={{ background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Restock Now
                </button>
                <button
                  onClick={() => setLowStockDismissed(true)}
                  style={{ background: 'none', border: 'none', color: '#9a3412', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 6px', lineHeight: 1 }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <VendorAnalytics vendorOrders={vendorOrders} />
        </>
      )}

      {vendorTab === 'products' && (
        <>
          {productError ? <p className="error">{productError}</p> : null}
          <form className="form-grid" onSubmit={handleSaveProduct}>
            <h3>{editingProductId ? 'Edit Product' : 'Add New Product'}</h3>
            <label>Product Name<input type="text" value={productForm.product_name} onChange={(e) => setProductForm((p) => ({ ...p, product_name: e.target.value }))} required /></label>
            <label>Category<input type="text" value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} required /></label>
            <label>Price<input type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required /></label>
            <label>Unit<input type="text" value={productForm.unit} onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))} required /></label>
            <label>Stock<input type="number" min="0" step="1" value={productForm.stock_qty} onChange={(e) => setProductForm((p) => ({ ...p, stock_qty: e.target.value }))} required /></label>
            <label>Product Image<input id="productImageInput" type="file" accept="image/*" onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.files[0] }))} /></label>
            <div className="actions">
              <button type="submit" disabled={isSavingProduct}>{isSavingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}</button>
              {editingProductId ? <button type="button" className="secondary-btn" onClick={cancelEdit}>Cancel</button> : null}
            </div>
          </form>

          <div className="list-head">
            <h3>{currentUser.first_name}&apos;s Products</h3>
            <button type="button" className="secondary-btn" onClick={fetchProducts}>Refresh</button>
          </div>
          {productsLoading ? <p>Loading...</p> : null}
          {!productsLoading && products.length === 0 ? <p className="empty-note">No products yet.</p> : null}
          {!productsLoading && products.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Unit</th><th>Stock</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.image_url ? <img src={p.image_url} alt="img" style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 4}} /> : <span style={{opacity:0.5}}>No Image</span>}</td>
                      <td>{p.product_name}</td>
                      <td>{p.category}</td>
                      <td>₱{Number(p.price).toFixed(2)}</td>
                      <td>{p.unit}</td>
                      <td>
                        {p.stock_qty === 0 ? (
                          <span style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>Out of Stock</span>
                        ) : p.stock_qty < 5 ? (
                          <span style={{ background: '#fff7ed', color: '#ea580c', fontWeight: 700, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>Low — {p.stock_qty}</span>
                        ) : (
                          <span style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>In Stock — {p.stock_qty}</span>
                        )}
                      </td>
                      <td className="row-actions">
                        <button type="button" onClick={() => startEditProduct(p)}>Edit</button>
                        <button type="button" className="danger-btn" onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}

      {vendorTab === 'sales' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Sales History</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'finding_rider', label: 'Finding Rider' },
                  { key: 'found_rider', label: 'Found Rider' },
                  { key: 'ongoing', label: 'Ongoing' },
                  { key: 'delivered', label: 'Delivered' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setSalesFilter(f.key)}
                    style={{
                      padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600,
                      border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                      background: salesFilter === f.key ? '#2563eb' : 'transparent',
                      color: salesFilter === f.key ? '#fff' : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button type="button" className="secondary-btn" onClick={fetchVendorOrders}>Refresh</button>
            </div>
          </div>
          {(() => {
            const filtered = salesFilter === 'all'
              ? vendorOrders
              : vendorOrders.filter(o => o.delivery_status === salesFilter)
            const filteredTotal = filtered.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
            return (
              <>
                {filtered.length === 0
                  ? <p className="empty-note">No orders match this filter.</p>
                  : filtered.map((order) => (
                    <div key={order.order_id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <strong>🛍 {order.shopper_name}</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{order.shopper_email}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <StatusBadge status={order.delivery_status} />
                          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{order.ordered_at}</span>
                        </div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>₱{Number(item.unit_price).toFixed(2)}</td>
                                <td>₱{Number(item.subtotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ textAlign: 'right', fontWeight: 'bold', margin: '0.5rem 0 0' }}>
                        Total: ₱{Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                {filtered.length > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                    padding: '12px 16px', marginTop: '8px',
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 500 }}>
                      {filtered.length} order{filtered.length !== 1 ? 's' : ''} shown
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>
                      Total: ₱{filteredTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {vendorTab === 'profile' && (
        <div style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: '1rem' }}>Store Profile</h3>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem' }}>Store Banner</h4>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Upload a banner to display on the marketplace home page. Recommended size: 1200x300. Max size: 5MB.
            </p>
            
            {currentUser.banner_url && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Current Banner:</p>
                <img src={`${API_BASE_URL}${currentUser.banner_url}`} alt="Current Banner" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
            )}

            {bannerError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{bannerError}</div>}
            {bannerSuccess && <div style={{ color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{bannerSuccess}</div>}

            <form onSubmit={handleBannerUpload}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setBannerFile(e.target.files[0])} 
                  required 
                />
              </div>
              <button type="submit" disabled={isUploadingBanner || !bannerFile}>
                {isUploadingBanner ? 'Uploading...' : 'Upload Banner'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
