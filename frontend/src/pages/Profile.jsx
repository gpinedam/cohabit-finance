import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteAvatar, getSecurityQuestionStatus, setSecurityQuestion, updateMe, uploadAvatar } from '../services/api'

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

const PRESET_QUESTIONS = [
  '¿Cuál es el apodo de tu pareja?',
  '¿Cuál es tu plato favorito?',
  '¿En qué ciudad se conocieron?',
  '¿Cuál es el nombre de tu mascota?',
]

export default function Profile() {
  const { user, setUser, logout, lockScreen } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [name, setName]         = useState(user?.name ?? '')
  const [income, setIncome]     = useState(user?.income ?? '')
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]           = useState('')

  const [sqStatus, setSqStatus]     = useState(null)
  const [sqOpen, setSqOpen]         = useState(false)
  const [sqSelected, setSqSelected] = useState(PRESET_QUESTIONS[0])
  const [sqCustom, setSqCustom]     = useState('')
  const [sqAnswer, setSqAnswer]     = useState('')
  const [sqSaving, setSqSaving]     = useState(false)

  useEffect(() => {
    getSecurityQuestionStatus()
      .then((r) => setSqStatus(r.data.has_question))
      .catch(() => setSqStatus(false))
  }, [])

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

  const normAnswer = (v) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  const handleSaveSQ = async () => {
    const question = sqSelected === 'CUSTOM' ? sqCustom.trim() : sqSelected
    const answer = sqAnswer.trim()
    if (!question || !answer) return
    setSqSaving(true)
    try {
      await setSecurityQuestion(question, answer)
      setSqStatus(true)
      setSqOpen(false)
      setSqAnswer('')
      setSqCustom('')
      flash('saved')
    } catch {
      flash('error')
    } finally { setSqSaving(false) }
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
        {/* Security question */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pregunta de seguridad</p>
            {sqStatus && !sqOpen && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
                Configurada
              </span>
            )}
          </div>
          {!sqOpen ? (
            <button
              onClick={() => setSqOpen(true)}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              {sqStatus ? 'Cambiar pregunta de seguridad' : 'Configurar pregunta de seguridad'}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Pregunta</label>
                <select
                  value={sqSelected}
                  onChange={(e) => setSqSelected(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm text-slate-800"
                >
                  {PRESET_QUESTIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                  <option value="CUSTOM">✏️ Escribir mi propia pregunta…</option>
                </select>
              </div>
              {sqSelected === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Tu pregunta personalizada</label>
                  <input
                    type="text"
                    value={sqCustom}
                    onChange={(e) => setSqCustom(e.target.value)}
                    placeholder="¿Cuál es…?"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Respuesta</label>
                <input
                  type="text"
                  value={sqAnswer}
                  onChange={(e) => setSqAnswer(normAnswer(e.target.value))}
                  placeholder="SOLO LETRAS Y NÚMEROS"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 text-sm font-semibold tracking-widest uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">Solo letras y números, sin tildes ni caracteres especiales</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setSqOpen(false); setSqAnswer(''); setSqCustom('') }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSQ}
                  disabled={sqSaving || !sqAnswer.trim() || (sqSelected === 'CUSTOM' && !sqCustom.trim())}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {sqSaving ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Goals summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Metas personales</p>
            <Link to="/personal" className="text-xs text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Editar →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="text-sm text-slate-700">Ahorro mensual</span>
              </div>
              <span className="text-sm font-bold text-violet-600">
                {user?.savings_goal_pct ?? 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span className="text-sm text-slate-700">Fondo de emergencia</span>
              </div>
              <span className="text-sm font-bold text-amber-600">
                {user?.emergency_fund_pct ?? 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Session actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sesión</p>
          <button
            onClick={lockScreen}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Bloquear pantalla
          </button>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            Cambiar de usuario
          </button>
        </div>

      </div>
    </div>
  )
}
