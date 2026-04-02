import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

function IcHome({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
      <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.43Z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 12 12 2.25 21.75 12M4.5 9.75V19.875c0 .621.504 1.125 1.125 1.125H9.75v-4.875a1.125 1.125 0 0 1 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  )
}

function IcChartBars({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function IcReceipt({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 .375.136.72.375.979.309.345.767.492 1.302.398l2.682-.536 2.448.978a.75.75 0 0 0 .557 0l2.448-.978 2.682.536c.535.094.993-.053 1.302-.398.239-.259.375-.604.375-.979V3.375c0-1.036-.84-1.875-1.875-1.875H5.625ZM8.25 9.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 1 0 0 1.5H12a.75.75 0 1 0 0-1.5H9Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  )
}

function IcClock({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.75V12h4.5" />
    </svg>
  )
}

function IcUser({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function IcPersonal({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
      <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IcTarget({ a }) {
  return a ? (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-13a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
    </svg>
  ) : (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

const TABS = [
  { path: '/',          label: 'Inicio',    Icon: IcHome },
  { path: '/dashboard', label: 'Balance',   Icon: IcChartBars },
  { path: '/history',   label: 'Historial', Icon: IcClock },
  { path: '/metas',     label: 'Metas',     Icon: IcTarget },
  { path: '/personal',  label: 'Personal',  Icon: IcPersonal },
]

// Muestra avatar o inicial
function UserAvatar({ user, size = 'sm' }) {
  const cls = size === 'sm'
    ? 'w-8 h-8 rounded-full text-[13px]'
    : 'w-14 h-14 rounded-2xl text-xl'
  if (user?.avatar) {
    return (
      <img
        src={`/avatars/${user.avatar}`}
        alt={user.name}
        className={`${cls} object-cover bg-slate-200`}
      />
    )
  }
  return (
    <div className={`${cls} bg-brand-600 flex items-center justify-center text-white font-bold`}>
      {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function Navbar() {
  const { user, mode, setMode } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isWishlist = location.pathname === '/wishlist'

  // Única fuente de verdad para data-mode en <html>
  useEffect(() => {
    const value = isWishlist ? 'wishlist' : mode === 'private' ? 'private' : ''
    document.documentElement.setAttribute('data-mode', value)
  }, [isWishlist, mode])

  const handleModeSelect = (selected) => {
    setMode(selected)
    // Si estamos en wishlist, navegar a inicio para que el cambio de modo sea visible
    if (isWishlist) navigate('/')
  }

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200/70">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-[15px] tracking-tight">Cohabit</span>
          </div>

          {/* Mode switch pill — cada mitad es clickeable independientemente */}
          <div
            role="group"
            aria-label="Cambiar modo"
            className="relative flex items-center bg-slate-100 rounded-full shrink-0"
            style={{ width: 160, height: 32, padding: 4 }}
          >
            {/* Sliding thumb */}
            {!isWishlist && (
              <span
                className="absolute rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
                style={{
                  width: 76,
                  top: 4,
                  bottom: 4,
                  left: 4,
                  transform: mode === 'private' ? 'translateX(76px)' : 'translateX(0)',
                }}
              />
            )}
            <button
              onClick={() => handleModeSelect('shared')}
              className={`relative z-10 flex-1 text-center text-[11px] font-semibold tracking-tight transition-colors duration-200 py-1 rounded-full ${
                !isWishlist && mode === 'shared' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              Compartido
            </button>
            <button
              onClick={() => handleModeSelect('private')}
              className={`relative z-10 flex-1 text-center text-[11px] font-semibold tracking-tight transition-colors duration-200 py-1 rounded-full ${
                !isWishlist && mode === 'private' ? 'text-rose-500' : 'text-slate-400'
              }`}
            >
              Personal
            </button>
          </div>

          {/* Notes / Wishlist icon */}
          <Link
            to="/wishlist"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              location.pathname === '/wishlist'
                ? 'text-brand-600 bg-brand-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Lista de deseos"
          >
            {location.pathname === '/wishlist' ? (
              <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
            ) : (
              <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
            )}
          </Link>

          {/* Avatar */}
          <Link to="/profile" className="active:scale-95 transition-transform shrink-0">
            <UserAvatar user={user} size="sm" />
          </Link>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200/70 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-5 h-[60px]">
          {TABS.map(({ path, label, Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center justify-center gap-[3px] transition-colors duration-100 ${
                  active ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                <Icon a={active} />
                <span className="text-[9px] font-semibold tracking-wide">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

    </>
  )
}
