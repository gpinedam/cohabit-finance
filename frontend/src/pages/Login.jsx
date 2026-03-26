import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad'
import { useAuth } from '../context/AuthContext'
import { getMe, getPinStatus, listUsers, loginWithPinById } from '../services/api'

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

  const [users, setUsers]       = useState([])
  const [selected, setSelected] = useState(null)
  const [pinError, setPinError] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)

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

  const handlePinComplete = async (pin) => {
    try {
      const res = await loginWithPinById(selected.id, pin)
      await afterLogin(res.data.access_token)
    } catch {
      setPinError(true)
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

  /* ── PIN entry screen ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <PinAvatar user={selected} index={selectedIndex} />
        <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
        <p className="text-slate-400 text-sm mt-1.5">Ingresa tu PIN de 6 dígitos</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-14">
        <PinPad
          onComplete={handlePinComplete}
          error={pinError}
          onErrorClear={() => setPinError(false)}
        />
        <button
          onClick={() => { setSelected(null); setPinError(false) }}
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
