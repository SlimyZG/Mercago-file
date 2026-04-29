import React, { useState } from 'react'

export default function ProductDetailsModal({ product, token, API_BASE_URL, currentUser, onClose, onAddToCart, onReviewSubmitted }) {
  const [reviews, setReviews] = useState(product.reviews || [])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('You must be logged in to leave a review.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          rating,
          comment
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit review')

      setReviews([data.review, ...reviews])
      setComment('')
      setRating(5)
      if (onReviewSubmitted) onReviewSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ 
        background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', 
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{product.product_name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', overflowY: 'auto', padding: '20px' }}>
          {/* Product Info Section */}
          <div style={{ flex: '1 1 300px', minWidth: '300px', paddingRight: '20px', marginBottom: '20px' }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.product_name} style={{ width: '100%', height: 'auto', borderRadius: '8px', marginBottom: '16px' }} />
            ) : (
              <div style={{ width: '100%', height: '200px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#94a3b8' }}>No Image</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>₱{Number(product.price).toFixed(2)} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/ {product.unit}</span></span>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                ★ {product.avg_rating > 0 ? product.avg_rating : 'New'}
              </span>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '20px' }}>Category: {product.category}</p>

            <button 
              onClick={() => onAddToCart(product)}
              disabled={product.stock_qty <= 0}
              style={{
                width: '100%', padding: '12px', background: product.stock_qty > 0 ? '#2563eb' : '#94a3b8', 
                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: product.stock_qty > 0 ? 'pointer' : 'not-allowed',
                fontSize: '1rem'
              }}
            >
              {product.stock_qty > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>

          {/* Reviews Section */}
          <div style={{ flex: '1 1 300px', minWidth: '300px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>Reviews ({reviews.length})</h3>

            {/* Review Form */}
            {currentUser?.role === 'shopper' && (
              <form onSubmit={handleReviewSubmit} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>Write a Review</h4>
                {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</div>}
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '10px' }}>Rating:</label>
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Terrible</option>
                  </select>
                </div>
                
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder="Share your experience with this product..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '10px', minHeight: '60px', boxSizing: 'border-box' }}
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {/* Review List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No reviews yet.</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{review.user?.first_name} {review.user?.last_name}</strong>
                      <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    {review.comment && <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{review.comment}</p>}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{new Date(review.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
