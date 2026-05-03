// src/components/NotificationToast.jsx
import React, { useEffect, useState } from 'react'
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaBell, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaStore, FaReceipt } from 'react-icons/fa'

function NotificationToast({ notification, onClose }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return prev - 2
      })
    }, 40)
    
    return () => clearInterval(timer)
  }, [onClose])

  const getIcon = () => {
    const title = notification.title || ''
    if (title.includes('Transfert reçu')) return <FaArrowDown className="text-green-400" size={22} />
    if (title.includes('Transfert envoyé')) return <FaArrowUp className="text-blue-400" size={22} />
    if (title.includes('Dépôt')) return <FaStore className="text-green-400" size={22} />
    if (title.includes('Retrait')) return <FaMoneyBillWave className="text-yellow-400" size={22} />
    if (title.includes('Frais')) return <FaReceipt className="text-purple-400" size={22} />
    if (notification.type === 'alert') return <FaExclamationTriangle className="text-yellow-400" size={22} />
    if (notification.type === 'success') return <FaCheckCircle className="text-green-400" size={22} />
    return <FaInfoCircle className="text-blue-400" size={22} />
  }

  const getBgColor = () => {
    const title = notification.title || ''
    if (title.includes('Transfert reçu')) return 'bg-gradient-to-r from-green-900/95 to-green-800/95'
    if (title.includes('Transfert envoyé')) return 'bg-gradient-to-r from-blue-900/95 to-blue-800/95'
    if (title.includes('Dépôt')) return 'bg-gradient-to-r from-green-900/95 to-green-800/95'
    if (title.includes('Retrait')) return 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95'
    if (notification.type === 'alert') return 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95'
    return 'bg-gradient-to-r from-blue-900/95 to-blue-800/95'
  }

  const getBorderColor = () => {
    const title = notification.title || ''
    if (title.includes('Transfert reçu')) return 'border-green-500'
    if (title.includes('Transfert envoyé')) return 'border-blue-500'
    if (title.includes('Dépôt')) return 'border-green-500'
    if (title.includes('Retrait')) return 'border-yellow-500'
    if (notification.type === 'alert') return 'border-yellow-500'
    return 'border-blue-500'
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-96 ${getBgColor()} backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down border-l-4 ${getBorderColor()}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="text-white font-semibold text-sm">
                {notification.title}
              </h4>
              {notification.transaction?.amount && (
                <span className="text-green-300 text-xs font-mono">
                  {new Intl.NumberFormat('fr-FR').format(notification.transaction.amount)} FCFA
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm break-words">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <FaBell className="text-white/30 text-xs" />
              <p className="text-white/30 text-xs">
                {formatTime(notification.timestamp)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
      
      {/* Barre de progression */}
      <div 
        className="h-1 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-40 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export default NotificationToast