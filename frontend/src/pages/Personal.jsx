import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPersonalSummary, listPrivateExpenses, updateMe } from '../services/api'

const CATEGORY_EMOJI = {
  Supermercado: '🛍️', Alquiler: '🏠', Servicios: '⚡',
  Ocio: '🎬', Restaurante: '🍴', Transporte: '🚗', Salud: '🩺',
  Educación: '📚', Ropa: '👕', Belleza: '💅', Otros: '📦',
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) { return `S/ ${Number(n).toFixed(2)}` }
function fmtDate(iso) {
  const d = new Date(iso)
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${M[d.getMonth()]}`
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

export default function Personal() {
  const { user, coupleId, setUser } = useAuth()
  const now = new Date()

  const [summary,   setSummary]   = useState(null)
  const [expenses,  setExpenses]  = useState([])
  const [loading,   setLoading]   = useState(true)

  const [savingsPct,   setSavingsPct]   = useState(user?.savings_goal_pct ?? 0)
  const [emergencyPct, setEmergencyPct] = useState(user?.emergency_fund_pct ?? 0)
  const [savingSaving,     setSavingSaving]     = useState(false)
  const [savingEmergency,  setSavingEmergency]  = useState(false)

  const debounceS = useRef(null)
  const debounceE = useRef(null)

  const loadData = () => {
    if (!coupleId) return
    Promise.all([
      getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1),
      listPrivateExpenses(0, 100),
    ])
      .then(([s, e]) => { setSummary(s.data); setExpenses(e.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [coupleId])

  // Keep sliders in sync if user refreshes from another tab
  useEffect(() => {
    if (user?.savings_goal_pct   != null) setSavingsPct(user.savings_goal_pct)
    if (user?.emergency_fund_pct != null) setEmergencyPct(user.emergency_fund_pct)
  }, [user?.savings_goal_pct, user?.emergency_fund_pct])

  const handleSavingsChange = (n) => {
    setSavingsPct(n)
    clearTimeout(debounceS.current)
    debounceS.current = setTimeout(async () => {
      setSavingSaving(true)
      try {
        const res = await updateMe({ savings_goal_pct: n })
        if (setUser) setUser(res.data)
        await getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1)
          .then(r => setSummary(r.data)).catch(() => {})
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
        await getPersonalSummary(coupleId, now.getFullYear(), now.getMonth() + 1)
          .then(r => setSummary(r.data)).catch(() => {})
      } finally { setSavingEmergency(false) }
    }, 600)
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
  const savingsAmt   = income * savingsPct / 100
  const emergencyAmt = income * emergencyPct / 100
  const available    = summary?.available ?? (income - (summary?.shared_spent ?? 0) - (summary?.private_spent ?? 0) - savingsAmt - emergencyAmt)
  const isPositive   = available >= 0

  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
        <p className="text-xs text-slate-400 mt-0.5">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* ── Financial breakdown ── */}
      <div className="mx-4 mt-4 bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Available hero */}
        <div className={`px-5 py-4 ${isPositive ? 'bg-emerald-50' : 'bg-rose-50'}`}>
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

        {/* Breakdown rows */}
        {[
          { label: 'Ingreso mensual',      value: income,                     sign: '+', color: 'text-slate-900' },
          { label: 'Gastos compartidos (mi parte)', value: summary?.shared_spent ?? 0,  sign: '−', color: 'text-slate-600' },
          { label: 'Gastos personales',    value: summary?.private_spent ?? 0, sign: '−', color: 'text-slate-600' },
          { label: 'Ahorro reservado',     value: savingsAmt,                  sign: '−', color: 'text-violet-600' },
          { label: 'Fondo de emergencia',  value: emergencyAmt,                sign: '−', color: 'text-amber-600' },
        ].map(({ label, value, sign, color }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`text-sm font-semibold tabular-nums ${color}`}>
              {sign === '+' ? '' : sign + ' '}{fmt(value)}
            </p>
          </div>
        ))}
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
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-violet-500 animate-spin" />
              </div>
            ) : expenses.map(e => (
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
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

