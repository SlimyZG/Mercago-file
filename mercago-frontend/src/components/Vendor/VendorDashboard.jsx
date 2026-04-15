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

export default function VendorDashboard({ currentUser, token, onLogout }) {
  const [vendorTab, setVendorTab] = useState('products')
  
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
