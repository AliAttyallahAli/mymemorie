// src/components/ToastContainer.jsx
import React from 'react'
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaMoneyBillWave } from 'react-icons/fa'

function ToastContainer({ toasts, onClose, onNavigate }) {
    if (toasts.length === 0) return null

    const getIcon = (type) => {
        switch (type) {
            case 'transaction_received':
                return <FaMoneyBillWave className="text-green-400 text-xl" />
            case 'transaction_sent':
                return <FaCheckCircle className="text-blue-400 text-xl" />
            case 'alert':
                return <FaExclamationTriangle className="text-yellow-400 text-xl" />
            default:
                return <FaInfoCircle className="text-blue-400 text-xl" />
        }
    }

    const getBgColor = (type) => {
        switch (type) {
            case 'transaction_received':
                return 'bg-gradient-to-r from-green-900 to-green-800'
            case 'transaction_sent':
                return 'bg-gradient-to-r from-blue-900 to-blue-800'
            case 'alert':
                return 'bg-gradient-to-r from-yellow-900 to-yellow-800'
            default:
                return 'bg-gradient-to-r from-blue-900 to-blue-800'
        }
    }

    return (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${getBgColor(toast.type)} backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden 
                                border-l-4 border-green-500 cursor-pointer animate-slide-down`}
                    onClick={() => {
                        if (toast.link && onNavigate) onNavigate(toast.link)
                        onClose(toast.id)
                    }}
                >
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {getIcon(toast.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-white font-semibold text-sm">
                                    {toast.title}
                                </h4>
                                <p className="text-white/70 text-sm break-words">
                                    {toast.message}
                                </p>
                                <p className="text-white/30 text-xs mt-1">
                                    {new Date().toLocaleTimeString('fr-FR')}
                                </p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(toast.id) }}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="h-1 bg-white/20">
                        <div className="h-full bg-white/50 rounded-full animate-progress" style={{ width: '100%' }}></div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default ToastContainer