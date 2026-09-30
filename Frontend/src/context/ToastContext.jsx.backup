// src/context/ToastContext.jsx - Version simplifiée
import React, { createContext, useContext, useState, useCallback } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
    
    setTimeout(() => {
      removeToast(id)
    }, duration)
    
    return id
  }, [removeToast])

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast])
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast])
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast])
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast])

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <FaCheckCircle className="text-green-400" size={20} />
      case 'error': return <FaExclamationTriangle className="text-red-400" size={20} />
      case 'warning': return <FaExclamationTriangle className="text-yellow-400" size={20} />
      default: return <FaInfoCircle className="text-blue-400" size={20} />
    }
  }

  const getBgColor = (type) => {
    switch(type) {
      case 'success': return 'bg-green-800/95 border-green-500'
      case 'error': return 'bg-red-800/95 border-red-500'
      case 'warning': return 'bg-yellow-800/95 border-yellow-500'
      default: return 'bg-blue-800/95 border-blue-500'
    }
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      <div className="fixed top-4 right-4 left-4 md:left-auto z-50 space-y-2 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`max-w-md w-full md:w-96 ${getBgColor(toast.type)} backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden border-l-4 transition-all duration-300 transform translate-y-0 opacity-100`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getIcon(toast.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm break-words">
                      {toast.message}
                    </p>
                  </div>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {children}
    </ToastContext.Provider>
  )
}