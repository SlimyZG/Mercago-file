import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'

// ── All Listings Sub-Component ──
function AllListingsSection({ allProducts, loading, handleAddToCart, addedProductId, CATEGORIES }) {
  const [activeCat, setActiveCat] = useState('All')

  const displayed = activeCat === 'All'
    ? allProducts
    : allProducts.filter((p) => (p.category ?? '').toLowerCase() === activeCat.toLowerCase())

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontWeight: 500, fontSize: '1.3rem', color: '#000', textTransform: 'uppercase' }}>ALL LISTINGS</h2>
      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {['All', ...CATEGORIES].map((cat) => (
          <button key={cat}
            onClick={() => setActiveCat(cat)}
            style={{ background: activeCat === cat ? '#2563eb' : '#fff', color: activeCat === cat ? '#fff' : '#374151', border: '1px solid #d1d5db', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s' }}>
            {cat}
          </button>
        ))}
      </div>
      {loading ? <p>Loading market...</p> : null}
      {!loading && displayed.length === 0 && (
        <p style={{ color: '#6b7280' }}>No products in this category yet.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {displayed.map((product) => (
          <div key={product.id}
            style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.product_name} style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ height: '170px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#d1d5db' }}>🛒</div>
            )}
            <div style={{ padding: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#111', marginBottom: '4px' }}>{product.product_name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 'auto' }}>🏪 {product.vendorName}</div>
              <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '8px' }}>{product.category}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '1rem' }}>₱{Number(product.price).toFixed(2)}</span>
                <button
                  onClick={() => handleAddToCart(product, product.vendorName)}
                  style={{ background: addedProductId === product.id ? '#059669' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'background 0.3s' }}>
                  {addedProductId === product.id ? '✓ Added' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage({ onLoginClick, onSignUpClick, currentUser, onGoToDashboard }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const CATEGORIES = ['Fish', 'Crab', 'Shrimp', 'Pork', 'Chicken', 'Beef', 'Vegetables', 'Fruits']

  const CATEGORY_IMAGES = {
    Fish: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600&q=80',
    Crab: '/cat-crab.png',
    Shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80',
    Pork: '/cat-pork.jpg',
    Chicken: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&q=80',
    Beef: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&q=80',
    Vegetables: '/cat-veggie.jpg',
    Fruits: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80',
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/shop`)
      .then((r) => r.json())
      .then((d) => setVendors(Array.isArray(d) ? d : []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false))
  }, [])

  // Flatten all products for search & category filter
  const allProducts = vendors.flatMap((v) =>
    v.products.map((p) => ({ ...p, vendorName: v.vendor_name }))
  )

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCat = selectedCategory
      ? (p.category ?? '').toLowerCase() === selectedCategory.toLowerCase()
      : true
    return matchesSearch && matchesCat
  })

  const [addedProductId, setAddedProductId] = useState(null)

  const handleAddToCart = (product, vendorName) => {
    if (!currentUser || currentUser.role !== 'shopper') {
      setShowLoginPrompt(true)
      return
    }
    // Add to localStorage cart so ShopperDashboard picks it up
    const cart = (() => { try { return JSON.parse(localStorage.getItem('mercago_cart') || '[]') } catch { return [] } })()
    const existing = cart.find((i) => i.product.id === product.id)
    let updatedCart
    if (existing) {
      updatedCart = cart.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
    } else {
      updatedCart = [...cart, { product: { ...product, vendorName }, quantity: 1 }]
    }
    localStorage.setItem('mercago_cart', JSON.stringify(updatedCart))
    setAddedProductId(product.id)
    setTimeout(() => setAddedProductId(null), 1500)
  }

  // Header cart icon — just navigates to the cart tab
  const handleOpenCart = () => {
    if (!currentUser || currentUser.role !== 'shopper') {
      setShowLoginPrompt(true)
      return
    }
    localStorage.setItem('mercago_open_cart', 'true')
    onGoToDashboard()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header Area ── */}
      <header style={{ background: '#3b82f6', padding: '10px 48px 24px 48px' }}>

        {/* Top utility row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <button style={{ background: '#fff', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SELL ON MERCAGO</button>
          {!currentUser && (
            <>
              <button onClick={onLoginClick} style={{ background: '#fff', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>LOGIN</button>
              <button onClick={onSignUpClick} style={{ background: '#fff', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SIGN UP</button>
            </>
          )}
        </div>

        {/* Main Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>

          {/* Logo */}
          <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setSelectedCategory(null)}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>
              MercaGO
            </span>
          </div>

          {/* Search Bar - Centered */}
          <div style={{ flex: 1, maxWidth: '600px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Value"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedCategory(null) }}
                style={{ width: '100%', border: 'none', outline: 'none', padding: '12px 32px 12px 16px', fontSize: '1rem', borderRadius: '6px' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem', padding: 0 }}>✕</button>
              )}
            </div>
            <button style={{ background: '#60a5fa', border: 'none', borderRadius: '6px', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg style={{ width: '24px', fill: 'none', stroke: '#0f172a', strokeWidth: 2 }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </div>

          {/* Cart & User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
            <button onClick={handleOpenCart} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
              <svg style={{ width: '32px', fill: 'none', stroke: '#0f172a', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </button>

            {currentUser ? (
              <div onClick={onGoToDashboard} style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.85rem' }}>
                  {currentUser.first_name?.[0]?.toUpperCase()}
                </div>
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ color: '#374151', fontWeight: 700, fontSize: '0.85rem' }}>{currentUser.first_name}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'capitalize' }}>{currentUser.role}</div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={onLoginClick}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  👤
                </div>
                <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem' }}>Guest</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Login Prompt Modal ── */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛒</div>
            <h2 style={{ margin: '0 0 0.5rem', color: '#1e3a8a' }}>Account Required</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              You need a <strong>Shopper account</strong> to add items to cart and place orders. Browse is free — ordering requires an account!
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowLoginPrompt(false); onLoginClick() }} style={{ background: '#2563eb', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                Login
              </button>
              <button onClick={() => { setShowLoginPrompt(false); onSignUpClick() }} style={{ background: '#fbbf24', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, color: '#1e3a8a', fontSize: '0.95rem' }}>
                Sign Up
              </button>
              <button onClick={() => setShowLoginPrompt(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <main style={{ maxWidth: 1200, margin: '3rem auto', padding: '0 1.5rem' }}>

        {/* ── Main Grid: Shows categories or search results ── */}
        {!search && !selectedCategory ? (
          <>
            {/* Category Grid (matching mockup) */}
            <div style={{ background: '#d4d4d4', padding: '24px', borderRadius: '4px', marginBottom: '3rem' }}>
              <h2 style={{ margin: '0 0 16px', fontWeight: 500, fontSize: '1.3rem', color: '#000', textTransform: 'uppercase' }}>CATEGORIES</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {CATEGORIES.slice(0, 6).map((cat) => (
                  <div key={cat} onClick={() => setSelectedCategory(cat)}
                    style={{ background: '#fff', padding: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                  >
                    <img
                      src={CATEGORY_IMAGES[cat]}
                      alt={cat}
                      style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div style={{ paddingTop: '10px', paddingBottom: '4px', textAlign: 'center', fontWeight: 400, fontSize: '1.1rem', textTransform: 'uppercase', color: '#000' }}>{cat}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── All Listings ── */}
            <AllListingsSection
              allProducts={allProducts}
              loading={loading}
              handleAddToCart={handleAddToCart}
              addedProductId={addedProductId}
              CATEGORIES={CATEGORIES}
            />
          </>
        ) : (
          // Products filtered by search or category
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#111', fontSize: '1.1rem', fontWeight: 700 }}>
                {selectedCategory ? `🐟 ${selectedCategory.toUpperCase()}` : `🔍 Results for "${search}"`}
              </h2>
              <button onClick={() => { setSelectedCategory(null); setSearch('') }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>← Back</button>
            </div>

            {loading ? <p>Loading...</p> : null}
            {!loading && filteredProducts.length === 0 && (
              <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '3rem', fontSize: '1.1rem' }}>No products found in this category yet. Check back soon!</p>
            )}

            {/* Grouped by Vendor */}
            {vendors
              .map((vendor) => {
                const vendorFiltered = vendor.products.filter((p) => {
                  const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
                  const matchesCat = selectedCategory ? (p.category ?? '').toLowerCase() === selectedCategory.toLowerCase() : true
                  return matchesSearch && matchesCat
                })
                if (vendorFiltered.length === 0) return null
                return (
                  <div key={vendor.vendor_id} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#374151', fontSize: '1rem' }}>
                      🏪 {vendor.vendor_name}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                      {vendorFiltered.map((product) => (
                        <div key={product.id} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.product_name} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: 200, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '2.5rem' }}>🛒</div>
                          )}
                          <div style={{ padding: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: '#111', marginBottom: 4 }}>{product.product_name}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 'auto' }}>{product.category}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '1rem' }}>₱{Number(product.price).toFixed(2)} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>/ {product.unit}</span></span>
                              <button
                                onClick={() => handleAddToCart(product, vendor.vendor_name)}
                                style={{ background: addedProductId === product.id ? '#059669' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.3s' }}>
                                {addedProductId === product.id ? '✓ Added' : '+ Add'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: '#1a1a2e', color: '#9ca3af', padding: '2rem', textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem' }}>
        <p style={{ margin: 0 }}>© 2026 MercaGo Marketplace. Fresh market delivered to your door.</p>
      </footer>
    </div>
  )
}
