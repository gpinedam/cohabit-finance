import { useState } from 'react'

const CATEGORIES = [
  { name: 'Supermercado', emoji: '🛍️' },
  { name: 'Alquiler',     emoji: '🏠' },
  { name: 'Servicios',    emoji: '⚡' },
  { name: 'Ocio',         emoji: '🎬' },
  { name: 'Restaurante',  emoji: '🍴' },
  { name: 'Transporte',   emoji: '🚗' },
  { name: 'Salud',        emoji: '🩺' },
  { name: 'Otros',        emoji: '📦' },
]

const SUBCATEGORIES = {
  Supermercado: ['Semanal', 'Mensual', 'Limpieza'],
  Restaurante:  ['Cena', 'Almuerzo', 'Delivery'],
  Transporte:   ['Gasolina', 'Uber', 'Bus', 'Taxi'],
  Ocio:         ['Cinema', 'Concierto', 'Viaje'],
  Servicios:    ['Luz', 'Agua', 'Internet', 'Gas'],
  Salud:        ['Farmacia', 'Médico', 'Gimnasio'],
  Alquiler:     ['Mensual', 'Cuota extra'],
  Otros:        ['Varios'],
}

const SPLIT_TYPES = [
  { value: 'proportional', label: 'Proporcional', desc: 'Según ingresos' },
  { value: 'equal',        label: '50 / 50',      desc: 'Partes iguales' },
  { value: 'on_me',        label: 'Lo pago yo',   desc: '100% al pagador' },
  { value: 'custom',       label: 'Personalizado', desc: 'Tú decides %' },
]

export default function ExpenseForm({ members = [], onSubmit, loading }) {
  const [amount, setAmount]         = useState('')
  const [category, setCategory]     = useState('')
  const [subcategory, setSubcat]    = useState('')
  const [description, setDesc]      = useState('')
  const [splitType, setSplitType]   = useState('proportional')
  const [customPcts, setCustomPcts] = useState({})

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
    setSplitType('proportional'); setCustomPcts({})
  }

  const customTotal = Object.values(customPcts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const canSubmit = amount && category && (splitType !== 'custom' || Math.abs(customTotal - 100) < 0.1)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Amount — dark card ─────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl px-5 pt-4 pb-5">
        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-2">Importe total</p>
        <div className="flex items-baseline gap-2">
          <span className="text-slate-500 text-xl font-semibold">S/</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 min-w-0 bg-transparent text-5xl font-bold text-white placeholder-slate-700 outline-none"
          />
        </div>
      </div>

      {/* ── Category ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Categoría</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.name}
              onClick={() => { setCategory(c.name); setSubcat('') }}
              className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all duration-100 active:scale-95 ${
                category === c.name
                  ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-lg leading-none">{c.emoji}</span>
              <span className={`text-[10px] font-semibold mt-1.5 text-center leading-tight ${
                category === c.name ? 'text-brand-700' : 'text-slate-500'
              }`}>
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Subcategory ──────────────────────────────────────────────────── */}
      {category && SUBCATEGORIES[category] && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Subcategoría</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {SUBCATEGORIES[category].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSubcat(subcategory === s ? '' : s)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  subcategory === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Split type ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">División del gasto</p>
        <div className="grid grid-cols-2 gap-2">
          {SPLIT_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setSplitType(t.value)}
              className={`flex flex-col items-start p-3.5 rounded-xl border transition-all duration-100 active:scale-[0.98] text-left ${
                splitType === t.value
                  ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className={`text-[13px] font-semibold leading-tight ${splitType === t.value ? 'text-brand-700' : 'text-slate-800'}`}>
                {t.label}
              </span>
              <span className={`text-[11px] mt-0.5 ${splitType === t.value ? 'text-brand-500' : 'text-slate-400'}`}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom percentages ──────────────────────────────────────────── */}
      {splitType === 'custom' && members.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Porcentajes</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              Math.abs(customTotal - 100) < 0.1
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500'
            }`}>
              {customTotal.toFixed(0)}% / 100%
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">{m.name}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={customPcts[m.id] ?? ''}
                    onChange={(e) => setCustomPcts((p) => ({ ...p, [m.id]: e.target.value }))}
                    placeholder="0"
                    className="w-16 text-right py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
          Descripción <span className="normal-case font-normal text-slate-400">(opcional)</span>
        </p>
        <input
          type="text"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="¿En qué gastaste?"
          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
        />
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-1"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Registrando…
          </>
        ) : (
          'Registrar gasto'
        )}
      </button>
    </form>
  )
}
