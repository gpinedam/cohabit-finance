import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deletePin, updateMe } from '../services/api'

export default function Profile() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [name, setName]     = useState(user?.name ?? '')
  const [income, setIncome] = useState(user?.income ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const r = await updateMe({ name, income: parseFloat(income) })
      setUser(r.data)
      setMsg('saved')
      setTimeout(() => setMsg(''), 2000)
    } catch {
      setMsg('error')
    } finally { setSaving(false) }
  }

  const handleDeletePin = async () => {
    if (!confirm('¿Eliminar tu PIN de acceso rápido?')) return
    try {
      await deletePin()
      localStorage.removeItem('pinEnabled')
      setMsg('saved')
      setTimeout(() => setMsg(''), 2000)
    } catch { setMsg('error') }
  }

  const pinEnabled = localStorage.getItem('pinEnabled') === 'true'

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">

      {/* Avatar header */}
      <div className="bg-slate-900 pt-8 pb-10 px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg shadow-brand-600/30 mb-3">
          {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
        <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-3">

        {/* Personal details */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Datos personales</p>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                <input
                  type="text"
                  value={user?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Ingreso mensual (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Usado para el split proporcional</p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4">
            {msg === 'saved' && (
              <p className="text-xs text-emerald-600 font-medium text-center mb-3">Cambios guardados</p>
            )}
            {msg === 'error' && (
              <p className="text-xs text-red-500 font-medium text-center mb-3">Error al guardar</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Guardando…
                </>
              ) : 'Guardar cambios'}
            </button>
          </div>
        </form>

        {/* PIN section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Acceso con PIN</p>
          {pinEnabled ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 mb-1">
                <svg className="w-4 h-4 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-brand-700">PIN de 6 dígitos activo</span>
              </div>
              <button
                onClick={() => navigate('/setup-pin')}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Cambiar PIN
              </button>
              <button
                onClick={handleDeletePin}
                className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                Eliminar PIN
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">Aún no tienes PIN configurado.</p>
              <button
                onClick={() => navigate('/setup-pin')}
                className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
              >
                Configurar PIN de acceso rápido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
