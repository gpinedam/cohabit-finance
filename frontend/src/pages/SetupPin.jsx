import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad'
import { setPin } from '../services/api'

export default function SetupPin() {
  const navigate = useNavigate()
  const [step, setStep]         = useState(1)
  const [firstPin, setFirstPin] = useState('')
  const [error, setError]       = useState(false)
  const [saving, setSaving]     = useState(false)

  const handleStep1 = (pin) => { setFirstPin(pin); setStep(2) }

  const handleStep2 = async (pin) => {
    if (pin !== firstPin) {
      setError(true)
      setTimeout(() => { setError(false); setStep(1); setFirstPin('') }, 700)
      return
    }
    setSaving(true)
    try {
      await setPin(pin)
      localStorage.setItem('pinEnabled', 'true')
      navigate('/')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el PIN')
      setStep(1)
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-600/30">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {step === 1 ? 'Crea tu PIN' : 'Confirma tu PIN'}
        </h1>
        <p className="text-slate-400 text-sm mt-2 text-center max-w-xs">
          {step === 1
            ? 'Elige 6 dígitos para acceder rápidamente desde tu móvil'
            : 'Escribe nuevamente el mismo PIN para confirmar'}
        </p>
        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2.5">
            <p className="text-red-300 text-sm font-medium">Los PINs no coinciden</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-14">
        {saving ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-brand-600 animate-spin" />
          </div>
        ) : (
          <PinPad
            key={step}
            onComplete={step === 1 ? handleStep1 : handleStep2}
            error={error}
            onErrorClear={() => setError(false)}
          />
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-8 text-sm text-slate-400 hover:text-slate-500 transition-colors"
        >
          Omitir por ahora
        </button>
      </div>
    </div>
  )
}
