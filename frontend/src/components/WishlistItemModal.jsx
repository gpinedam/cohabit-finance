import { useEffect, useRef, useState } from 'react'
import { createWishlistItem, updateWishlistItem, uploadWishlistPhoto, deleteWishlistPhoto } from '../services/api'
import StarRating from './StarRating'

/**
 * WishlistItemModal — bottom-sheet slide-up for creating or editing a wishlist item.
 *
 * Props:
 *   mode       ('create'|'edit')
 *   item       (object|null)    — pre-filled data for edit mode
 *   onClose    (fn)             — called on cancel or successful save
 *   onSaved    (fn)             — called with the saved/updated item
 */
export default function WishlistItemModal({ mode = 'create', item = null, onClose, onSaved }) {
  const [title, setTitle]           = useState(item?.title ?? '')
  const [description, setDesc]      = useState(item?.description ?? '')
  const [price, setPrice]           = useState(item?.price != null ? String(item.price) : '')
  const [stars, setStars]           = useState(item?.stars ?? 3)
  const [url, setUrl]               = useState(item?.url ?? '')
  const [photoPreview, setPhotoPreview] = useState(item?.photo_url ?? null)
  const [pendingFile, setPendingFile]   = useState(null)  // file selected but not yet uploaded
  const [removePhoto, setRemovePhoto]   = useState(false) // mark existing photo for deletion
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const fileRef = useRef(null)

  // Revoke object URL when unmounting to avoid memory leaks
  useEffect(() => {
    return () => {
      if (pendingFile) URL.revokeObjectURL(photoPreview)
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (JPEG, PNG, WEBP, GIF)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB')
      return
    }
    setError('')
    setPendingFile(file)
    setRemovePhoto(false)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    if (pendingFile) {
      URL.revokeObjectURL(photoPreview)
      setPendingFile(null)
    }
    setPhotoPreview(null)
    if (item?.photo_url) setRemovePhoto(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('El título es obligatorio'); return }

    setLoading(true)
    setError('')
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: price !== '' ? parseFloat(price) : null,
        stars,
        url: url.trim() || null,
      }

      let saved
      if (mode === 'create') {
        const res = await createWishlistItem(payload)
        saved = res.data
      } else {
        const res = await updateWishlistItem(item.id, payload)
        saved = res.data
      }

      // Handle photo changes
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const photoRes = await uploadWishlistPhoto(saved.id, form)
        saved = photoRes.data
      } else if (removePhoto && item?.photo_url) {
        const photoRes = await deleteWishlistPhoto(saved.id)
        saved = photoRes.data
      }

      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  // Trap focus within modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" />

      {/* Sheet */}
      <div
        className="relative z-10 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <h2 className="text-[17px] font-bold text-slate-900">
            {mode === 'create' ? 'Nueva idea' : 'Editar idea'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-95"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-slate-100 shrink-0" />

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 flex flex-col gap-5">

            {/* Photo area */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Foto</p>
              {photoPreview ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-100 group">
                  <img
                    src={photoPreview}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label="Eliminar foto"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50/50 transition-all active:scale-[0.98]"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span className="text-xs font-medium">Añadir foto</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Title */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Qué quiero</p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Zapatillas New Balance 574..."
                required
                maxLength={200}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-900 text-[15px] font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
              />
            </div>

            {/* Stars */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Qué tanto lo quiero</p>
              <div className="flex items-center gap-4">
                <StarRating value={stars} onChange={setStars} size="lg" />
                <span className="text-sm text-slate-500 tabular-nums">
                  {stars === 1 && 'Lo necesito poco'}
                  {stars === 2 && 'Estaría bien tenerlo'}
                  {stars === 3 && 'Me gustaría tenerlo'}
                  {stars === 4 && 'Lo quiero bastante'}
                  {stars === 5 && '¡Lo quiero mucho!'}
                </span>
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Precio estimado (opcional)</p>
              <div className="flex items-center border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-400 transition-all overflow-hidden">
                <span className="pl-4 pr-2 text-slate-400 font-semibold text-sm shrink-0">S/</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 py-3 pr-4 bg-transparent text-slate-900 text-[15px] font-medium placeholder-slate-300 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* URL */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Link al producto (opcional)</p>
              <div className="flex items-center border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-400 transition-all overflow-hidden">
                <span className="pl-3 pr-1.5 shrink-0 text-slate-300">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 py-3 pr-4 bg-transparent text-slate-900 text-sm placeholder-slate-300 outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Notas (opcional)</p>
              <textarea
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Talla, color preferido, dónde lo viste..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs font-medium text-rose-500 bg-rose-50 border border-rose-100 px-3.5 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>

          {/* Actions — sticky footer inside scroll */}
          <div className="px-5 pb-8 pt-1 flex gap-3 sticky bottom-0 bg-white border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-[15px] hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-[15px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm shadow-brand-600/20"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                mode === 'create' ? 'Añadir a la lista' : 'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
