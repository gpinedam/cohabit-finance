import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createRecurringService,
  deleteRecurringService,
  listRecurringServices,
  updateRecurringService,
} from '../services/api'
import api from '../services/api'

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)
const CATEGORY_OPTIONS = [
  'Servicios', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento',
  'Educación', 'Seguros', 'Suscripciones', 'Otros',
]

const EMPTY_FORM = {
  name: '',
  estimated_amount: '',
  assigned_to_user_id: '',
  category: '',
  day_of_month: 1,
  icon: '',
  starts_at: '',
  ends_at: '',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function Recurring() {
  const { coupleId } = useAuth()
  const [services,   setServices]   = useState([])
  const [members,    setMembers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null) // service id being edited
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const load = async () => {
    if (!coupleId) return
    try {
      const [svcs, balance] = await Promise.all([
        listRecurringServices(coupleId),
        api.get('/reports/balance', { params: { couple_id: coupleId } }),
      ])
      setServices(svcs.data)
      const names = balance.data.summary?.member_names || {}
      setMembers(Object.entries(names).map(([id, name]) => ({ id: Number(id), name })))
    } catch {
      setError('No se pudieron cargar los servicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [coupleId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, starts_at: today(), assigned_to_user_id: members[0]?.id ?? '' })
    setShowModal(true)
  }

  const openEdit = (svc) => {
    setEditing(svc.id)
    setForm({
      name: svc.name,
      estimated_amount: String(svc.estimated_amount),
      assigned_to_user_id: svc.assigned_to_user_id,
      category: svc.category || '',
      day_of_month: svc.day_of_month,
      icon: svc.icon || '',
      starts_at: svc.starts_at,
      ends_at: svc.ends_at || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        couple_id: coupleId,
        name: form.name.trim(),
        estimated_amount: parseFloat(form.estimated_amount),
        assigned_to_user_id: Number(form.assigned_to_user_id),
        category: form.category || null,
        day_of_month: Number(form.day_of_month),
        icon: form.icon.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at || null,
      }
      if (editing) {
        await updateRecurringService(editing, payload)
      } else {
        await createRecurringService(payload)
      }
      setShowModal(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el servicio')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar este servicio? Ya no generará entradas nuevas.')) return
    try {
      await deleteRecurringService(id)
      await load()
    } catch {
      setError('Error al desactivar el servicio')
    }
  }

  const handleReactivate = async (id) => {
    try {
      await updateRecurringService(id, { is_active: true })
      await load()
    } catch {
      setError('Error al reactivar el servicio')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  if (loading) return (
    <div className="pt-20 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  )

  const active   = services.filter(s => s.is_active)
  const inactive = services.filter(s => !s.is_active)

  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos fijos</h1>
          <p className="text-xs text-slate-400 mt-0.5">Servicios recurrentes mensuales</p>
        </div>
        <button
          onClick={openCreate}
          className="w-9 h-9 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Active services */}
      {active.length === 0 ? (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold text-slate-700 text-sm">No tienes servicios fijos</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Agrega la luz, el agua, Netflix…</p>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
          >
            + Añadir servicio
          </button>
        </div>
      ) : (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
          {active.map((svc, i) => (
            <div key={svc.id} className={`px-4 py-4 ${i < active.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                  {svc.icon || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 text-sm truncate">{svc.name}</p>
                    <span className="font-bold text-slate-900 tabular-nums text-sm shrink-0">
                      S/ {Number(svc.estimated_amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {svc.assigned_to_user_name} · día {svc.day_of_month}
                    {svc.category && ` · ${svc.category}`}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Desde {svc.starts_at}{svc.ends_at ? ` hasta ${svc.ends_at}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pl-13">
                <button
                  onClick={() => openEdit(svc)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeactivate(svc.id)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 text-rose-400 text-xs font-semibold hover:bg-rose-50 hover:border-rose-200 transition-colors"
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive services (collapsible summary) */}
      {inactive.length > 0 && (
        <div className="mx-4 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Inactivos ({inactive.length})</p>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {inactive.map((svc, i) => (
              <div key={svc.id} className={`flex items-center gap-3 px-4 py-3 ${i < inactive.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0 opacity-50">
                  {svc.icon || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-400 truncate">{svc.name}</p>
                  <p className="text-xs text-slate-300">S/ {Number(svc.estimated_amount).toFixed(2)} · día {svc.day_of_month}</p>
                </div>
                <button
                  onClick={() => handleReactivate(svc.id)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                >
                  Activar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 z-10">
              <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-4" />
              <h2 className="font-bold text-slate-900 text-lg">
                {editing ? 'Editar servicio' : 'Nuevo servicio fijo'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="px-5 py-5 space-y-4 pb-10">

              {/* Name + icon row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Nombre</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Ej. Luz, Netflix, Alquiler…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Emoji</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={form.icon}
                    onChange={e => set('icon', e.target.value)}
                    placeholder="💡"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Monto estimado (S/)</label>
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={form.estimated_amount}
                  onChange={e => set('estimated_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
              </div>

              {/* Assigned to */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Asignado a</label>
                <select
                  required
                  value={form.assigned_to_user_id}
                  onChange={e => set('assigned_to_user_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                >
                  <option value="">Seleccionar persona</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Category + day */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Día del mes</label>
                  <select
                    value={form.day_of_month}
                    onChange={e => set('day_of_month', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                  <input
                    required
                    type="date"
                    value={form.starts_at}
                    onChange={e => set('starts_at', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    Fecha fin <span className="normal-case font-normal text-slate-400">(opc.)</span>
                  </label>
                  <input
                    type="date"
                    value={form.ends_at}
                    min={form.starts_at}
                    onChange={e => set('ends_at', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold text-[15px] rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                {saving
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : editing ? 'Guardar cambios' : 'Crear servicio'
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
