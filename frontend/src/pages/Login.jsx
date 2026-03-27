import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad'
import { useAuth } from '../context/AuthContext'
import { answerSecurityQuestion, getMe, getPinStatus, getSecurityQuestion, listUsers, loginWithPinById } from '../services/api'

const AVATAR_COLORS = ['bg-brand-600', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500']

// Usuario card avatar: foto si existe, inicial si no
function CardAvatar({ user, index }) {
  if (user.avatar) {
    return (
      <img
        src={`/avatars/${user.avatar}`}
        alt={user.name}
        className="w-12 h-12 rounded-2xl object-cover bg-slate-200 shrink-0"
      />
    )
  }
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  return (
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

// Avatar grande para la pantalla de PIN
function PinAvatar({ user, index }) {
  if (user.avatar) {
    return (
      <img
        src={`/avatars/${user.avatar}`}
        alt={user.name}
        className="w-24 h-24 rounded-3xl object-cover bg-slate-700 shadow-xl mb-5"
      />
    )
  }
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  return (
    <div className={`w-24 h-24 rounded-3xl ${color} flex items-center justify-center text-white text-4xl font-bold mb-5 shadow-xl`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [users, setUsers]             = useState([])
  const [selected, setSelected]       = useState(null)
  const [pinError, setPinError]       = useState(false)
  const [pinLoading, setPinLoading]   = useState(false)
  const [pinSuccess, setPinSuccess]   = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [pinFailCount, setPinFailCount]         = useState(0)
  const [showSecurityQ, setShowSecurityQ]       = useState(false)
  const [securityQuestion, setSecurityQuestion] = useState(null)
  const [sqAnswer, setSqAnswer]                 = useState('')
  const [sqError, setSqError]                   = useState(false)
  const [sqLoading, setSqLoading]               = useState(false)

  useEffect(() => {
    listUsers()
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [])

  const afterLogin = async (token) => {
    localStorage.setItem('token', token)
    const userRes = await getMe()
    const user = userRes.data
    await getPinStatus()
    localStorage.setItem('linkedEmail', user.email ?? '')
    localStorage.setItem('pinEnabled', 'true')
    login(token, user, null)
    navigate('/')
  }

  const normAnswer = (v) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  const handlePinComplete = async (pin) => {
    setPinLoading(true)
    try {
      const res = await loginWithPinById(selected.id, pin)
      setPinSuccess(true)
      afterLogin(res.data.access_token)
    } catch {
      setPinLoading(false)
      setPinError(true)
      const newCount = pinFailCount + 1
      setPinFailCount(newCount)
      if (newCount >= 3) {
        try {
          const r = await getSecurityQuestion(selected.id)
          setSecurityQuestion(r.data.question)
        } catch {
          setSecurityQuestion(null)
        }
        setShowSecurityQ(true)
      }
    }
  }

  const handleSqSubmit = async () => {
    if (!sqAnswer.trim() || sqLoading) return
    setSqLoading(true)
    setSqError(false)
    try {
      const res = await answerSecurityQuestion(selected.id, sqAnswer)
      setPinSuccess(true)
      afterLogin(res.data.access_token)
    } catch {
      setSqLoading(false)
      setSqError(true)
    }
  }

  const selectedIndex = selected ? users.findIndex((u) => u.id === selected.id) : 0

  /* ── User selection screen ──────────────────────────────────────── */
  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-600/30">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cohabit Finance</h1>
          <p className="text-slate-400 text-sm mt-1.5">Gastos compartidos en pareja</p>
        </div>

        <div className="bg-white rounded-t-3xl px-6 pt-7 pb-16">
          <p className="text-sm font-semibold text-slate-500 mb-4">¿Quién eres?</p>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((u, i) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.98] transition-all text-left"
                >
                  <CardAvatar user={u} index={i} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Toca para ingresar con PIN</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  /* ── Security question screen ────────────────────────────────────────── */
  if (showSecurityQ) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {pinSuccess && (
          <div className="fixed inset-x-0 top-6 flex justify-center z-50 px-6">
            <div className="flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 animate-slide-up">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">¡Bienvenido, {selected.name}!</p>
                <p className="text-emerald-100 text-xs">Cargando tu sesión…</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          <PinAvatar user={selected} index={selectedIndex} />
          <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
          <p className="text-slate-400 text-sm mt-1.5">Verificación de identidad</p>
        </div>

        <div className="bg-white rounded-t-3xl px-6 pt-8 pb-14">
          {securityQuestion ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pregunta de seguridad</p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
                  <p className="text-sm font-medium text-slate-800">{securityQuestion}</p>
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={sqAnswer}
                  onChange={(e) => setSqAnswer(normAnswer(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSqSubmit()}
                  placeholder="TU RESPUESTA"
                  autoFocus
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold tracking-widest text-center focus:outline-none focus:ring-2 transition-all ${
                    sqError
                      ? 'border-rose-300 bg-rose-50 focus:ring-rose-300/40 text-rose-700'
                      : 'border-slate-200 bg-slate-50 focus:ring-brand-400/40 focus:border-brand-400 text-slate-900'
                  }`}
                />
                {sqError && (
                  <p className="text-rose-500 text-xs font-medium text-center mt-1.5">Respuesta incorrecta. Inténtalo de nuevo.</p>
                )}
              </div>
              <button
                onClick={handleSqSubmit}
                disabled={!sqAnswer.trim() || sqLoading}
                className="w-full py-3.5 bg-brand-600 text-white font-semibold rounded-2xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {sqLoading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verificando…</>
                ) : 'Verificar identidad'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Sin pregunta de seguridad</p>
                <p className="text-slate-500 text-xs mt-1">Este usuario no tiene configurada una pregunta de seguridad. Contacta a tu pareja para restablecer el acceso.</p>
              </div>
            </div>
          )}
          <button
            onClick={() => { setSelected(null); setShowSecurityQ(false); setPinFailCount(0); setSqAnswer(''); setSqError(false) }}
            className="w-full mt-6 text-sm text-slate-400 hover:text-slate-500 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Cambiar de usuario
          </button>
        </div>
      </div>
    )
  }
  /* ── PIN entry screen ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Success toast */}
      {pinSuccess && (
        <div className="fixed inset-x-0 top-6 flex justify-center z-50 px-6">
          <div className="flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/30 animate-slide-up">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">¡Bienvenido, {selected.name}!</p>
              <p className="text-emerald-100 text-xs">Cargando tu sesión…</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <PinAvatar user={selected} index={selectedIndex} />
        <h2 className="text-2xl font-bold text-white">{selected.name}</h2>

        {pinError ? (
          <div className="mt-3 flex items-center gap-2 bg-rose-500/20 border border-rose-400/30 rounded-2xl px-4 py-2.5">
            <svg className="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-rose-300 text-sm font-semibold">PIN incorrecto</p>
              <p className="text-rose-400/70 text-xs">
                {pinFailCount >= 2 ? 'Último intento antes de la pregunta de seguridad' : 'Inténtalo de nuevo'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm mt-1.5">Ingresa tu PIN de 6 dígitos</p>
        )}
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-14">
        <PinPad
          onComplete={handlePinComplete}
          error={pinError}
          onErrorClear={() => setPinError(false)}
          loading={pinLoading}
        />
        <button
          onClick={() => { setSelected(null); setPinError(false); setPinFailCount(0) }}
          className="w-full mt-8 text-sm text-slate-400 hover:text-slate-500 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Cambiar de usuario
        </button>
      </div>
    </div>
  )
}
