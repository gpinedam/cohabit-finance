import { useEffect, useState } from 'react'
import ExpenseForm from '../components/ExpenseForm'
import { useAuth } from '../context/AuthContext'
import { createExpense, listExpenses } from '../services/api'
import api from '../services/api'

const CATEGORY_EMOJI = {
  Supermercado: '🛍️', Alquiler: '🏠', Servicios: '⚡',
  Ocio: '🎬', Restaurante: '🍴', Transporte: '🚗', Salud: '🩺', Otros: '📦',
}

export default function Home() {
  const { user, coupleId, setCoupleId } = useAuth()
  const [members, setMembers]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [toast, setToast]               = useState('')
  const [recent, setRecent]             = useState([])
  const [monthTotal, setMonthTotal]     = useState(null)
  const [resolvedCouple, setResolvedCouple] = useState(coupleId)

  useEffect(() => {
    const stored = localStorage.getItem('coupleId')
    if (stored) { setResolvedCouple(Number(stored)); return }
    api.get('/reports/history', { params: { couple_id: 1 } })
      .then(() => { setResolvedCouple(1); setCoupleId(1); localStorage.setItem('coupleId', '1') })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!resolvedCouple) return
    api.get('/reports/balance', { params: { couple_id: resolvedCouple } })
      .then((r) => {
        const names = r.data.summary?.member_names || {}
        setMembers(Object.entries(names).map(([id, name]) => ({ id: Number(id), name })))
      })
      .catch(() => {})
    api.get('/expenses/', { params: { couple_id: resolvedCouple, limit: 3 } })
      .then((r) => setRecent(r.data))
      .catch(() => {})
    const now = new Date()
    api.get('/reports/monthly', { params: { couple_id: resolvedCouple, year: now.getFullYear(), month: now.getMonth() + 1 } })
      .then((r) => setMonthTotal(r.data.total))
      .catch(() => {})
  }, [resolvedCouple])

  const handleSubmit = async (payload) => {
    if (!resolvedCouple) return
    setLoading(true)
    try {
      await createExpense({ ...payload, couple_id: resolvedCouple })
      setToast('ok')
      setTimeout(() => setToast(''), 2200)
      const [expenses, monthly] = await Promise.all([
        listExpenses(resolvedCouple, 0, 3),
        api.get('/reports/monthly', {
          params: { couple_id: resolvedCouple, year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
        }),
      ])
      setRecent(expenses.data)
      setMonthTotal(monthly.data.total)
    } catch (err) {
      setToast('err:' + (err.response?.data?.detail || 'Error al registrar'))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const isErr   = toast.startsWith('err:')
  const toastMsg = isErr ? toast.replace('err:', '') : '¡Gasto registrado!'

  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-[72px] left-4 right-4 z-50 max-w-lg mx-auto text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center transition-all ${
          isErr ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'
        }`}>
          {toastMsg}
        </div>
      )}

      {/* ── Greeting strip ── */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">{
            new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'
          }</p>
          <h1 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">
            {user?.name?.split(' ')[0] ?? 'Usuario'}
          </h1>
        </div>
        {monthTotal !== null && (
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Este mes</p>
            <p className="text-base font-bold text-slate-800 tabular-nums mt-0.5">S/ {Number(monthTotal).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* ── Form card ── */}
      <div className="mx-4 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <ExpenseForm members={members} onSubmit={handleSubmit} loading={loading} />
      </div>

      {/* ── Recent expenses ── */}
      {recent.length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Últimos gastos</p>
          <div className="flex flex-col gap-1.5">
            {recent.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-lg shrink-0">
                  {CATEGORY_EMOJI[e.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{e.category}</p>
                  {(e.subcategory || e.description) && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{e.subcategory || e.description}</p>
                  )}
                </div>
                <span className="font-bold text-slate-900 text-sm shrink-0 tabular-nums">
                  S/ {Number(e.total_amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
