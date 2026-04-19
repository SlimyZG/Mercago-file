import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { extractError } from '../../utils/error'
import StatusBadge from '../UI/StatusBadge'

const emptyProductForm = {
  product_name: '',
  category: '',
  price: '',
  unit: '',
  stock_qty: '',
  image: null,
}

function VendorAnalytics({ vendorOrders }) {
  // Aggregate stats
  const totalOrders = vendorOrders.length
  let totalRevenue = 0
  let totalItemsSold = 0

  // We only count orders that are not cancelled for revenue (though currently all fetchable are valid)
  vendorOrders.forEach(o => {
    totalRevenue += parseFloat(o.total_amount) || 0
    o.items.forEach(i => totalItemsSold += parseInt(i.quantity, 10) || 0)
  })

  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0

  // Group sales by Date (format: YYYY-MM-DD)
  const salesByDate = {}
  vendorOrders.forEach(o => {
    const dStr = o.ordered_at ? o.ordered_at.split(' ')[0] : 'Unknown'
    if (!salesByDate[dStr]) salesByDate[dStr] = 0
    salesByDate[dStr] += parseFloat(o.total_amount) || 0
  })

  // Sort dates chronological
  const sortedDates = Object.keys(salesByDate).sort()
  const maxDailySales = sortedDates.length > 0 ? Math.max(...Object.values(salesByDate)) : 100

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
    .slice(0, 5)

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
        <div style={{ flex: '1 1 200px', background: '#f3f4f6', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', marginTop: '8px' }}>₱{totalRevenue.toFixed(2)}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: '#f3f4f6', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', marginTop: '8px' }}>{totalOrders}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: '#f3f4f6', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Items Sold</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', marginTop: '8px' }}>{totalItemsSold}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: '#f3f4f6', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Avg Order Value</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', marginTop: '8px' }}>₱{avgOrderValue.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
        
        {/* CSS Bar Chart */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 20px', color: '#374151', fontSize: '1rem' }}>Sales (Last Active Days)</h4>
          {sortedDates.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No sales data available yet.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '220px', marginTop: '40px', paddingBottom: '10px', overflowX: 'auto' }}>
              {sortedDates.slice(-10).map(date => {
                const heightPct = Math.max((salesByDate[date] / maxDailySales) * 100, 5) // min 5% height
                return (
                  <div key={date} style={{ flex: 1, minWidth: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>₱{salesByDate[date].toFixed(0)}</div>
                    <div style={{ width: '100%', height: `${heightPct}%`, background: '#3b82f6', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }}></div>
                    <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{date.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 20px', color: '#374151', fontSize: '1rem' }}>Top Products</h4>
          {topProducts.length === 0 ? (
             <p style={{ color: '#9ca3af' }}>No products sold yet.</p>
          ) : (
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                {topProducts.map(([name, data]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: '#1f2937' }}>{name}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#6b7280' }}>
                      <span style={{ fontWeight: 700, color: '#111' }}>{data.qty}</span> sold<br/>
                      <span style={{ fontSize: '0.75rem' }}>₱{data.rev.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
             </table>
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
      </div>

      {vendorTab === 'analytics' && (
        <VendorAnalytics vendorOrders={vendorOrders} />
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
                      <td style={{ fontWeight: 'bold', color: p.stock_qty < 5 ? '#ef4444' : 'inherit' }}>{p.stock_qty}</td>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Sales History</h3>
            <button type="button" className="secondary-btn" onClick={fetchVendorOrders}>Refresh</button>
          </div>
          {vendorOrders.length === 0 ? <p className="empty-note">No sales yet.</p>
            : vendorOrders.map((order) => (
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
        </>
      )}
    </section>
  )
}
