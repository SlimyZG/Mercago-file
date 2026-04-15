import { useState } from 'react'
import { API_BASE_URL } from '../../config'
import { extractError } from '../../utils/error'

export default function AuthTabs({ onLoginSuccess }) {
  const [activeAuthTab, setActiveAuthTab] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [registerForm, setRegisterForm] = useState({
    first_name: '', middle_name: '', last_name: '',
    email: '', password: '', contact_no: '',
    age: '', sex: 'Male', address: '', role: 'shopper',
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

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
      onLoginSuccess(t, d?.user)
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
      onLoginSuccess(t, d?.user)
    } catch { setAuthError('Unable to reach server.') }
    finally { setAuthLoading(false) }
  }

  return (
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
  )
}
