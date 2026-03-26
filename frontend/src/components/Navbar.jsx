import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── SVG icon set (Heroicons style) ──────────────────────────────────────────
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

const TABS = [
  { path: '/',          label: 'Inicio',    Icon: IcHome },
  { path: '/dashboard', label: 'Balance',   Icon: IcChartBars },
  { path: '/expenses',  label: 'Gastos',    Icon: IcReceipt },
  { path: '/history',   label: 'Historial', Icon: IcClock },
  { path: '/profile',   label: 'Perfil',    Icon: IcUser },
]

export default function Navbar() {
  const { user, logout, lockScreen } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200/70">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-[15px] tracking-tight">Cohabit</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-[13px] active:scale-95 transition-transform"
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </button>
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

      {/* Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Side drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="relative px-5 pt-14 pb-5">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold mb-3 shadow-md shadow-brand-600/20">
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-2">
              Ingreso: <span className="font-semibold text-slate-600">S/ {Number(user?.income ?? 0).toLocaleString('es-PE')}</span> / mes
            </p>
          </div>

          <div className="mx-5 h-px bg-slate-100" />
          <div className="flex-1" />

          <div className="px-5 pb-10 flex flex-col gap-2">
            <button
              onClick={() => { lockScreen(); setDrawerOpen(false) }}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Bloquear pantalla
            </button>
            <button
              onClick={() => { logout(); setDrawerOpen(false) }}
              className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium text-sm active:scale-[0.98] transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
