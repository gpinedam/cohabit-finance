import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  deleteExpense,
  deleteExtraIncome,
  exportPersonalTracker,
  getPersonalSummary,
  getPersonalTracker,
  listPrivateExpenses,
  updateMe,
  upsertExtraIncome,
} from '../services/api'

const CATEGORY_EMOJI = {
  Supermercado: '🛍️', Alquiler: '🏠', Servicios: '⚡',
  Ocio: '🎬', Restaurante: '🍴', Transporte: '🚗', Salud: '🩺',
  Educación: '📚', Ropa: '👕', Belleza: '💅', Otros: '📦',
}
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmt(n) { return `S/ ${Number(n).toFixed(2)}` }
function fmtDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function SliderGoal({ label, emoji, pct, onPct, amount, color, saving }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-widest">{label}</p>
            <p className="text-white/80 text-xs">{fmt(amount)} / mes</p>
          </div>
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
      </div>
      <input
        type="range" min="0" max="50" step="5" value={pct}
        onChange={e => onPct(Number(e.target.value))}
        className="w-full accent-white h-1.5 rounded-full"
      />
      <div className="flex justify-between text-white/50 text-[10px] mt-0.5">
        {[0,10,20,30,40,50].map(v => <span key={v}>{v}%</span>)}
      </div>
      {saving && <p className="text-white/60 text-[11px] mt-1 text-right">Guardando…</p>}
    </div>
  )
}

function TrackerCard({ data, isCurrentMonth }) {
  const [open, setOpen] = useState(isCurrentMonth)
  const avail = Number(data.available)
  const isPos = avail >= 0
  const totalSpent = Number(data.shared_spent) + Number(data.private_spent)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase">{MONTH_SHORT[data.month - 1]}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800">{MONTH_NAMES[data.month - 1]} {data.year}</p>
              {isCurrentMonth && (
                <span className="text-[9px] font-bold bg-brand-50 text-brand-600 border border-brand-100 rounded-full px-1.5 py-0.5">ACTUAL</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Ingresos {fmt(data.income_total)} · Gastos {fmt(totalSpent)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold tabular-nums ${isPos ? 'text-emerald-600' : 'text-rose-500'}`}>
            {isPos ? '+' : ''}{fmt(avail)}
          </span>
          <svg className={`w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-50">
          {[
            { label: '+ Ingreso base',      value: data.income_base,       color: 'text-slate-700' },
            ...(Number(data.extra_income) > 0
              ? [{ label: '+ Ingreso extra', value: data.extra_income, color: 'text-emerald-600' }]
              : []),
            { label: '− Gastos compartidos', value: data.shared_spent,    color: 'text-slate-500' },
            { label: '− Gastos personales',  value: data.private_spent,   color: 'text-slate-500' },
            { label: `− Ahorro (${data.savings_goal_pct}%)`,     value: data.savings_reserved,   color: 'text-violet-500' },
            { label: `− Emergencia (${data.emergency_fund_pct}%)`, value: data.emergency_reserved, color: 'text-amber-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0">
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-xs font-semibold tabular-nums ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrackerList({ visibleMonths, hiddenMonths, currentYear, currentMonth }) {
  const [showHidden, setShowHidden] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {visibleMonths.map(m => (
        <TrackerCard
          key={`${m.year}-${m.month}`}
          data={m}
          isCurrentMonth={m.year === currentYear && m.month === currentMonth}
        />
      ))}

      {hiddenMonths.length > 0 && (
        <>
          <button
            onClick={() => setShowHidden(v => !v)}
            className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showHidden ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            {showHidden
              ? 'Ocultar meses anteriores'
              : `Ver ${hiddenMonths.length} mes${hiddenMonths.length > 1 ? 'es' : ''} anterior${hiddenMonths.length > 1 ? 'es' : ''} sin actividad`}
          </button>
          {showHidden && hiddenMonths.map(m => (
            <div key={`${m.year}-${m.month}`}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">{MONTH_SHORT[m.month - 1]}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{MONTH_NAMES[m.month - 1]} {m.year}</p>
                  <p className="text-xs text-slate-400">Sin actividad registrada</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">—</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default function Personal() {
  const { user, coupleId, setUser } = useAuth()
  const now = new Date()

  const [summary,   setSummary]   = useState(null)
  const [expenses,  setExpenses]  = useState([])
  const [tracker,   setTracker]   = useState([])
  const [loading,   setLoading]   = useState(true)

  // Breakdown collapse
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  // Extra income state
  const [editingExtra,  setEditingExtra]  = useState(false)
  const [extraForm,     setExtraForm]     = useState({ amount: '', note: '' })
  const [savingExtra,   setSavingExtra]   = useState(false)
  const [deletingExtra, setDeletingExtra] = useState(false)

  // Tracker export
  const [exporting, setExporting] = useState(false)

  const [savingsPct,   setSavingsPct]   = useState(user?.savings_goal_pct ?? 0)
  const [emergencyPct, setEmergencyPct] = useState(user?.emergency_fund_pct ?? 0)
  const [savingSaving,    setSavingSaving]    = useState(false)
  const [savingEmergency, setSavingEmergency] = useState(false)

  const debounceS = useRef(null)
  const debounceE = useRef(null)

  const loadData = () => {
    if (!coupleId) return
    Promise.all([
      getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1),
      listPrivateExpenses(0, 100),
      getPersonalTracker(coupleId),
    ])
      .then(([s, e, t]) => {
        setSummary(s.data)
        setExpenses(e.data)
        setTracker(t.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [coupleId])

  useEffect(() => {
    if (user?.savings_goal_pct   != null) setSavingsPct(user.savings_goal_pct)
    if (user?.emergency_fund_pct != null) setEmergencyPct(user.emergency_fund_pct)
  }, [user?.savings_goal_pct, user?.emergency_fund_pct])

  // Sync extra income form when summary loads
  useEffect(() => {
    if (summary && Number(summary.extra_income) > 0) {
      setExtraForm({ amount: String(summary.extra_income), note: summary.extra_income_note || '' })
    }
  }, [summary?.extra_income])

  const handleSavingsChange = (n) => {
    setSavingsPct(n)
    clearTimeout(debounceS.current)
    debounceS.current = setTimeout(async () => {
      setSavingSaving(true)
      try {
        const res = await updateMe({ savings_goal_pct: n })
        if (setUser) setUser(res.data)
        const r = await getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1)
        setSummary(r.data)
        const t = await getPersonalTracker(coupleId)
        setTracker(t.data)
      } finally { setSavingSaving(false) }
    }, 600)
  }

  const handleEmergencyChange = (n) => {
    setEmergencyPct(n)
    clearTimeout(debounceE.current)
    debounceE.current = setTimeout(async () => {
      setSavingEmergency(true)
      try {
        const res = await updateMe({ emergency_fund_pct: n })
        if (setUser) setUser(res.data)
        const r = await getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1)
        setSummary(r.data)
        const t = await getPersonalTracker(coupleId)
        setTracker(t.data)
      } finally { setSavingEmergency(false) }
    }, 600)
  }

  const handleSaveExtra = async () => {
    const amt = parseFloat(extraForm.amount)
    if (isNaN(amt) || amt <= 0) return
    setSavingExtra(true)
    try {
      await upsertExtraIncome({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        amount: amt,
        note: extraForm.note || null,
      })
      setEditingExtra(false)
      const [s, t] = await Promise.all([
        getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1),
        getPersonalTracker(coupleId),
      ])
      setSummary(s.data)
      setTracker(t.data)
    } finally { setSavingExtra(false) }
  }

  const handleDeleteExtra = async () => {
    setDeletingExtra(true)
    try {
      await deleteExtraIncome(now.getFullYear(), now.getMonth() + 1)
      setExtraForm({ amount: '', note: '' })
      setEditingExtra(false)
      const [s, t] = await Promise.all([
        getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1),
        getPersonalTracker(coupleId),
      ])
      setSummary(s.data)
      setTracker(t.data)
    } finally { setDeletingExtra(false) }
  }

  const handleExportTracker = async () => {
    setExporting(true)
    try {
      const res = await exportPersonalTracker(coupleId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'cohabit-personal.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  // Private expenses grouped by category this month
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const byCategory = {}
  let privateMonthTotal = 0
  for (const e of thisMonthExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.total_amount)
    privateMonthTotal += Number(e.total_amount)
  }

  const income       = Number(summary?.income ?? user?.income ?? 0)
  const incomeBase   = Number(summary?.income_base ?? user?.income ?? 0)
  const extraIncome  = Number(summary?.extra_income ?? 0)
  const savingsAmt   = income * savingsPct / 100
  const emergencyAmt = income * emergencyPct / 100
  const available    = summary?.available ?? (income - (summary?.shared_spent ?? 0) - (summary?.private_spent ?? 0) - savingsAmt - emergencyAmt)
  const isPositive   = Number(available) >= 0
  const hasExtra     = extraIncome > 0

  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
        <p className="text-xs text-slate-400 mt-0.5">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* ── Financial breakdown ── */}
      <div className="mx-4 mt-4 bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Available hero — tap to expand/collapse detail */}
        <button
          onClick={() => setBreakdownOpen(v => !v)}
          className="w-full text-left"
        >
          <div className={`px-5 py-4 ${isPositive ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-0.5 ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  Disponible este mes
                </p>
                <p className={`text-3xl font-bold tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {loading ? '—' : fmt(available)}
                </p>
                {!isPositive && !loading && (
                  <p className="text-xs text-rose-400 mt-0.5">Tus gastos y reservas superan tu ingreso</p>
                )}
              </div>
              <div className={`mt-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
              }`}>
                <svg className={`w-4 h-4 transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
            {!breakdownOpen && !loading && (
              <div className="flex gap-3 mt-2.5">
                <span className="text-[11px] text-slate-500 bg-white/60 rounded-full px-2 py-0.5">↓ {fmt(Number(summary?.shared_spent ?? 0) + Number(summary?.private_spent ?? 0))} gastos</span>
                <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                  isPositive ? 'text-emerald-700 bg-white/60' : 'text-rose-500 bg-white/60'
                }`}>↓ {fmt(savingsAmt + emergencyAmt)} reservado</span>
              </div>
            )}
          </div>
        </button>

        {/* Collapsible detail rows */}
        {breakdownOpen && (
          <>
            {/* Income base row */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
              <p className="text-sm text-slate-500">Ingreso mensual</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{fmt(incomeBase)}</p>
            </div>

            {/* Extra income row — inline editor */}
            {!editingExtra && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                {hasExtra ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-emerald-600 font-medium">💰 Ingreso extra</p>
                      {summary?.extra_income_note && (
                        <span className="text-[11px] text-slate-400 italic truncate max-w-[100px]">· {summary.extra_income_note}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums text-emerald-600">+ {fmt(extraIncome)}</p>
                      <button
                        onClick={() => { setExtraForm({ amount: String(extraIncome), note: summary?.extra_income_note || '' }); setEditingExtra(true) }}
                        className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={handleDeleteExtra}
                        disabled={deletingExtra}
                        className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-40"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingExtra(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 transition-colors py-0.5"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Añadir ingreso extra este mes
                  </button>
                )}
              </div>
            )}

            {/* Inline extra income editor */}
            {editingExtra && (
              <div className="px-5 py-4 border-t border-slate-50 bg-brand-50/40 flex flex-col gap-3">
                <p className="text-xs font-semibold text-brand-700">💰 Ingreso extra — {MONTH_NAMES[now.getMonth()]}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-500 mb-1 block">Monto (S/)</label>
                    <input
                      type="number" inputMode="decimal" step="0.01" min="0.01"
                      placeholder="0.00"
                      value={extraForm.amount}
                      onChange={e => setExtraForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      autoFocus
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-500 mb-1 block">Nota (opcional)</label>
                    <input
                      type="text"
                      placeholder="Bono, freelance…"
                      value={extraForm.note}
                      onChange={e => setExtraForm(f => ({ ...f, note: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingExtra(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveExtra}
                    disabled={savingExtra || !extraForm.amount}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {savingExtra ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : null}
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Remaining rows */}
            {[
              { label: 'Gastos compartidos (mi parte)', value: summary?.shared_spent ?? 0,  sign: '−', color: 'text-slate-600' },
              { label: 'Gastos personales',             value: summary?.private_spent ?? 0, sign: '−', color: 'text-slate-600' },
              { label: 'Ahorro reservado',              value: savingsAmt,                   sign: '−', color: 'text-violet-600' },
              { label: 'Fondo de emergencia',           value: emergencyAmt,                 sign: '−', color: 'text-amber-600' },
            ].map(({ label, value, sign, color }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`text-sm font-semibold tabular-nums ${color}`}>
                  {sign} {fmt(value)}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Goal sliders ── */}
      <div className="mx-4 mt-4 space-y-3">
        <SliderGoal
          label="Ahorro"
          emoji="🎯"
          pct={savingsPct}
          onPct={handleSavingsChange}
          amount={savingsAmt}
          color="bg-gradient-to-br from-violet-600 to-indigo-600"
          saving={savingSaving}
        />
        <SliderGoal
          label="Fondo de emergencia"
          emoji="🛡️"
          pct={emergencyPct}
          onPct={handleEmergencyChange}
          amount={emergencyAmt}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          saving={savingEmergency}
        />
        {(savingsPct + emergencyPct) > 70 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-base mt-0.5">⚠️</span>
            <p className="text-sm text-amber-700">
              Estás reservando el <strong>{savingsPct + emergencyPct}%</strong> de tu ingreso ({fmt(savingsAmt + emergencyAmt)}). Asegúrate de que te queda suficiente para gastos del día a día.
            </p>
          </div>
        )}
      </div>

      {/* ── Private expenses this month ── */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Gastos personales · este mes</p>
          <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(privateMonthTotal)}</span>
        </div>

        {Object.keys(byCategory).length > 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => {
                const pct = privateMonthTotal > 0 ? (total / privateMonthTotal) * 100 : 0
                return (
                  <div key={cat} className="px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CATEGORY_EMOJI[cat] || '📦'}</span>
                        <span className="text-sm font-medium text-slate-700">{cat}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(total)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100">
                      <div className="h-1 rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm font-semibold text-slate-700">Sin gastos personales este mes</p>
            <p className="text-xs text-slate-400 mt-1">Al registrar un gasto elige "Personal 🔒" para verlo aquí</p>
          </div>
        )}
      </div>

      {/* ── Full history list ── */}
      {expenses.length > 0 && (
        <div className="mx-4 mt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Todos los registros</p>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">
                  {CATEGORY_EMOJI[e.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {e.description || e.subcategory || e.category}
                  </p>
                  <p className="text-xs text-slate-400">{fmtDate(e.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                  {fmt(e.total_amount)}
                </span>
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar este gasto?')) return
                    try {
                      await deleteExpense(e.id)
                      loadData()
                    } catch {}
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-200 hover:text-rose-400 hover:bg-rose-50 transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Savings tracker ── */}
      <div className="mx-4 mt-6 mb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">📊 Historial financiero</p>
          <button
            onClick={handleExportTracker}
            disabled={exporting || tracker.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 transition-colors py-1 px-2.5 rounded-xl border border-brand-100 bg-brand-50 hover:bg-brand-100 active:scale-95"
          >
            {exporting ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            Excel
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : (() => {
          // Split: leading empty months (no activity, before first active month)
          const reversed = [...tracker].reverse() // most recent first
          const firstActiveIdx = reversed.findIndex(m => m.has_activity ||
            (m.year === now.getFullYear() && m.month === now.getMonth() + 1))
          const visibleMonths = firstActiveIdx === -1 ? reversed : reversed.slice(0, firstActiveIdx + 1)
          const hiddenMonths  = firstActiveIdx === -1 ? [] : reversed.slice(firstActiveIdx + 1)

          return (
            <TrackerList
              visibleMonths={visibleMonths}
              hiddenMonths={hiddenMonths}
              currentYear={now.getFullYear()}
              currentMonth={now.getMonth() + 1}
            />
          )
        })()}
      </div>

    </div>
  )
}


