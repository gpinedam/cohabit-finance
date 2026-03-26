import { useEffect, useState } from 'react'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function PinPad({ onComplete, error, onErrorClear }) {
  const [digits, setDigits] = useState([])
  const [shake, setShake]   = useState(false)

  useEffect(() => {
    if (error) {
      setShake(true)
      setDigits([])
      const t = setTimeout(() => { setShake(false); onErrorClear?.() }, 600)
      return () => clearTimeout(t)
    }
  }, [error])

  const press = (key) => {
    if (key === '') return
    if (key === '⌫') { setDigits((d) => d.slice(0, -1)); return }
    const next = [...digits, key]
    setDigits(next)
    if (next.length === 6) { onComplete(next.join('')); setDigits([]) }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* PIN dots */}
      <div className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-150 ${
              i < digits.length
                ? 'w-4 h-4 bg-brand-600 scale-110'
                : 'w-3.5 h-3.5 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {KEYS.map((key, idx) => (
          <button
            key={idx}
            onClick={() => press(key)}
            disabled={key === ''}
            className={`h-16 rounded-2xl text-2xl font-semibold transition-all active:scale-90 ${
              key === ''
                ? 'invisible'
                : key === '⌫'
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-slate-50 border border-slate-200 text-slate-900 hover:bg-white active:bg-slate-100'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}
