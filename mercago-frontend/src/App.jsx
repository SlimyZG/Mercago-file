import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'
const TOKEN_KEY = 'sanctum_token'
const POLL_INTERVAL_MS = 5000

const emptyProductForm = {
  product_name: '',
  category: '',
  price: '',
  unit: '',
  stock_qty: '',
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    finding_rider: { label: '🔍 Finding Rider', bg: '#fef3c7', color: '#92400e' },
    ongoing: { label: '🚴 On the Way', bg: '#dbeafe', color: '#1e40af' },
    completed: { label: '✅ Delivered', bg: '#d1fae5', color: '#065f46' },
    cancelled: { label: '❌ Cancelled', bg: '#fee2e2', color: '#991b1b' },
  }
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

// ── Rider order card ─────────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onDecline, onComplete, showActions }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>🛍 {order.shopper_name}</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>📍 {order.shopper_address}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>🏪 Vendor: {order.vendor_name}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={order.delivery_status} />
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{order.ordered_at}</span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Product</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px' }}>{item.product_name}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>₱{Number(item.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <strong>Total: ₱{Number(order.total_amount).toFixed(2)}</strong>

        {showActions === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onDecline(order.order_id)}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600 }}>
              ✗ Decline
            </button>
            <button onClick={() => onAccept(order.order_id)}
              style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600 }}>
              ✓ Accept
            </button>
          </div>
        )}

        {showActions === 'ongoing' && (
          <button onClick={() => onComplete(order.order_id)}
            style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
            ✅ Order Complete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mercago_user') || 'null') } catch { return null }
  })
  const [activeAuthTab, setActiveAuthTab] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Vendor
  const [productError, setProductError] = useState('')
  const [productsLoading, setProductsLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [vendorOrders, setVendorOrders] = useState([])
  const [vendorTab, setVendorTab] = useState('products')

  // Shopper
  const [shopVendors, setShopVendors] = useState([])
  const [shopLoading, setShopLoading] = useState(false)
  const [shopError, setShopError] = useState('')
  const [cart, setCart] = useState([])
  const [shopperTab, setShopperTab] = useState('browse')
  const [orderHistory, setOrderHistory] = useState([])
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')

  // Rider
  const [riderTab, setRiderTab] = useState('available')
  const [availableOrders, setAvailableOrders] = useState([])
  const [myDeliveries, setMyDeliveries] = useState([])
  const [riderLoading, setRiderLoading] = useState(false)
  const [riderMessage, setRiderMessage] = useState('')
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const prevAvailableCount = useRef(0)
  const pollRef = useRef(null)

  const [registerForm, setRegisterForm] = useState({
    first_name: '', middle_name: '', last_name: '',
    email: '', password: '', contact_no: '',
    age: '', sex: 'Male', address: '', role: 'shopper',
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }), [token])

  const extractError = async (res) => {
    try {
      const d = await res.json()
      if (typeof d?.message === 'string') return d.message
      const first = Object.values(d?.errors ?? {})[0]
      if (Array.isArray(first)) return first[0]
    } catch { /* fall through */ }
    return 'Something went wrong.'
  }

  const saveSession = (tok, user) => {
    localStorage.setItem(TOKEN_KEY, tok)
    localStorage.setItem('mercago_user', JSON.stringify(user))
    setToken(tok); setCurrentUser(user); setAuthError('')
  }

  const handleLogout = () => {
    clearInterval(pollRef.current)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('mercago_user')
    setToken(''); setCurrentUser(null)
    setProducts([]); setShopVendors([]); setCart([])
    setOrderHistory([]); setVendorOrders([])
    setAvailableOrders([]); setMyDeliveries([])
    setEditingProductId(null); setProductForm(emptyProductForm)
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      })
      if (!res.ok) { setAuthError(await extractError(res)); return }
      const d = await res.json()
      const t = d?.token || d?.access_token
      if (!t) { setAuthError('Token not returned.'); return }
      saveSession(t, d?.user)
    } catch { setAuthError('Unable to reach server.') }
    finally { setAuthLoading(false) }
  }

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      if (!res.ok) { setAuthError(await extractError(res)); return }
      const d = await res.json()
      const t = d?.token || d?.access_token
      if (!t) { setAuthError('Token not returned.'); return }
      saveSession(t, d?.user)
    } catch { setAuthError('Unable to reach server.') }
    finally { setAuthLoading(false) }
  }

  // ─── Vendor ───────────────────────────────────────────────────────────────

  const fetchProducts = async () => {
    if (!token) return
    setProductsLoading(true); setProductError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { headers: authHeaders })
      if (!res.ok) { setProductError(await extractError(res)); if (res.status === 401) handleLogout(); return }
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
    const payload = { ...productForm, price: Number(productForm.price), stock_qty: Number(productForm.stock_qty) }
    const isEdit = Boolean(editingProductId)
    const url = isEdit ? `${API_BASE_URL}/api/products/${editingProductId}` : `${API_BASE_URL}/api/products`
    try {
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders, body: JSON.stringify(payload) })
      if (!res.ok) { setProductError(await extractError(res)); return }
      setProductForm(emptyProductForm); setEditingProductId(null); await fetchProducts()
    } catch { setProductError('Unable to save product.') }
    finally { setIsSavingProduct(false) }
  }

  const startEditProduct = (p) => {
    setEditingProductId(p.id)
    setProductForm({ product_name: p.product_name ?? '', category: p.category ?? '', price: String(p.price ?? ''), unit: p.unit ?? '', stock_qty: String(p.stock_qty ?? '') })
    setProductError('')
  }
  const cancelEdit = () => { setEditingProductId(null); setProductForm(emptyProductForm) }

  const handleDeleteProduct = async (id) => {
    setProductError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE', headers: authHeaders })
      if (!res.ok) { setProductError(await extractError(res)); return }
      setProducts((prev) => prev.filter((p) => p.id !== id))
      if (editingProductId === id) cancelEdit()
    } catch { setProductError('Unable to delete product.') }
  }

  // ─── Shopper ──────────────────────────────────────────────────────────────

  const fetchShop = async () => {
    if (!token) return
    setShopLoading(true); setShopError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/shop`, { headers: authHeaders })
      if (!res.ok) { setShopError(await extractError(res)); return }
      setShopVendors(await res.json())
    } catch { setShopError('Unable to load shop.') }
    finally { setShopLoading(false) }
  }

  const fetchOrderHistory = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/history`, { headers: authHeaders })
      if (!res.ok) return
      const d = await res.json()
      setOrderHistory(Array.isArray(d) ? d : [])
    } catch { /* silent */ }
  }

  const addToCart = (product, vendorName) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id)
      if (ex) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product: { ...product, vendorName }, quantity: 1 }]
    })
  }
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.product.id !== id))
  const updateCartQty = (id, qty) => {
    if (qty < 1) { removeFromCart(id); return }
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setIsPlacingOrder(true); setOrderMessage('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })) }),
      })
      const d = await res.json()
      if (!res.ok) { setOrderMessage(`❌ ${d.message || 'Order failed.'}`); return }
      setCart([]); setOrderMessage('✅ Order placed! A rider will be assigned shortly.')
      setShopperTab('history')
      await Promise.all([fetchShop(), fetchOrderHistory()])
    } catch { setOrderMessage('❌ Unable to connect.') }
    finally { setIsPlacingOrder(false) }
  }

  // ─── Rider ────────────────────────────────────────────────────────────────

  const fetchAvailableOrders = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/rider/orders`, { headers: authHeaders })
      if (!res.ok) return
      const orders = await res.json()
      const list = Array.isArray(orders) ? orders : []
      if (list.length > prevAvailableCount.current) {
        setNewOrderAlert(true)
        setTimeout(() => setNewOrderAlert(false), 4000)
      }
      prevAvailableCount.current = list.length
      setAvailableOrders(list)
    } catch { /* silent */ }
  }

  const fetchMyDeliveries = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/rider/my-deliveries`, { headers: authHeaders })
      if (!res.ok) return
      const d = await res.json()
      setMyDeliveries(Array.isArray(d) ? d : [])
    } catch { /* silent */ }
  }

  const handleAcceptOrder = async (orderId) => {
    setRiderLoading(true); setRiderMessage('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/rider/orders/${orderId}/accept`, { method: 'POST', headers: authHeaders })
      const d = await res.json()
      setRiderMessage(res.ok ? `✅ ${d.message}` : `❌ ${d.message}`)
      if (res.ok) { setRiderTab('my-deliveries'); await Promise.all([fetchAvailableOrders(), fetchMyDeliveries()]) }
    } catch { setRiderMessage('❌ Unable to accept.') }
    finally { setRiderLoading(false) }
  }

  const handleDeclineOrder = async (orderId) => {
    setRiderLoading(true); setRiderMessage('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/rider/orders/${orderId}/decline`, { method: 'POST', headers: authHeaders })
      const d = await res.json()
      setRiderMessage(res.ok ? `⚠️ ${d.message}` : `❌ ${d.message}`)
      if (res.ok) await fetchAvailableOrders()
    } catch { setRiderMessage('❌ Unable to decline.') }
    finally { setRiderLoading(false) }
  }

  const handleCompleteDelivery = async (orderId) => {
    setRiderLoading(true); setRiderMessage('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/rider/orders/${orderId}/complete`, { method: 'POST', headers: authHeaders })
      const d = await res.json()
      setRiderMessage(res.ok ? `✅ ${d.message}` : `❌ ${d.message}`)
      if (res.ok) await fetchMyDeliveries()
    } catch { setRiderMessage('❌ Unable to complete.') }
    finally { setRiderLoading(false) }
  }

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !currentUser) return
    if (currentUser.role === 'vendor') { fetchProducts(); fetchVendorOrders() }
    if (currentUser.role === 'shopper') { fetchShop(); fetchOrderHistory() }
    if (currentUser.role === 'rider') {
      fetchAvailableOrders(); fetchMyDeliveries()
      pollRef.current = setInterval(fetchAvailableOrders, POLL_INTERVAL_MS)
    }
    return () => clearInterval(pollRef.current)
  }, [token])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="app-shell">
      <div className="card">
        <h1>MercaGo</h1>

        {/* ══ NOT LOGGED IN ══ */}
        {!token ? (
          <section>
            <div className="tabs">
              <button className={activeAuthTab === 'login' ? 'tab active' : 'tab'} type="button" onClick={() => setActiveAuthTab('login')}>Login</button>
              <button className={activeAuthTab === 'register' ? 'tab active' : 'tab'} type="button" onClick={() => setActiveAuthTab('register')}>Register</button>
            </div>
            {authError ? <p className="error">{authError}</p> : null}

            {activeAuthTab === 'login' ? (
              <form className="form-grid" onSubmit={handleLogin}>
                <label>Email<input type="email" value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                <label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                <button type="submit" disabled={authLoading}>{authLoading ? 'Logging in...' : 'Login'}</button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleRegister}>
                <label>First Name<input type="text" value={registerForm.first_name} onChange={(e) => setRegisterForm((p) => ({ ...p, first_name: e.target.value }))} required /></label>
                <label>Middle Name (Optional)<input type="text" value={registerForm.middle_name} onChange={(e) => setRegisterForm((p) => ({ ...p, middle_name: e.target.value }))} /></label>
                <label>Last Name<input type="text" value={registerForm.last_name} onChange={(e) => setRegisterForm((p) => ({ ...p, last_name: e.target.value }))} required /></label>
                <label>Email<input type="email" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                <label>Password<input type="password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                <label>Contact No.<input type="text" value={registerForm.contact_no} onChange={(e) => setRegisterForm((p) => ({ ...p, contact_no: e.target.value }))} required /></label>
                <label>Age<input type="number" min="1" value={registerForm.age} onChange={(e) => setRegisterForm((p) => ({ ...p, age: e.target.value }))} required /></label>
                <label>Sex
                  <select value={registerForm.sex} onChange={(e) => setRegisterForm((p) => ({ ...p, sex: e.target.value }))} required>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>Address<input type="text" value={registerForm.address} onChange={(e) => setRegisterForm((p) => ({ ...p, address: e.target.value }))} required /></label>
                <label>Role
                  <select value={registerForm.role} onChange={(e) => setRegisterForm((p) => ({ ...p, role: e.target.value }))} required>
                    <option value="shopper">Shopper</option>
                    <option value="vendor">Vendor</option>
                    <option value="rider">Rider</option>
                  </select>
                </label>
                <button type="submit" disabled={authLoading}>{authLoading ? 'Registering...' : 'Register'}</button>
              </form>
            )}
          </section>

        ) : currentUser?.role === 'vendor' ? (

          /* ══ VENDOR ══ */
          <section>
            <div className="dashboard-head">
              <div>
                <h2>Vendor Dashboard</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                  {currentUser.first_name} {currentUser.last_name} &bull; <em>vendor</em>
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleLogout}>Logout</button>
            </div>

            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
              <button className={vendorTab === 'products' ? 'tab active' : 'tab'} type="button" onClick={() => setVendorTab('products')}>My Products</button>
              <button className={vendorTab === 'sales' ? 'tab active' : 'tab'} type="button" onClick={() => { setVendorTab('sales'); fetchVendorOrders() }}>Sales History</button>
            </div>

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
                      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Unit</th><th>Stock</th><th>Actions</th></tr></thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.id}>
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

        ) : currentUser?.role === 'rider' ? (

          /* ══ RIDER ══ */
          <section>
            <div className="dashboard-head">
              <div>
                <h2>Rider Dashboard</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                  {currentUser.first_name} {currentUser.last_name} &bull; <em>rider</em>
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleLogout}>Logout</button>
            </div>

            {newOrderAlert && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontWeight: 600, color: '#92400e' }}>
                🔔 New order available!
              </div>
            )}

            {riderMessage && (
              <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: riderMessage.startsWith('✅') ? '#059669' : riderMessage.startsWith('⚠️') ? '#b45309' : '#ef4444' }}>
                {riderMessage}
              </p>
            )}

            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
              <button className={riderTab === 'available' ? 'tab active' : 'tab'} type="button"
                onClick={() => { setRiderTab('available'); fetchAvailableOrders() }}>
                Available Orders {availableOrders.length > 0 ? `(${availableOrders.length})` : ''}
              </button>
              <button className={riderTab === 'my-deliveries' ? 'tab active' : 'tab'} type="button"
                onClick={() => { setRiderTab('my-deliveries'); fetchMyDeliveries() }}>
                My Deliveries
              </button>
            </div>

            {riderTab === 'available' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>🔄 Auto-refreshing every 5 seconds</p>
                  <button type="button" className="secondary-btn" onClick={fetchAvailableOrders} disabled={riderLoading}>Refresh Now</button>
                </div>
                {availableOrders.length === 0
                  ? <p className="empty-note">No available orders right now.</p>
                  : availableOrders.map((order) => (
                    <OrderCard key={order.order_id} order={order}
                      showActions="pending"
                      onAccept={handleAcceptOrder}
                      onDecline={handleDeclineOrder}
                    />
                  ))}
              </>
            )}

            {riderTab === 'my-deliveries' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>My Deliveries</h3>
                  <button type="button" className="secondary-btn" onClick={fetchMyDeliveries}>Refresh</button>
                </div>
                {myDeliveries.length === 0
                  ? <p className="empty-note">No deliveries yet.</p>
                  : myDeliveries.map((order) => (
                    <OrderCard key={order.order_id} order={order}
                      showActions={order.delivery_status === 'ongoing' ? 'ongoing' : null}
                      onComplete={handleCompleteDelivery}
                    />
                  ))}
              </>
            )}
          </section>

        ) : (

          /* ══ SHOPPER ══ */
          <section>
            <div className="dashboard-head">
              <div>
                <h2>Shop</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                  {currentUser?.first_name} {currentUser?.last_name} &bull; <em>shopper</em>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {cart.length > 0 && (
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '9999px', padding: '2px 10px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    🛒 {cart.length}
                  </span>
                )}
                <button type="button" className="secondary-btn" onClick={handleLogout}>Logout</button>
              </div>
            </div>

            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
              <button className={shopperTab === 'browse' ? 'tab active' : 'tab'} type="button" onClick={() => setShopperTab('browse')}>Browse</button>
              <button className={shopperTab === 'cart' ? 'tab active' : 'tab'} type="button" onClick={() => setShopperTab('cart')}>
                Cart {cart.length > 0 ? `(${cart.length})` : ''}
              </button>
              <button className={shopperTab === 'history' ? 'tab active' : 'tab'} type="button"
                onClick={() => { setShopperTab('history'); fetchOrderHistory() }}>My Orders</button>
            </div>

            {shopperTab === 'browse' && (
              <>
                {shopError ? <p className="error">{shopError}</p> : null}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button type="button" className="secondary-btn" onClick={fetchShop}>Refresh Shop</button>
                </div>
                {shopLoading ? <p>Loading...</p> : null}
                {!shopLoading && shopVendors.length === 0 ? <p className="empty-note">No vendors with products right now.</p> : null}
                {shopVendors.map((vendor) => (
                  <div key={vendor.vendor_id} style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      🏪 {vendor.vendor_name}
                    </h3>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Unit</th><th>Stock</th><th>Action</th></tr></thead>
                        <tbody>
                          {vendor.products.map((product) => (
                            <tr key={product.id}>
                              <td>{product.product_name}</td>
                              <td>{product.category}</td>
                              <td>₱{Number(product.price).toFixed(2)}</td>
                              <td>{product.unit}</td>
                              <td style={{ fontWeight: 'bold', color: product.stock_qty < 5 ? '#ef4444' : 'inherit' }}>{product.stock_qty}</td>
                              <td>
                                <button type="button" onClick={() => addToCart(product, vendor.vendor_name)}
                                  disabled={product.stock_qty === 0}
                                  style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: product.stock_qty === 0 ? 'not-allowed' : 'pointer', opacity: product.stock_qty === 0 ? 0.5 : 1 }}>
                                  {product.stock_qty === 0 ? 'Out of Stock' : '+ Add'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}

            {shopperTab === 'cart' && (
              <>
                <h3>Your Cart</h3>
                {orderMessage ? <p style={{ fontWeight: 'bold', color: orderMessage.startsWith('✅') ? '#059669' : '#ef4444' }}>{orderMessage}</p> : null}
                {cart.length === 0 ? <p className="empty-note">Cart is empty. Browse to add items!</p> : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Product</th><th>Vendor</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.product.id}>
                              <td>{item.product.product_name}</td>
                              <td style={{ color: '#6b7280', fontSize: '0.9rem' }}>🏪 {item.product.vendorName}</td>
                              <td>₱{Number(item.product.price).toFixed(2)}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity - 1)} style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>−</button>
                                  <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                                  <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity + 1)} style={{ width: 28, height: 28, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>+</button>
                                </div>
                              </td>
                              <td style={{ fontWeight: 'bold' }}>₱{(item.product.price * item.quantity).toFixed(2)}</td>
                              <td><button type="button" className="danger-btn" onClick={() => removeFromCart(item.product.id)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Remove</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: 8 }}>
                      <strong style={{ fontSize: '1.1rem' }}>Total: ₱{cartTotal.toFixed(2)}</strong>
                      <button type="button" onClick={handlePlaceOrder} disabled={isPlacingOrder}
                        style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        {isPlacingOrder ? 'Placing...' : '✅ Place Order'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {shopperTab === 'history' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>My Orders</h3>
                  <button type="button" className="secondary-btn" onClick={fetchOrderHistory}>Refresh</button>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 0 }}>Refresh to see latest delivery status.</p>
                {orderHistory.length === 0 ? <p className="empty-note">No orders yet.</p>
                  : orderHistory.map((order) => (
                    <div key={order.order_id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: 8 }}>
                        <strong>🏪 {order.vendor_name}</strong>
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
        )}
      </div>
    </main>
  )
}

export default App
