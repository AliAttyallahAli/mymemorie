// src/components/PinSettings.jsx
import React, { useState, useEffect } from 'react'
import { FaKey, FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaSpinner } from 'react-icons/fa'
import axios from 'axios'
import toast from 'react-hot-toast'
import PinModal from './PinModal'

function PinSettings({ user }) {
  const [hasPin, setHasPin] = useState(false)
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [showRequestResetModal, setShowRequestResetModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    checkPinStatus()
  }, [])

  const checkPinStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/pin-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHasPin(response.data.hasPin)
    } catch (error) {
      console.error('Erreur vérification PIN:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestPinReset = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/request-pin-reset', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRequestSent(true)
      toast.success('Demande envoyée. Un administrateur vous contactera.')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la demande')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
        <div className="flex items-center gap-3">
          <FaKey className="text-blue-400 text-xl" />
          <div>
            <p className="text-white font-medium">Code PIN de transaction</p>
            <p className="text-white/50 text-xs">
              {hasPin ? 'PIN déjà défini' : 'PIN non défini'}
            </p>
          </div>
        </div>
        {hasPin ? (
          <button
            onClick={() => setShowChangePinModal(true)}
            className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
          >
            Modifier
          </button>
        ) : (
          <button
            onClick={() => setShowChangePinModal(true)}
            className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
          >
            Définir
          </button>
        )}
      </div>

      {/* Option de récupération en cas de perte */}
      <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <FaExclamationTriangle className="text-yellow-400 text-lg mt-0.5" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">PIN oublié ?</p>
            <p className="text-white/50 text-xs mb-2">
              En cas de perte de votre code PIN, vous pouvez demander une réinitialisation.
              Un administrateur vous contactera après vérification de votre identité.
            </p>
            {requestSent ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <FaCheckCircle />
                <span>Demande envoyée ! Vous serez contacté sous 24h.</span>
              </div>
            ) : (
              <button
                onClick={requestPinReset}
                disabled={loading}
                className="text-yellow-400 text-sm hover:text-yellow-300 flex items-center gap-1"
              >
                {loading ? <FaSpinner className="animate-spin" /> : null}
                Demander une réinitialisation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de modification/définition du PIN */}
      {showChangePinModal && (
        <PinModal
          isOpen={showChangePinModal}
          onClose={() => {
            setShowChangePinModal(false)
            checkPinStatus()
          }}
          onSuccess={() => {
            setShowChangePinModal(false)
            checkPinStatus()
            toast.success('PIN mis à jour avec succès !')
          }}
          type={hasPin ? 'change' : 'set'}
        />
      )}
    </div>
  )
}

export default PinSettings