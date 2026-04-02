import { useCallback, useEffect, useState } from 'react'
import { deleteWishlistItem, listWishlistItems, updateWishlistItem } from '../services/api'
import StarRating from '../components/StarRating'
import WishlistItemModal from '../components/WishlistItemModal'

// ── Filter state helpers ─────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Reciente' },
  { value: 'stars',      label: 'Mejor valorado' },
  { value: 'price_asc',  label: 'Precio ↑' },
  { value: 'price_desc', label: 'Precio ↓' },
]

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3 animate-pulse">
      <div className="w-[72px] h-[72px] rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        <div className="h-3 bg-slate-100 rounded-full w-1/3" />
      </div>
    </div>
  )
}

// ── Item card ────────────────────────────────────────────────────────────────

function WishlistCard({ item, onEdit, onDelete, onMove }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isHave = item.list_type === 'have'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-3 group transition-colors ${
      isHave ? 'border-emerald-100' : 'border-slate-100'
    }`}>
      {/* Thumbnail */}
      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center border border-slate-100">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <svg className="w-8 h-8 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 flex-1">{item.title}</p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors mt-0.5"
              aria-label="Ver producto"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>

        {/* Stars + price */}
        <div className="flex items-center gap-3">
          <StarRating value={item.stars} size="sm" />
          {item.price != null && (
            <span className="text-sm font-bold text-brand-600 tabular-nums">
              S/ {Number(item.price).toFixed(2)}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-slate-400 leading-snug line-clamp-2">{item.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {!confirmDelete ? (
            <>
              {/* Move between lists */}
              <button
                onClick={() => onMove(item)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isHave
                    ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {isHave ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                    Mover a deseos
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Ya lo tengo
                  </>
                )}
              </button>
              <button
                onClick={() => onEdit(item)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Eliminar
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">¿Eliminar?</span>
              <button
                onClick={() => onDelete(item.id)}
                className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
              >
                Sí
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Wishlist() {
  const [activeTab, setActiveTab]   = useState('want')        // 'want' | 'have'
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterStars, setFilterStars] = useState(null)
  const [minPrice, setMinPrice]     = useState('')
  const [maxPrice, setMaxPrice]     = useState('')
  const [sort, setSort]             = useState('recent')
  const [showModal, setShowModal]   = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = { list_type: activeTab, sort }
      if (filterStars !== null) params.stars = filterStars
      if (minPrice !== '') params.min_price = parseFloat(minPrice)
      if (maxPrice !== '') params.max_price = parseFloat(maxPrice)
      const res = await listWishlistItems(params)
      setItems(res.data)
    } catch {
      // Silently fail — list stays empty
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterStars, minPrice, maxPrice, sort])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Reset filters when switching tabs
  const switchTab = (tab) => {
    if (tab === activeTab) return
    setFilterStars(null)
    setMinPrice('')
    setMaxPrice('')
    setActiveTab(tab)
  }

  const handleSaved = (savedItem) => {
    // If the saved item belongs to the active tab, upsert it in the list
    if (savedItem.list_type === activeTab) {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === savedItem.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = savedItem
          return next
        }
        return [savedItem, ...prev]
      })
    } else {
      // Item was moved to the other tab — remove it from current view
      setItems((prev) => prev.filter((i) => i.id !== savedItem.id))
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteWishlistItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch { /* silently fail */ }
  }

  // Toggle an item between 'want' and 'have' lists
  const handleMove = async (item) => {
    const nextType = item.list_type === 'want' ? 'have' : 'want'
    try {
      const res = await updateWishlistItem(item.id, { list_type: nextType })
      // Remove from current tab view (it now lives in the other tab)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      // Show a brief visual feedback by briefly touching the saved item
      if (res.data) {/* item moved successfully */}
    } catch { /* silently fail */ }
  }

  const openCreate = () => { setEditItem(null); setShowModal(true) }
  const openEdit   = (item) => { setEditItem(item); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null) }

  const hasActiveFilters = filterStars !== null || minPrice !== '' || maxPrice !== ''
  const clearFilters = () => { setFilterStars(null); setMinPrice(''); setMaxPrice('') }

  const tabConfig = {
    want: {
      label: 'Quiero',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
        </svg>
      ),
      emptyTitle: 'Tu lista de deseos está vacía',
      emptyDesc: 'Añade cosas que quieras comprar, con tu propia valoración',
      emptyBg: 'bg-amber-50',
      emptyIcon: 'text-amber-300',
      addLabel: 'Añadir idea',
    },
    have: {
      label: 'Tengo',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      emptyTitle: 'Aún no tienes nada aquí',
      emptyDesc: 'Marca un ítem de tu lista de deseos como "Ya lo tengo" y aparecerá aquí',
      emptyBg: 'bg-emerald-50',
      emptyIcon: 'text-emerald-300',
      addLabel: 'Registrar lo que tengo',
    },
  }
  const tab = tabConfig[activeTab]

  // El color morado se aplica globalmente vía data-mode="wishlist" en <html>
  // (gestionado por Navbar), no se necesita clase local.
  return (
    <div className="pt-16 pb-28 max-w-lg mx-auto">

      {/* ── Page header ── */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Lista personal</p>
        <h1 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">Mis cosas</h1>
      </div>

      {/* ── Tab switcher ── */}
      <div className="px-4 mb-4">
        <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
          {(['want', 'have']).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === t
                  ? t === 'want'
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={activeTab === t ? '' : 'opacity-60'}>
                {tabConfig[t].icon}
              </span>
              {tabConfig[t].label}
              {!loading && items.length > 0 && activeTab === t && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  t === 'want' ? 'bg-brand-100 text-brand-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {items.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="px-4 mb-4 flex flex-col gap-3">
        {/* Stars chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setFilterStars(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
              filterStars === null
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            Todas
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStars(filterStars === s ? null : s)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                filterStars === s
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {s}
            </button>
          ))}
        </div>

        {/* Price range + sort */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
            <span className="text-slate-300 text-xs font-medium shrink-0">S/</span>
            <input
              type="number" min="0" step="0.01" value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Mín"
              className="w-14 bg-transparent text-xs text-slate-700 outline-none placeholder-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-200 text-xs shrink-0">–</span>
            <input
              type="number" min="0" step="0.01" value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Máx"
              className="w-14 bg-transparent text-xs text-slate-700 outline-none placeholder-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="shrink-0 w-8 h-8 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-100 transition-colors active:scale-95"
              aria-label="Limpiar filtros"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 flex flex-col gap-2">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-3xl ${tab.emptyBg} flex items-center justify-center mb-5`}>
              <svg className={`w-10 h-10 ${tab.emptyIcon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {activeTab === 'want'
                  ? <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  : <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                }
              </svg>
            </div>
            <p className="text-base font-bold text-slate-800 mb-1">
              {hasActiveFilters ? 'Sin resultados' : tab.emptyTitle}
            </p>
            <p className="text-sm text-slate-400 mb-6 max-w-[240px] leading-relaxed">
              {hasActiveFilters ? 'Prueba con otros filtros' : tab.emptyDesc}
            </p>
            {!hasActiveFilters && activeTab === 'want' && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-3 bg-brand-600 text-white text-sm font-semibold rounded-2xl shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {tab.addLabel}
              </button>
            )}
          </div>
        ) : (
          items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))
        )}
      </div>

      {/* ── FAB ── */}
      {!loading && (items.length > 0 || hasActiveFilters) && (
        <button
          onClick={openCreate}
          className="fixed bottom-[76px] right-4 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 flex items-center justify-center hover:bg-brand-700 active:scale-95 transition-all z-20"
          aria-label="Añadir idea"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <WishlistItemModal
          mode={editItem ? 'edit' : 'create'}
          item={editItem}
          defaultListType={activeTab}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
