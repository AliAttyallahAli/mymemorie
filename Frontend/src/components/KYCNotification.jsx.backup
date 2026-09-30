// src/components/KYCNotification.jsx
import React, { useState } from 'react'
import { FaIdCard, FaTimes, FaCheckCircle, FaSpinner, FaUpload } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

function KYCNotification({ notification, onClose, onAction }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      await onAction(notification.id, notification.action)
    } finally {
      setLoading(false)
    }
  }

  const getKYCStatus = () => {
    if (notification.title.includes('approuvé')) return 'approved'
    if (notification.title.includes('rejeté')) return 'rejected'
    return 'pending'
  }

  const status = getKYCStatus()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="relative max-w-md w-full bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-400 animate-pulse"></div>

        <div className="text-center pt-6 pb-2">
          <div className={`inline-flex p-3 rounded-full mb-3 ${
            status === 'approved' ? 'bg-green-500/20' : 
            status === 'rejected' ? 'bg-red-500/20' : 'bg-purple-500/20'
          }`}>
            <FaIdCard className={`text-4xl ${
              status === 'approved' ? 'text-green-400' : 
              status === 'rejected' ? 'text-red-400' : 'text-purple-400'
            }`} />
          </div>
          <h2 className="text-2xl font-bold text-white">{notification.title}</h2>
          <p className="text-purple-200 text-sm mt-1">{notification.message}</p>
        </div>

        <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">Demande KYC</span>
              <span className="text-white text-sm">{notification.kyc_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">Date de soumission</span>
              <span className="text-white text-sm">{new Date(notification.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {status === 'rejected' && notification.reason && (
              <div className="bg-red-500/20 rounded-lg p-3 mt-2">
                <p className="text-red-300 text-sm">Raison: {notification.reason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 flex gap-3">
          {status === 'pending' && (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 btn-primary"
              >
                <FaUpload className="inline mr-2" /> Voir ma demande
              </button>
            </>
          )}
          {status === 'approved' && (
            <button
              onClick={() => navigate('/profile')}
              className="flex-1 btn-primary"
            >
              <FaCheckCircle className="inline mr-2" /> Voir mon statut
            </button>
          )}
          {status === 'rejected' && (
            <button
              onClick={() => navigate('/profile')}
              className="flex-1 btn-primary"
            >
              <FaUpload className="inline mr-2" /> Nouvelle demande
            </button>
          )}
          <button onClick={onClose} className="flex-1 btn-secondary">
            Fermer
          </button>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <FaTimes />
        </button>
      </div>
    </div>
  )
}

export default KYCNotification