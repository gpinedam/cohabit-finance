import { useEffect, useRef, useState } from 'react'
import CATEGORIES from '../data/expense-categories.json'

// ── Split types: label + explanation shown on (?) ────────────────────────
const SPLIT_TYPES = [
  {
    value: 'proportional',
    label: 'Proporcional',
    desc:  'Cada uno paga según sus ingresos registrados.',
  },
  {
    value: 'equal',
    label: '50 / 50',
    desc:  'El gasto se divide en partes exactamente iguales.',
  },
  {
    value: 'on_me',
    label: 'On me',
    desc:  'Quien registra asume el 100% del gasto.',
  },
  {
    value: 'custom',
    label: 'Custom',
    desc:  'Tú defines libremente el porcentaje de cada persona.',
  },
]

export default function ExpenseForm({ members = [], onSubmit, loading }) {
  const amountRef = useRef(null)
  const [amount, setAmount]         = useState('')
  const [category, setCategory]     = useState('')
  const [subcategory, setSubcat]    = useState('')
  const [description, setDesc]      = useState('')
  const [splitType, setSplitType]   = useState('proportional')
  const [customPcts, setCustomPcts] = useState({})
  const [showSplitInfo, setShowSplitInfo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      category,
      subcategory: subcategory || null,
      description: description || null,
      total_amount: parseFloat(amount),
      split_type: splitType,
    }
    if (splitType === 'custom') {
      payload.custom_splits = members.map((m) => ({
        user_id: m.id,
        percentage: parseFloat(customPcts[m.id] || 0),
      }))
    }
    onSubmit(payload)
    setAmount(''); setCategory(''); setSubcat(''); setDesc('')
    setSplitType('proportional'); setCustomPcts({}); setShowSplitInfo(false)
    setTimeout(() => amountRef.current?.focus(), 80)
  }

  const customTotal = Object.values(customPcts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const canSubmit   = amount && parseFloat(amount) > 0 && category &&
    (splitType !== 'custom' || Math.abs(customTotal - 100) < 0.1)

  const activeSub   = CATEGORIES.find(c => c.name === category)?.subcategories ?? []
  const activeSplit = SPLIT_TYPES.find(t => t.value === splitType)

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Amount hero ──────────────────────────────────────────── */}
      <div
        className="px-5 pt-7 pb-6 text-center cursor-text"
        onClick={() => amountRef.current?.focus()}
      >
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
          ¿Cuánto fue?
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className={`text-2xl font-semibold transition-colors ${amount ? 'text-slate-400' : 'text-slate-200'}`}>
            S/
          </span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-transparent text-[64px] font-bold leading-none outline-none text-center text-slate-900 placeholder-slate-200 w-full max-w-[260px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100" />

      {/* ── Category horizontal scroll ───────────────────────────── */}
      <div className="py-5">
        <p className="px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3.5">
          {category || 'Categoría'}
        </p>
        <div className="px-4 flex gap-2.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.name}
              onClick={() => { setCategory(c.name); setSubcat('') }}
              className={`flex flex-col items-center shrink-0 w-[68px] pt-3 pb-2.5 rounded-2xl border transition-all duration-150 active:scale-95 ${
                category === c.name
                  ? 'bg-brand-600 border-brand-600 shadow-sm shadow-brand-600/30'
                  : 'bg-slate-50 border-transparent hover:border-slate-200'
              }`}
            >
              <span className="text-[26px] leading-none">{c.emoji}</span>
              <span className={`text-[10px] font-semibold mt-2 leading-tight text-center ${
                category === c.name ? 'text-white' : 'text-slate-500'
              }`}>
                {c.short}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Subcategory ──────────────────────────────────────────── */}
      {category && activeSub.length > 0 && (
        <>
          <div className="h-px bg-slate-100" />
          <div className="px-4 py-3.5 flex gap-2 overflow-x-auto no-scrollbar">
            {activeSub.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSubcat(subcategory === s ? '' : s)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                  subcategory === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Split type ───────────────────────────────────────────── */}
      <div className="h-px bg-slate-100" />
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">División</p>
          <button
            type="button"
            onClick={() => setShowSplitInfo(v => !v)}
            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
              showSplitInfo ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
            }`}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </button>
        </div>

        <div className="flex gap-1.5">
          {SPLIT_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setSplitType(t.value)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-all active:scale-[0.97] leading-tight ${
                splitType === t.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Info card — shows description of selected split type */}
        {showSplitInfo && activeSplit && (
          <div className="mt-3 px-3.5 py-2.5 bg-brand-50 border border-brand-100 rounded-xl">
            <p className="text-[11px] font-bold text-brand-700 mb-0.5">{activeSplit.label}</p>
            <p className="text-[11px] text-brand-600 leading-snug">{activeSplit.desc}</p>
          </div>
        )}
      </div>

      {/* ── Custom split ─────────────────────────────────────────── */}
      {splitType === 'custom' && members.length > 0 && (
        <>
          <div className="h-px bg-slate-100" />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Porcentajes</p>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                Math.abs(customTotal - 100) < 0.1
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-500'
              }`}>
                {customTotal.toFixed(0)}% / 100%
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{m.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={customPcts[m.id] ?? ''}
                      onChange={(e) => setCustomPcts((p) => ({ ...p, [m.id]: e.target.value }))}
                      placeholder="0"
                      className="w-14 text-right py-1 px-2 rounded-lg bg-white border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                    />
                    <span className="text-slate-400 text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Descripción ──────────────────────────────────────────── */}
      <div className="h-px bg-slate-100" />
      <div className="px-5 py-3.5 flex items-center gap-2.5">
        <svg className="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <input
          type="text"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descripción (opcional)"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-300 outline-none"
        />
      </div>

      {/* ── Submit ───────────────────────────────────────────────── */}
      <div className="px-4 pt-1 pb-5">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-[15px] rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm shadow-brand-600/20"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Registrar gasto
            </>
          )}
        </button>
      </div>
    </form>
  )
}
