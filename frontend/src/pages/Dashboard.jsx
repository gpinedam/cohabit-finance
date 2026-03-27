import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createSettlement, getBalance, listGoals, listRecurringEntries, listSettlements, payRecurringEntry, skipRecurringEntry } from '../services/api'

const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MONTH_NAMES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) { return `S/ ${Number(n).toFixed(2)}` }
function fmtDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  paid:    { label: 'Pagado',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  skipped: { label: 'Omitido',  cls: 'bg-slate-50 text-slate-400 border-slate-100' },
}

export default function Dashboard() {
  const { coupleId } = useAuth()
  const [data,        setData]        = useState(null)
  const [settlements, setSettlements] = useState([])
  const [recurring,   setRecurring]   = useState(null)
  const [goals,       setGoals]       = useState([])
  const [loading,     setLoad]        = useState(true)
  const [error,       setError]       = useState('')
  const [confirming,  setConfirming]  = useState(false)
  const [settling,    setSettling]    = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [toast,       setToast]       = useState('')

  const load = async () => {
    if (!coupleId) return
    const now = new Date()
    try {
      const [b, s, r, g] = await Promise.all([
        getBalance(coupleId),
        listSettlements(coupleId),
        listRecurringEntries(coupleId, now.getFullYear(), now.getMonth() + 1),
        listGoals(coupleId),
      ])
      setData(b.data)
      setSettlements(s.data)
      setRecurring(r.data)
      setGoals(g.data)
    } catch {
      setError('No se pudo cargar el balance')
    } finally {
      setLoad(false)
    }
  }

  useEffect(() => { load() }, [coupleId])

  const handleSettle = async () => {
    setSettling(true)
    try {
      await createSettlement(coupleId)
      setConfirming(false)
      await load()
    } catch {
      setError('No se pudo registrar la liquidación')
    } finally {
      setSettling(false)
    }
  }

  const handlePayEntry = async (entryId) => {
    try {
      await payRecurringEntry(entryId, { create_expense: true })
      const now = new Date()
      const r = await listRecurringEntries(coupleId, now.getFullYear(), now.getMonth() + 1)
      setRecurring(r.data)
      setToast('paid')
      setTimeout(() => setToast(''), 2200)
    } catch {
      setToast('error')
      setTimeout(() => setToast(''), 2200)
    }
  }

  const handleSkipEntry = async (entryId) => {
    try {
      await skipRecurringEntry(entryId)
      const now = new Date()
      const r = await listRecurringEntries(coupleId, now.getFullYear(), now.getMonth() + 1)
      setRecurring(r.data)
      setToast('skipped')
      setTimeout(() => setToast(''), 2200)
    } catch {
      setToast('error')
      setTimeout(() => setToast(''), 2200)
    }
  }

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

  const { debts, since, summary } = data
  const memberIds  = Object.keys(summary.member_names).map(Number)
  const total      = Number(summary.total_expenses)
  const hasDebts   = debts.length > 0
  const totalDebt  = debts.reduce((s, d) => s + Number(d.amount), 0)
  const now        = new Date()
  const monthLabel = MONTH_NAMES_FULL[now.getMonth()]

  return (
    <div className="pt-16 pb-24 max-w-lg mx-auto">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all animate-slide-up ${
          toast === 'paid'    ? 'bg-emerald-500 text-white' :
          toast === 'skipped' ? 'bg-slate-500 text-white'   :
                                'bg-rose-500 text-white'
        }`}>
          {toast === 'paid' ? '✓ Gasto fijo registrado' : toast === 'skipped' ? 'Entrada omitida' : 'No se pudo completar'}
        </div>
      )}

      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Balance</h1>
          {since && (
            <p className="text-xs text-slate-400 mt-0.5">
              Desde liquidación · {fmtDate(since)}
            </p>
          )}
        </div>
        {settlements.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Historial
          </button>
        )}
      </div>

      {/* ── Settlement history (collapsible) ── */}
      {showHistory && settlements.length > 0 && (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Liquidaciones anteriores</p>
          </div>
          {settlements.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{fmtDate(s.settled_at)}</p>
                {s.note && <p className="text-xs text-slate-400 mt-0.5">{s.note}</p>}
              </div>
              <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(s.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Total card ── */}
      <div className="mx-4 bg-slate-900 rounded-2xl p-5 mb-4">
        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-2">Total gastado</p>
        <p className="text-4xl font-bold text-white tabular-nums">{fmt(total)}</p>
        <p className="text-slate-600 text-xs mt-1.5">
          {memberIds.length} personas · {since ? `desde ${fmtDate(since)}` : 'desde el inicio'}
        </p>
      </div>

      {/* ── Per-person cards ── */}
      <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
        {memberIds.map((uid) => {
          const net      = Number(summary.net_by_user[uid] ?? 0)
          const paid     = Number(summary.paid_by_user[uid] ?? 0)
          const owed     = Number(summary.owe_by_user[uid] ?? 0)
          const positive = net >= 0
          return (
            <div key={uid} className="bg-white rounded-xl p-4 border border-slate-100">
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
                  <p className="font-semibold text-slate-900 text-sm tabular-nums">{fmt(paid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Le corresponde</p>
                  <p className="font-semibold text-slate-900 text-sm tabular-nums">{fmt(owed)}</p>
                </div>
                <div className={`rounded-lg px-2.5 py-2 ${positive ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Neto</p>
                  <p className={`font-bold text-sm tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {positive ? '+' : ''}{fmt(net)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Debts / settled ── */}
      {hasDebts ? (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Pendiente</h3>
          </div>
          {debts.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {d.from_user_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.from_user_name}</p>
                  <p className="text-xs text-slate-400">debe a <span className="font-medium text-slate-600">{d.to_user_name}</span></p>
                </div>
              </div>
              <span className="font-bold text-rose-500 text-sm shrink-0 tabular-nums">{fmt(d.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-4 bg-white border border-slate-100 rounded-2xl p-6 text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-sm">Todo al día</p>
          <p className="text-slate-400 text-xs mt-1">No hay deudas pendientes</p>
        </div>
      )}

      {/* ── Settle button ── */}
      {hasDebts && !confirming && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => setConfirming(true)}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Liquidar deuda · {fmt(totalDebt)}
          </button>
        </div>
      )}

      {/* ── Fijos del mes ── */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 text-base">Fijos de {monthLabel}</h2>
          <Link to="/recurring" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Gestionar
          </Link>
        </div>

        {!recurring ? (
          <div className="bg-white rounded-2xl border border-slate-100 flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : recurring.entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-2xl mb-2">📅</p>
            <p className="text-sm font-semibold text-slate-700">Sin gastos fijos este mes</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">Registra la luz, el agua, el alquiler…</p>
            <Link
              to="/recurring"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Añadir gasto fijo
            </Link>
          </div>
        ) : (
          <>
            {/* Warnings */}
            {recurring.warnings.map((e) => (
              <div key={`w-${e.id}`} className="mb-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {e.service_icon && <span className="mr-1">{e.service_icon}</span>}{e.service_name}
                  </p>
                  <p className="text-xs font-medium text-rose-500 mt-0.5">
                    {e.due_in_days < 0 ? '⚠️ Vencido' : e.due_in_days === 0 ? '⚠️ Vence hoy' : `⏰ Vence en ${e.due_in_days} día${e.due_in_days === 1 ? '' : 's'}`}
                  </p>
                </div>
                <span className="font-bold text-slate-900 tabular-nums text-sm shrink-0">{fmt(e.amount)}</span>
              </div>
            ))}

            {/* Full list */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {recurring.entries.map((e, i) => {
                const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.pending
                const isPending = e.status === 'pending'
                return (
                  <div key={e.id} className={`px-4 py-3.5 ${i < recurring.entries.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                        {e.service_icon || '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{e.service_name}</p>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {e.assigned_to_user_name} · día {e.day_of_month}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums text-sm shrink-0">{fmt(e.amount)}</span>
                    </div>
                    {isPending && (
                      <div className="flex gap-2 mt-2.5 pl-12">
                        <button
                          onClick={() => handlePayEntry(e.id)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors active:scale-[0.98]"
                        >
                          ✓ Pagado
                        </button>
                        <button
                          onClick={() => handleSkipEntry(e.id)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-colors active:scale-[0.98]"
                        >
                          Omitir
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Metas compartidas ── */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 text-base">🎯 Metas compartidas</h2>
          <Link to="/metas" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Ver todas
          </Link>
        </div>

        {goals.length === 0 ? (
          <Link to="/metas"
            className="block bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center hover:border-brand-300 transition-colors">
            <p className="text-2xl mb-1">🎯</p>
            <p className="text-sm font-semibold text-slate-700">Sin metas aún</p>
            <p className="text-slate-400 text-xs mt-0.5">Crea una meta de ahorro compartida</p>
          </Link>
        ) : (
          <div className="flex flex-col gap-2.5">
            {goals.slice(0, 3).map(goal => {
              const pct = Math.min(Number(goal.pct), 100)
              const GRAD = {
                violet: 'from-violet-600 to-indigo-600', emerald: 'from-emerald-500 to-teal-500',
                amber:  'from-amber-500 to-orange-500',  rose:    'from-rose-500 to-pink-500',
                blue:   'from-blue-500 to-cyan-500',     slate:   'from-slate-600 to-slate-500',
              }
              const grad = GRAD[goal.color] ?? GRAD.violet
              return (
                <Link key={goal.id} to="/metas"
                  className="bg-white border border-slate-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-slate-200 transition-colors active:scale-[0.99]">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl shrink-0`}>
                    {goal.icon || (goal.goal_type === 'emergency' ? '🛡️' : '🎯')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{goal.name}</p>
                      <p className="text-xs font-bold text-slate-500 tabular-nums shrink-0 ml-2">{pct.toFixed(0)}%</p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-slate-400 tabular-nums">S/ {Number(goal.accumulated).toFixed(0)} / S/ {Number(goal.target).toFixed(0)}</p>
                      {Number(goal.this_month) > 0 && (
                        <p className="text-[11px] text-emerald-500 font-semibold tabular-nums">+S/ {Number(goal.this_month).toFixed(0)} este mes</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
            {goals.length > 3 && (
              <Link to="/metas" className="text-center text-xs font-semibold text-brand-600 py-1">
                Ver {goals.length - 3} meta{goals.length - 3 > 1 ? 's' : ''} más →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm modal ── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setConfirming(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl px-5 pt-5 pb-12 w-full max-w-lg mx-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-slate-200 mb-5" />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 text-lg text-center mb-1">¿Liquidar deuda?</h3>
            <p className="text-slate-500 text-sm text-center mb-1">
              Se registra que la deuda de <span className="font-semibold text-slate-700">{fmt(totalDebt)}</span> fue saldada.
            </p>
            <p className="text-slate-400 text-xs text-center mb-6">
              El balance empezará desde cero. Los gastos anteriores quedan en el historial.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSettle}
                disabled={settling}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {settling && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
