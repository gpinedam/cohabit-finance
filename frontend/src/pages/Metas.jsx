import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addDeposit, createGoal, deleteDeposit, deleteGoal, listGoals, updateGoal } from '../services/api'

const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmt(n) { return `S/ ${Number(n).toFixed(2)}` }
function fmtDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

const TYPE_CONFIG = {
  savings:   { label: 'Ahorro',            emoji: '🎯', bg: 'from-violet-600 to-indigo-600', light: 'bg-violet-50 text-violet-700 border-violet-100' },
  emergency: { label: 'Fondo emergencia',  emoji: '🛡️', bg: 'from-amber-500 to-orange-500',  light: 'bg-amber-50 text-amber-700 border-amber-100'   },
}

const GOAL_COLORS = [
  { key: 'violet',  gradient: 'from-violet-600 to-indigo-600' },
  { key: 'emerald', gradient: 'from-emerald-500 to-teal-500'  },
  { key: 'amber',   gradient: 'from-amber-500 to-orange-500'  },
  { key: 'rose',    gradient: 'from-rose-500 to-pink-500'     },
  { key: 'blue',    gradient: 'from-blue-500 to-cyan-500'     },
  { key: 'slate',   gradient: 'from-slate-600 to-slate-500'   },
]
const colorGradient = (key) =>
  GOAL_COLORS.find(c => c.key === key)?.gradient ?? 'from-violet-600 to-indigo-600'

/* ── Goal form sheet ───────────────────────────────────────────────── */
function GoalSheet({ coupleId, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    icon: existing?.icon ?? '',
    goal_type: existing?.goal_type ?? 'savings',
    target: existing?.target ? String(existing.target) : '',
    color: existing?.color ?? 'violet',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Escribe un nombre para la meta'); return }
    const t = parseFloat(form.target)
    if (isNaN(t) || t <= 0) { setError('El objetivo debe ser mayor a 0'); return }
    setSaving(true); setError('')
    try {
      let result
      if (existing) {
        result = await updateGoal(existing.id, { name: form.name, icon: form.icon || null, goal_type: form.goal_type, target: t, color: form.color })
      } else {
        result = await createGoal({ couple_id: coupleId, name: form.name, icon: form.icon || null, goal_type: form.goal_type, target: t, color: form.color })
      }
      onSaved(result.data)
    } catch {
      setError('No se pudo guardar la meta')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-10 max-h-[90vh] overflow-y-auto flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-1" />
        <h3 className="font-bold text-slate-900 text-base">{existing ? 'Editar meta' : 'Nueva meta compartida'}</h3>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Tipo</label>
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => set('goal_type', k)}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  form.goal_type === k ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                <span>{v.emoji}</span>{v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nombre</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Vacaciones, depa, fondo…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>

        {/* Icon picker */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Ícono</label>
          <div className="grid grid-cols-8 gap-1.5">
            {['🎯','🏖️','🏠','🚗','🛡️','✈️','💍','📱','🏋️','🎓','🍼','🐶','💻','🎸','⛷️','🌊'].map(e => (
              <button key={e} type="button" onClick={() => set('icon', e)}
                className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  form.icon === e
                    ? 'bg-brand-600 scale-110 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 active:scale-95'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Objetivo (S/)</label>
          <input type="number" inputMode="decimal" step="1" min="1" value={form.target}
            onChange={e => set('target', e.target.value)}
            placeholder="10000"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Color</label>
          <div className="flex gap-2">
            {GOAL_COLORS.map(c => (
              <button key={c.key} onClick={() => set('color', c.key)}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.gradient} transition-all ${
                  form.color === c.key ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'opacity-60 hover:opacity-100'
                }`} />
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex gap-3 mt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {existing ? 'Guardar' : 'Crear meta'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Deposit sheet ─────────────────────────────────────────────────── */
function DepositSheet({ goal, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Ingresa un monto válido'); return }
    setSaving(true); setError('')
    try {
      const result = await addDeposit(goal.id, { amount: amt, note: note || null })
      onSaved(result.data)
    } catch {
      setError('No se pudo registrar el aporte')
    } finally { setSaving(false) }
  }

  const remaining = Math.max(0, Number(goal.target) - Number(goal.accumulated))

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-10 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-1" />
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${colorGradient(goal.color)} flex items-center justify-center text-xl`}>
            {goal.icon || (goal.goal_type === 'emergency' ? '🛡️' : '🎯')}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{goal.name}</h3>
            <p className="text-xs text-slate-400">Faltan {fmt(remaining)}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Monto del aporte (S/)</label>
          <input type="number" inputMode="decimal" step="0.01" min="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="500.00" autoFocus
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nota (opcional)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Ej: Ahorro del sueldo de marzo…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex gap-3 mt-1 pb-safe">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            Registrar aporte
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Goal card (expanded detail) ───────────────────────────────────── */
function GoalCard({ goal, onDeposit, onEdit, onDelete, onDeleteDeposit }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const tc = TYPE_CONFIG[goal.goal_type] ?? TYPE_CONFIG.savings
  const pct = Math.min(Number(goal.pct), 100)
  const accumulated = Number(goal.accumulated)
  const target = Number(goal.target)
  const remaining = Math.max(0, target - accumulated)
  const done = accumulated >= target

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la meta "${goal.name}"? Se perderán todos los aportes.`)) return
    setDeleting(true)
    try { await onDelete(goal.id) } finally { setDeleting(false) }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Card header — gradient banner */}
      <div className={`bg-gradient-to-br ${colorGradient(goal.color)} px-4 pt-4 pb-5`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{goal.icon || tc.emoji}</span>
            <div>
              <p className="text-white font-bold text-base leading-tight">{goal.name}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tc.light}`}>
                {tc.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onEdit(goal)}
              className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-red-400/60 transition-colors disabled:opacity-40">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-1.5">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">{pct.toFixed(0)}%</span>
            <span className="text-white/80 text-xs tabular-nums">{fmt(accumulated)} / {fmt(target)}</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {done ? (
          <p className="text-white text-xs font-semibold mt-1">🎉 ¡Meta alcanzada!</p>
        ) : (
          <p className="text-white/70 text-xs mt-1">Faltan {fmt(remaining)}</p>
        )}
      </div>

      {/* This month + actions */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Aportado este mes</p>
          <p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(goal.this_month)}</p>
        </div>
        <button
          onClick={() => onDeposit(goal)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Aportar
        </button>
      </div>

      {/* Deposit history toggle */}
      {goal.deposits.length > 0 && (
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
          <span>{open ? 'Ocultar historial' : `Ver ${goal.deposits.length} aporte${goal.deposits.length > 1 ? 's' : ''}`}</span>
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      )}

      {open && (
        <div className="border-t border-slate-50">
          {goal.deposits.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-600">{d.user_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(d.amount)}</p>
                  {d.note && <p className="text-xs text-slate-400 truncate">· {d.note}</p>}
                </div>
                <p className="text-[11px] text-slate-400">{d.user_name} · {fmtDate(d.created_at)}</p>
              </div>
              <button onClick={() => onDeleteDeposit(goal.id, d.id)}
                className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors shrink-0">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function Metas() {
  const { coupleId } = useAuth()
  const [goals, setGoals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editGoal, setEditGoal]   = useState(null)
  const [depositGoal, setDepositGoal] = useState(null)

  const load = async () => {
    if (!coupleId) return
    try {
      const r = await listGoals(coupleId)
      setGoals(r.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [coupleId])

  const handleSaved = (updatedGoal) => {
    setGoals(prev => {
      const idx = prev.findIndex(g => g.id === updatedGoal.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = updatedGoal
        return next
      }
      return [...prev, updatedGoal]
    })
    setShowForm(false)
    setEditGoal(null)
  }

  const handleDeposited = (updatedGoal) => {
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g))
    setDepositGoal(null)
  }

  const handleDelete = async (goalId) => {
    await deleteGoal(goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
  }

  const handleDeleteDeposit = async (goalId, depositId) => {
    const r = await deleteDeposit(goalId, depositId)
    setGoals(prev => prev.map(g => g.id === goalId ? r.data : g))
  }

  const totalAccumulated = goals.reduce((s, g) => s + Number(g.accumulated), 0)
  const totalTarget = goals.reduce((s, g) => s + Number(g.target), 0)

  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Metas</h1>
          <p className="text-xs text-slate-400 mt-0.5">Ahorros compartidos en pareja</p>
        </div>
        <button
          onClick={() => { setEditGoal(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-2xl shadow-sm shadow-brand-600/20 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva meta
        </button>
      </div>

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="mx-4 mb-4 bg-slate-900 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1">Total acumulado</p>
            <p className="text-3xl font-bold text-white tabular-nums">{fmt(totalAccumulated)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1">Objetivo total</p>
            <p className="text-xl font-bold text-slate-300 tabular-nums">{fmt(totalTarget)}</p>
            {totalTarget > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{((totalAccumulated / totalTarget) * 100).toFixed(0)}% completado</p>
            )}
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="mx-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-bold text-slate-800 text-base mb-1">Sin metas aún</p>
            <p className="text-slate-400 text-sm mb-5">Crea vuestra primera meta — vacaciones, fondo de emergencia, lo que sea.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Crear primera meta
            </button>
          </div>
        ) : (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={setDepositGoal}
              onEdit={g => { setEditGoal(g); setShowForm(true) }}
              onDelete={handleDelete}
              onDeleteDeposit={handleDeleteDeposit}
            />
          ))
        )}
      </div>

      {/* Sheets */}
      {showForm && (
        <GoalSheet
          coupleId={coupleId}
          existing={editGoal}
          onClose={() => { setShowForm(false); setEditGoal(null) }}
          onSaved={handleSaved}
        />
      )}
      {depositGoal && (
        <DepositSheet
          goal={depositGoal}
          onClose={() => setDepositGoal(null)}
          onSaved={handleDeposited}
        />
      )}
    </div>
  )
}
