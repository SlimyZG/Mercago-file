import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL, POLL_INTERVAL_MS } from '../../config'
import OrderCard from '../UI/OrderCard'

export default function RiderDashboard({ currentUser, token, onLogout }) {
  const [riderTab, setRiderTab] = useState('available')
  
  const [availableOrders, setAvailableOrders] = useState([])
  const [myDeliveries, setMyDeliveries] = useState([])
  const [riderLoading, setRiderLoading] = useState(false)
  const [riderMessage, setRiderMessage] = useState('')
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  
  const prevAvailableCount = useRef(0)
  const pollRef = useRef(null)

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

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

  useEffect(() => {
    if (!token) return
    fetchAvailableOrders(); 
    fetchMyDeliveries();
    pollRef.current = setInterval(fetchAvailableOrders, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [token])

  return (
    <section>
      <div className="dashboard-head">
        <div>
          <h2>Rider Dashboard</h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
            {currentUser.first_name} {currentUser.last_name} &bull; <em>rider</em>
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={onLogout}>Logout</button>
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
  )
}
