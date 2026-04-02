import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listExpenses } from '../services/api'

const CATEGORY_EMOJI = {
  Supermercado: '🛍️', Alquiler: '🏠', Servicios: '⚡',
  Ocio: '🎬', Restaurante: '🍴', Transporte: '🚗', Salud: '🩺', Otros: '📦',
}

const SPLIT_LABELS = {
  equal: '50/50', proportional: 'Proporcional', on_me: 'Lo pagué yo', custom: 'Personalizado',
}

export default function Expenses() {
  const { coupleId } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [skip, setSkip]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const [loading, setLoad]      = useState(false)
  const LIMIT = 20

  const load = async (offset = 0) => {
    if (!coupleId) return
    setLoad(true)
    try {
      const r = await listExpenses(coupleId, offset, LIMIT)
      if (offset === 0) setExpenses(r.data)
      else setExpenses((prev) => [...prev, ...r.data])
      setHasMore(r.data.length === LIMIT)
    } finally { setLoad(false) }
  }

  useEffect(() => { load(0) }, [coupleId])

  const loadMore = () => { const next = skip + LIMIT; setSkip(next); load(next) }

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Gastos</h1>
      </div>

      {expenses.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center mt-20 text-center px-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700 text-sm">Sin gastos aún</p>
          <p className="text-slate-400 text-sm mt-1">Registra tu primer gasto en Inicio</p>
        </div>
      )}

      <div className="px-4 flex flex-col gap-2">
        {expenses.map((e) => (
          <Link
            key={e.id}
            to={`/expenses/${e.id}`}
            className="bg-white rounded-xl px-4 py-3.5 border border-slate-200 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
              {CATEGORY_EMOJI[e.category] || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{e.category}</span>
                {e.subcategory && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                    {e.subcategory}
                  </span>
                )}
              </div>
              {e.description && <p className="text-xs text-slate-400 truncate mt-0.5">{e.description}</p>}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-slate-400">{SPLIT_LABELS[e.split_type]}</span>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(e.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-1">
              <span className="font-semibold text-slate-900 text-sm tabular-nums">S/ {Number(e.total_amount).toFixed(2)}</span>
              <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="px-4 mt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
