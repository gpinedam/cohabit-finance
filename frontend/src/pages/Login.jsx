import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad'
import { useAuth } from '../context/AuthContext'
import { getMe, loginWithPassword, loginWithPin, getPinStatus } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const pinEnabled  = localStorage.getItem('pinEnabled') === 'true'
  const linkedEmail = localStorage.getItem('linkedEmail') || ''

  const [email, setEmail]       = useState(linkedEmail)
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading]   = useState(false)

  const afterLogin = async (token) => {
    localStorage.setItem('token', token)
    const userRes = await getMe()
    const user = userRes.data
    const pinRes = await getPinStatus()
    localStorage.setItem('linkedEmail', user.email)
    if (pinRes.data.has_pin) localStorage.setItem('pinEnabled', 'true')
    login(token, user, null)
    navigate(pinRes.data.has_pin ? '/' : '/setup-pin')
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await loginWithPassword(email, password)
      await afterLogin(res.data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const handlePinComplete = async (pin) => {
    try {
      const res = await loginWithPin(linkedEmail, pin)
      await afterLogin(res.data.access_token)
    } catch {
      setPinError(true)
    }
  }

  /* ── PIN login screen ─────────────────────────────────────────────── */
  if (pinEnabled && linkedEmail) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-600/30">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cohabit Finance</h1>
          <p className="text-slate-400 text-sm mt-1.5">{linkedEmail}</p>
          <p className="text-slate-600 text-xs mt-5">Ingresa tu PIN de 6 dígitos</p>
        </div>

        <div className="bg-white rounded-t-3xl px-6 pt-8 pb-14">
          <PinPad
            onComplete={handlePinComplete}
            error={pinError}
            onErrorClear={() => setPinError(false)}
          />
          <button
            onClick={() => { localStorage.removeItem('pinEnabled'); window.location.reload() }}
            className="w-full mt-8 text-sm text-slate-400 hover:text-slate-500 transition-colors"
          >
            Usar contraseña en su lugar
          </button>
        </div>
      </div>
    )
  }

  /* ── Password login screen ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-600/30">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Cohabit Finance</h1>
        <p className="text-slate-400 text-sm mt-2">Gastos compartidos en pareja</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-12">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Iniciar sesión</h2>
        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm text-slate-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm text-slate-900 transition-colors"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Ingresando…
              </>
            ) : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-6">
          Demo: a@cohabit.local · demo1234
        </p>
      </div>
    </div>
  )
}
