import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteAvatar, deletePin, updateMe, uploadAvatar } from '../services/api'

function Avatar({ user, size = 'lg' }) {
  const dim = size === 'lg' ? 'w-24 h-24 text-3xl rounded-3xl' : 'w-16 h-16 text-xl rounded-2xl'
  if (user?.avatar) {
    return (
      <img
        src={`/avatars/${user.avatar}`}
        alt={user.name}
        className={`${dim} object-cover bg-slate-200`}
      />
    )
  }
  return (
    <div className={`${dim} bg-brand-600 flex items-center justify-center text-white font-bold`}>
      {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [name, setName]         = useState(user?.name ?? '')
  const [income, setIncome]     = useState(user?.income ?? '')
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]           = useState('')

  const flash = (type) => { setMsg(type); setTimeout(() => setMsg(''), 2500) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await updateMe({ name, income: parseFloat(income) })
      setUser(r.data)
      flash('saved')
    } catch {
      flash('error')
    } finally { setSaving(false) }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await uploadAvatar(file)
      setUser(r.data)
      flash('saved')
    } catch {
      flash('error')
    } finally { setUploading(false); e.target.value = '' }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    try {
      const r = await deleteAvatar()
      setUser(r.data)
      flash('saved')
    } catch { flash('error') }
  }

  const handleDeletePin = async () => {
    if (!confirm('¿Eliminar tu PIN de acceso rápido?')) return
    try {
      await deletePin()
      localStorage.removeItem('pinEnabled')
      flash('saved')
    } catch { flash('error') }
  }

  const pinEnabled = localStorage.getItem('pinEnabled') === 'true'

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">

      {/* Avatar header */}
      <div className="bg-slate-900 pt-8 pb-12 px-5 flex flex-col items-center">
        {/* Avatar clickable */}
        <div className="relative mb-4">
          <Avatar user={user} size="lg" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-brand-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
          >
            {uploading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
        {user?.avatar && (
          <button
            onClick={handleDeleteAvatar}
            className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Eliminar foto
          </button>
        )}
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-3">

        {/* Feedback toast */}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center animate-slide-up ${
            msg === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {msg === 'saved' ? 'Cambios guardados' : 'Error al guardar'}
          </div>
        )}

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
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {saving ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando…</>
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
