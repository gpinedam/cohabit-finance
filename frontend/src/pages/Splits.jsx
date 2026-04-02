import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExpense } from '../services/api'
import api from '../services/api'

const SPLIT_LABELS = {
  equal: '50/50', proportional: 'Proporcional', on_me: 'Lo pagué yo', custom: 'Personalizado',
}
const CATEGORY_EMOJI = {
  Supermercado: '🛒', Alquiler: '🏠', Servicios: '💡',
  Ocio: '🎭', Restaurante: '🍽️', Transporte: '🚌', Salud: '💊', Otros: '📦',
}

export default function Splits() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense]   = useState(null)
  const [names, setNames]       = useState({})
  const [loading, setLoad]      = useState(true)

  useEffect(() => {
    getExpense(id)
      .then(async (r) => {
        const e = r.data
        setExpense(e)
        // Get member names from balance
        const coupleId = e.couple_id
        const bal = await api.get('/reports/balance', { params: { couple_id: coupleId } })
        setNames(bal.data.summary?.member_names || {})
      })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [id])

  if (loading) return (
    <div className="pt-20 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
    </div>
  )
  if (!expense) return <div className="pt-20 text-center text-red-400">Gasto no encontrado</div>

  return (
    <div className="pt-16 pb-24 px-4 max-w-lg mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        ← Volver
      </button>

      {/* Expense header card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 mt-3">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl shrink-0">
            {CATEGORY_EMOJI[expense.category] || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800">{expense.category}</h2>
            {expense.subcategory && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold mt-1 inline-block">
                {expense.subcategory}
              </span>
            )}
            {expense.description && <p className="text-sm text-slate-500 mt-1">{expense.description}</p>}
          </div>
          <p className="text-2xl font-bold text-slate-800 shrink-0">S/ {Number(expense.total_amount).toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
          <span className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded-full">
            {SPLIT_LABELS[expense.split_type]}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(expense.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Splits */}
      <div className="mt-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">División del gasto</p>
        <div className="flex flex-col gap-2">
          {expense.splits.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {(names[s.user_id] || `U${s.user_id}`).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">{names[s.user_id] || `Usuario ${s.user_id}`}</p>
                <p className="text-xs text-slate-400 mt-0.5">{Number(s.percentage).toFixed(1)}% del total</p>
              </div>
              <span className="font-bold text-slate-800 text-sm">S/ {Number(s.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
