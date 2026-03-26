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
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState('')
  const [recent, setRecent]     = useState([])
  const [resolvedCouple, setResolvedCouple] = useState(coupleId)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

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
  }, [resolvedCouple])

  const handleSubmit = async (payload) => {
    if (!resolvedCouple) return
    setLoading(true)
    try {
      await createExpense({ ...payload, couple_id: resolvedCouple })
      setToast('success')
      setTimeout(() => setToast(''), 2500)
      const r = await listExpenses(resolvedCouple, 0, 3)
      setRecent(r.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al registrar'
      setToast('error:' + msg)
      setTimeout(() => setToast(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const isError = toast.startsWith('error:')
  const toastMsg = isError ? toast.replace('error:', '') : 'Gasto registrado correctamente'

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-[72px] left-4 right-4 z-50 max-w-lg mx-auto text-[13px] font-medium px-4 py-3 rounded-xl shadow-lg text-center animate-slide-up ${
          isError ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-slate-500 text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
          {user?.name?.split(' ')[0] ?? 'Usuario'}
        </h1>
      </div>

      {/* Form */}
      <div className="px-4">
        <ExpenseForm members={members} onSubmit={handleSubmit} loading={loading} />
      </div>

      {/* Recent expenses */}
      {recent.length > 0 && (
        <div className="px-4 mt-7">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Últimos gastos</p>
          <div className="flex flex-col gap-2">
            {recent.map((e) => (
              <div key={e.id} className="bg-white rounded-xl px-4 py-3 border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0">
                  {CATEGORY_EMOJI[e.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm leading-tight">{e.category}</p>
                  {(e.subcategory || e.description) && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {e.subcategory || e.description}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-slate-900 text-sm shrink-0 tabular-nums">
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
