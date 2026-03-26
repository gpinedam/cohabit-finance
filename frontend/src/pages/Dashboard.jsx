import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBalance } from '../services/api'

export default function Dashboard() {
  const { coupleId } = useAuth()
  const [data, setData]    = useState(null)
  const [loading, setLoad] = useState(true)
  const [error, setError]  = useState('')

  useEffect(() => {
    if (!coupleId) return
    getBalance(coupleId)
      .then((r) => setData(r.data))
      .catch(() => setError('No se pudo cargar el balance'))
      .finally(() => setLoad(false))
  }, [coupleId])

  if (loading) return (
    <div className="pt-20 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  )
  if (error) return (
    <div className="pt-20 text-center px-4">
      <p className="text-slate-400 text-sm">{error}</p>
    </div>
  )
  if (!data) return null

  const { debts, summary } = data
  const memberIds = Object.keys(summary.member_names).map(Number)
  const total = Number(summary.total_expenses)

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Balance</h1>
      </div>

      {/* ── Total card (dark) ──────────────────────────────────────── */}
      <div className="mx-4 bg-slate-900 rounded-2xl p-5 mb-4">
        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-2">Total gastado</p>
        <p className="text-4xl font-bold text-white tabular-nums">
          S/ {total.toFixed(2)}
        </p>
        <p className="text-slate-600 text-xs mt-1.5">{memberIds.length} personas · período actual</p>
      </div>

      {/* ── Per-person ────────────────────────────────────────────── */}
      <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
        {memberIds.map((uid) => {
          const net     = Number(summary.net_by_user[uid] ?? 0)
          const paid    = Number(summary.paid_by_user[uid] ?? 0)
          const owed    = Number(summary.owe_by_user[uid] ?? 0)
          const positive = net >= 0
          return (
            <div key={uid} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                  {summary.member_names[uid].charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-800 text-sm truncate">
                  {summary.member_names[uid].split(' ')[0]}
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Pagó</p>
                  <p className="font-semibold text-slate-900 text-sm tabular-nums">S/ {paid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Le corresponde</p>
                  <p className="font-semibold text-slate-900 text-sm tabular-nums">S/ {owed.toFixed(2)}</p>
                </div>
                <div className={`rounded-lg px-2.5 py-2 ${positive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Neto</p>
                  <p className={`font-bold text-sm tabular-nums ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {positive ? '+' : ''}S/ {net.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Debts ─────────────────────────────────────────────────── */}
      {debts.length > 0 ? (
        <div className="mx-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Liquidaciones pendientes</h3>
          </div>
          {debts.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {d.from_user_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.from_user_name}</p>
                  <p className="text-xs text-slate-400">debe a <span className="font-medium text-slate-600">{d.to_user_name}</span></p>
                </div>
              </div>
              <span className="font-bold text-red-500 text-sm shrink-0 tabular-nums">S/ {Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-4 bg-white border border-slate-200 rounded-xl p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-sm">Todo al día</p>
          <p className="text-slate-400 text-xs mt-1">No hay deudas pendientes</p>
        </div>
      )}
    </div>
  )
}
