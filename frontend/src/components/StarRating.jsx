import { useState } from 'react'

/**
 * StarRating — interactive or display-only 1–5 star selector.
 *
 * Props:
 *   value    (number 1–5)       — current rating
 *   onChange (fn|undefined)     — if provided, renders interactive; omit for read-only
 *   size     ('sm'|'md'|'lg')  — star size; default 'md'
 */
export default function StarRating({ value = 3, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(null)

  const sizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }
  const cls = sizeMap[size] ?? sizeMap.md
  const effective = hovered ?? value

  if (!onChange) {
    // Read-only
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} filled={star <= value} cls={cls} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          className="focus:outline-none transition-transform active:scale-90"
          aria-label={`${star} estrella${star !== 1 ? 's' : ''}`}
        >
          <StarIcon filled={star <= effective} cls={cls} />
        </button>
      ))}
    </div>
  )
}

function StarIcon({ filled, cls }) {
  return filled ? (
    <svg className={`${cls} text-amber-400`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ) : (
    <svg className={`${cls} text-slate-200`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}
