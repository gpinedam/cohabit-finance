import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getHistory, getMonthly } from '../services/api'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CATEGORY_EMOJI = {
  Supermercado: '🛍️', Alquiler: '🏠', Servicios: '⚡',
  Ocio: '🎬', Restaurante: '🍴', Transporte: '🚗', Salud: '🩺', Otros: '📦',
}

export default function History() {
  const { coupleId } = useAuth()
  const [months, setMonths]             = useState([])
  const [expanded, setExpanded]         = useState(null)
  const [monthData, setMonthData]       = useState({})
  const [loadingMonth, setLoadingMonth] = useState(null)
  const [loading, setLoad]              = useState(true)

  useEffect(() => {
    if (!coupleId) return
    getHistory(coupleId)
      .then((r) => setMonths(r.data))
      .finally(() => setLoad(false))
  }, [coupleId])

  const toggle = async (year, month) => {
    const key = `${year}-${month}`
    if (expanded === key) { setExpanded(null); return }
    setExpanded(key)
    if (!monthData[key]) {
      setLoadingMonth(key)
      try {
        const r = await getMonthly(coupleId, year, month)
        setMonthData((d) => ({ ...d, [key]: r.data }))
      } finally { setLoadingMonth(null) }
    }
  }

  if (loading) return (
    <div className="pt-20 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
      </div>

      {months.length === 0 && (
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

      <div className="px-4 flex flex-col gap-2">
        {months.map((m) => {
          const key  = `${m.year}-${m.month}`
          const isOpen = expanded === key
          const detail = monthData[key]
          return (
            <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(m.year, m.month)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-slate-800 text-sm">
                    {MONTH_NAMES[m.month - 1]} {m.year}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.count} gasto{m.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 text-sm tabular-nums">S/ {Number(m.total).toFixed(2)}</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-3">
                  {loadingMonth === key ? (
                    <div className="flex justify-center py-5">
                      <div className="w-6 h-6 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
                    </div>
                  ) : detail ? (
                    <>
                      <div className="flex flex-wrap gap-1.5 py-3">
                        {Object.entries(detail.by_category).map(([cat, amt]) => (
                          <span key={cat} className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium text-slate-600">
                            {CATEGORY_EMOJI[cat] || '📦'} {cat} · S/ {Number(amt).toFixed(2)}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {detail.expenses.map((e) => (
                          <div key={e.id} className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-center gap-3">
                            <span className="text-sm shrink-0">{CATEGORY_EMOJI[e.category] || '📦'}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800">{e.category}</span>
                              {e.subcategory && <span className="text-xs text-slate-400 ml-1.5">· {e.subcategory}</span>}
                              {e.description && <p className="text-xs text-slate-400 truncate mt-0.5">{e.description}</p>}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 ml-2 shrink-0 tabular-nums">
                              S/ {Number(e.total_amount).toFixed(2)}
                            </span>
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
  )
}
