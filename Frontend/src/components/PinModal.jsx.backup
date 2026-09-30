// src/components/PinModal.jsx - Version ultra-simplifiée
import React, { useState, useEffect, useRef } from 'react'
import { FaTimes, FaShieldAlt, FaKey } from 'react-icons/fa'
import axios from 'axios'
import toast from 'react-hot-toast'

function PinModal({ isOpen, onClose, onSuccess, type = 'set', amount = null, onCancel }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [attemptsLeft, setAttemptsLeft] = useState(5)
  
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setConfirmPin('')
      setStep(type === 'set' ? 1 : 3)
      setError(null)
      setLoading(false)
      setAttemptsLeft(5)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, type])

  if (!isOpen) return null

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
  }

  const handleConfirmChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setConfirmPin(value)
  }

  const handleSetPin = async () => {
    if (step === 1) {
      if (pin.length !== 4) {
        setError('Code à 4 chiffres requis')
        return
      }
      setStep(2)
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
      return
    }
    
    if (pin !== confirmPin) {
      setError('Les codes ne correspondent pas')
      setConfirmPin('')
      setTimeout(() => inputRef.current?.focus(), 50)
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/user/set-transaction-pin', 
        { pin: pin },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data.success) {
        toast.success('PIN défini avec succès !')
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur')
      setPin('')
      setConfirmPin('')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPin = async () => {
    if (pin.length !== 4) {
      setError('Code à 4 chiffres requis')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/user/verify-transaction-pin', 
        { pin: pin },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data.success) {
        toast.success('PIN valide !')
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (error) {
      const msg = error.response?.data?.error || 'PIN incorrect'
      setError(msg)
      const match = msg.match(/(\d+) tentative/)
      if (match) setAttemptsLeft(parseInt(match[1]))
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const Spinner = () => <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>

  if (step === 1 || step === 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.8)' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '28rem', background: 'linear-gradient(to bottom right, #1e3a8a, #1e40af)', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(59,130,246,0.2)', borderRadius: '9999px', marginBottom: '0.75rem' }}>
                <FaShieldAlt style={{ color: '#60a5fa', fontSize: '2rem' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                {step === 1 ? 'Définir votre PIN' : 'Confirmer votre PIN'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {step === 1 ? 'Code à 4 chiffres' : 'Confirmez votre code'}
              </p>
            </div>

            {amount && step === 1 && (
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Montant</p>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>{amount.toLocaleString()} FCFA</p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength="4"
                value={step === 1 ? pin : confirmPin}
                onChange={step === 1 ? handlePinChange : handleConfirmChange}
                style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem', padding: '0.75rem', color: 'white' }}
                placeholder="____"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSetPin}
              disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.75rem', transition: 'all 0.2s', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? <Spinner /> : (step === 1 ? 'Continuer' : 'Définir mon PIN')}
            </button>

            {step === 2 && (
              <button onClick={() => { setStep(1); setConfirmPin(''); setError(null); setTimeout(() => inputRef.current?.focus(), 50) }} style={{ width: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Retour
              </button>
            )}

            <button onClick={() => { if (onCancel) onCancel(); onClose() }} style={{ width: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>

          <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>
      </div>
    )
  }

  // Écran de vérification
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.8)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '28rem', background: 'linear-gradient(to bottom right, #1e3a8a, #1e40af)', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(234,179,8,0.2)', borderRadius: '9999px', marginBottom: '0.75rem' }}>
              <FaKey style={{ color: '#fbbf24', fontSize: '2rem' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Validation</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Entrez votre code PIN</p>
          </div>

          {amount && (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Montant</p>
              <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>{amount.toLocaleString()} FCFA</p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin}
              onChange={handlePinChange}
              style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.75rem', padding: '0.75rem', color: 'white' }}
              placeholder="____"
              disabled={loading}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div></div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Tentatives: {attemptsLeft}</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyPin}
            disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.75rem', transition: 'all 0.2s', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Spinner /> : 'Valider la transaction'}
          </button>

          <button onClick={onClose} style={{ width: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>

        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <FaTimes />
        </button>
      </div>
    </div>
  )
}

export default PinModal