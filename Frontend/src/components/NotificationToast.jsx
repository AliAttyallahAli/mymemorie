// src/components/NotificationToast.jsx
import React, { useEffect } from 'react'
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaMoneyBillWave } from 'react-icons/fa'

function NotificationToast({ notification, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [onClose])

  const getIcon = () => {
    switch (notification.type) {
      case 'transaction':
        return <FaMoneyBillWave className="text-green-400" size={24} />
      case 'alert':
        return <FaExclamationTriangle className="text-yellow-400" size={24} />
      case 'success':
        return <FaCheckCircle className="text-green-400" size={24} />
      default:
        return <FaInfoCircle className="text-blue-400" size={24} />
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'transaction':
        return 'bg-gradient-to-r from-green-900/95 to-green-800/95'
      case 'alert':
        return 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95'
      case 'success':
        return 'bg-gradient-to-r from-green-900/95 to-green-800/95'
      default:
        return 'bg-gradient-to-r from-blue-900/95 to-blue-800/95'
    }
  }

  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-96 ${getBgColor()} backdrop-blur-lg rounded-xl shadow-2xl p-4 z-50 animate-slide-down border border-white/20`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
          <p className="text-white/70 text-xs mt-1 break-words">{notification.message}</p>
          <p className="text-white/30 text-xs mt-2">
            {new Date(notification.timestamp).toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button 
          onClick={onClose} 
          className="flex-shrink-0 text-white/40 hover:text-white transition-colors"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  )
}

export default NotificationToast