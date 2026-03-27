import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { deleteExpense, exportHistory, getHistory, getMonthly, listPrivateExpenses, updateExpense } from '../services/api'
import CATEGORIES_DATA from '../data/expense-categories.json'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const CATEGORIES  = CATEGORIES_DATA.map(c => c.name)
const CATEGORY_EMOJI = Object.fromEntries(CATEGORIES_DATA.map(c => [c.name, c.emoji]))

/* ── Edit bottom-sheet ─────────────────────────────────────────────── */
function EditSheet({ expense, onClose, onSaved }) {
  const [form, setForm] = useState({
    category:    expense.category,
    subcategory: expense.subcategory || '',
    description: expense.description || '',
    total_amount: String(expense.total_amount),
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const amt = parseFloat(form.total_amount)
    if (isNaN(amt) || amt <= 0) { setError('Monto inválido'); return }
    setSaving(true); setError('')
    try {
      const r = await updateExpense(expense.id, {
        category:    form.category,
        subcategory: form.subcategory || null,
        description: form.description || null,
        total_amount: amt,
      })
      onSaved(r.data)
    } catch {
      setError('No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl px-5 pt-4 pb-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-1" />
        <h3 className="font-bold text-slate-900 text-base">Editar gasto</h3>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => set('category', c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.category === c
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300'
                }`}
              >
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </div>

        {/* Subcategory */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Subcategoría (opcional)</label>
          <input
            type="text"
            value={form.subcategory}
            onChange={e => set('subcategory', e.target.value)}
            placeholder="ej. Frutas, Netflix…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Descripción (opcional)</label>
          <input
            type="text"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Nota sobre el gasto…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Monto (S/)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={form.total_amount}
            onChange={e => set('total_amount', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {error && <p className="text-xs text-rose-500 -mt-1">{error}</p>}

        <div className="flex gap-3 mt-1 pb-safe">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────── */
export default function History() {
  const { coupleId, mode } = useAuth()
  const [months,       setMonths]       = useState([])
  const [expanded,     setExpanded]     = useState(null)
  const [monthData,    setMonthData]    = useState({})
  const [loadingMonth, setLoadingMonth] = useState(null)
  const [loading,      setLoad]         = useState(true)
  const [exporting,    setExporting]    = useState(false)
  const [filterYear,   setFilterYear]   = useState(null)
  const [filterMonth,  setFilterMonth]  = useState(null)
  const [editingExp,   setEditingExp]   = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [privateAll,   setPrivateAll]   = useState([])

  /* ── data fetching ─────────────────────────────────────────────── */
  const loadHistory = () => {
    if (mode === 'private') {
      return listPrivateExpenses(0, 1000)
        .then(r => {
          setPrivateAll(r.data)
          // Build month summaries
          const byKey = {}
          for (const e of r.data) {
            const d = new Date(e.created_at)
            const key = `${d.getFullYear()}-${d.getMonth()+1}`
            if (!byKey[key]) byKey[key] = { year: d.getFullYear(), month: d.getMonth()+1, count: 0, total: 0 }
            byKey[key].count++
            byKey[key].total += Number(e.total_amount)
          }
          const sorted = Object.values(byKey).sort((a,b) => b.year - a.year || b.month - a.month)
          setMonths(sorted)
        })
        .catch(() => {})
    }
    return getHistory(coupleId).then(r => setMonths(r.data)).catch(() => {})
  }

  useEffect(() => {
    if (!coupleId) return
    setMonths([]); setMonthData({}); setExpanded(null)
    loadHistory().finally(() => setLoad(false))
  }, [coupleId, mode])

  const toggle = async (year, month) => {
    const key = `${year}-${month}`
    if (expanded === key) { setExpanded(null); return }
    setExpanded(key)
    if (!monthData[key]) {
      if (mode === 'private') {
        const expenses = privateAll.filter(e => {
          const d = new Date(e.created_at)
          return d.getFullYear() === year && d.getMonth()+1 === month
        })
        const by_category = {}
        for (const e of expenses) {
          by_category[e.category] = (by_category[e.category] || 0) + Number(e.total_amount)
        }
        setMonthData(d => ({ ...d, [key]: { expenses, by_category } }))
      } else {
        setLoadingMonth(key)
        try {
          const r = await getMonthly(coupleId, year, month)
          setMonthData(d => ({ ...d, [key]: r.data }))
        } finally { setLoadingMonth(null) }
      }
    }
  }

  const refreshMonth = async (year, month) => {
    if (mode === 'private') {
      const r = await listPrivateExpenses(0, 1000)
      setPrivateAll(r.data)
      const expenses = r.data.filter(e => {
        const d = new Date(e.created_at)
        return d.getFullYear() === year && d.getMonth()+1 === month
      })
      const by_category = {}
      for (const e of expenses) {
        by_category[e.category] = (by_category[e.category] || 0) + Number(e.total_amount)
      }
      const key = `${year}-${month}`
      setMonthData(d => ({ ...d, [key]: { expenses, by_category } }))
      loadHistory()
      return
    }
    const key = `${year}-${month}`
    try {
      const r = await getMonthly(coupleId, year, month)
      setMonthData(d => ({ ...d, [key]: r.data }))
    } catch {}
    await loadHistory()
  }

  /* ── actions ───────────────────────────────────────────────────── */
  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportHistory(coupleId, filterYear, filterMonth)
      const url = window.URL.createObjectURL(new Blob([r.data]))
      const a   = document.createElement('a')
      a.href    = url
      const sfx = filterYear
        ? filterMonth ? `${MONTH_NAMES[filterMonth-1]}-${filterYear}` : String(filterYear)
        : 'completo'
      a.download = `cohabit-${sfx}.xlsx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); window.URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const handleDelete = async (expense, year, month) => {
    try {
      await deleteExpense(expense.id)
      setConfirmDel(null)
      await refreshMonth(year, month)
    } catch {}
  }

  const handleSaved = async (year, month) => {
    setEditingExp(null)
    await refreshMonth(year, month)
  }

  /* ── derived ───────────────────────────────────────────────────── */
  const availableYears  = [...new Set(months.map(m => m.year))].sort((a, b) => b - a)
  const filteredMonths  = months.filter(m => {
    if (filterYear  && m.year  !== filterYear)  return false
    if (filterMonth && m.month !== filterMonth) return false
    return true
  })

  const exportLabel = filterYear
    ? filterMonth ? MONTH_NAMES[filterMonth-1] : String(filterYear)
    : 'Todo'

  /* ── render ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="pt-20 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <>
      <div className="pt-16 pb-24 max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="px-5 pt-6 pb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'private' ? 'Mis gastos' : 'Historial'}
          </h1>
          {months.length > 0 && mode === 'shared' && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 disabled:opacity-50 transition-all text-white text-xs font-semibold shadow-sm"
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" />
                </svg>
              )}
              Exportar · {exportLabel}
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        {months.length > 0 && (
          <div className="px-5 pb-4 flex gap-2">
            <div className="relative flex-1">
              <select
                value={filterYear ?? ''}
                onChange={e => {
                  setFilterYear(e.target.value ? Number(e.target.value) : null)
                  setFilterMonth(null)
                }}
                className="w-full appearance-none border border-slate-200 bg-white rounded-xl px-3 pr-8 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400"
              >
                <option value="">Todos los años</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className="relative flex-1">
              <select
                value={filterMonth ?? ''}
                onChange={e => setFilterMonth(e.target.value ? Number(e.target.value) : null)}
                disabled={!filterYear}
                className="w-full appearance-none border border-slate-200 bg-white rounded-xl px-3 pr-8 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 disabled:opacity-40"
              >
                <option value="">Todos los meses</option>
                {MONTH_NAMES.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {filteredMonths.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20 text-center px-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 text-sm">Sin historial</p>
            <p className="text-slate-400 text-sm mt-1">Los gastos mensuales aparecerán aquí</p>
          </div>
        )}

        {/* ── Month list ── */}
        <div className="px-4 flex flex-col gap-2">
          {filteredMonths.map(m => {
            const key    = `${m.year}-${m.month}`
            const isOpen = expanded === key
            const detail = monthData[key]
            return (
              <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Month header */}
                <button
                  onClick={() => toggle(m.year, m.month)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 text-sm">{MONTH_NAMES[m.month - 1]} {m.year}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.count} gasto{m.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900 text-sm tabular-nums">S/ {Number(m.total).toFixed(2)}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-3">
                    {loadingMonth === key ? (
                      <div className="flex justify-center py-5">
                        <div className="w-6 h-6 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
                      </div>
                    ) : detail ? (
                      <>
                        {/* Category chips */}
                        <div className="flex flex-wrap gap-1.5 py-3">
                          {Object.entries(detail.by_category).map(([cat, amt]) => (
                            <span key={cat} className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium text-slate-600">
                              {CATEGORY_EMOJI[cat] || '📦'} {cat} · S/ {Number(amt).toFixed(2)}
                            </span>
                          ))}
                        </div>

                        {/* Expense rows */}
                        <div className="flex flex-col gap-1.5">
                          {detail.expenses.map(e => (
                            <div key={e.id} className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                              <span className="text-sm shrink-0">{CATEGORY_EMOJI[e.category] || '📦'}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800">{e.category}</span>
                                {e.subcategory && <span className="text-xs text-slate-400 ml-1.5">· {e.subcategory}</span>}
                                {e.description && <p className="text-xs text-slate-400 truncate mt-0.5">{e.description}</p>}
                              </div>
                              <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                                S/ {Number(e.total_amount).toFixed(2)}
                              </span>

                              {/* Edit btn */}
                              <button
                                onClick={() => { setConfirmDel(null); setEditingExp({ ...e, _year: m.year, _month: m.month }) }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              {/* Delete btn / confirm */}
                              {confirmDel === e.id ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleDelete(e, m.year, m.month)}
                                    className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
                                  >Sí</button>
                                  <button
                                    onClick={() => setConfirmDel(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300 transition-colors"
                                  >No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDel(e.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Edit sheet ── */}
      {editingExp && (
        <EditSheet
          expense={editingExp}
          onClose={() => setEditingExp(null)}
          onSaved={() => handleSaved(editingExp._year, editingExp._month)}
        />
      )}
    </>
  )
}
