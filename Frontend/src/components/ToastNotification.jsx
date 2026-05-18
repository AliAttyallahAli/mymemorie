// src/components/ToastNotification.jsx
import React, { useEffect, useState } from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaMoneyBillWave } from 'react-icons/fa';

function ToastNotification({ notification, onClose, onClick }) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 2;
            });
        }, 80);
        
        return () => clearInterval(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (notification.type) {
            case 'transaction_received':
                return <FaMoneyBillWave className="text-green-400 text-xl" />;
            case 'transaction_sent':
                return <FaCheckCircle className="text-blue-400 text-xl" />;
            case 'alert':
                return <FaExclamationTriangle className="text-yellow-400 text-xl" />;
            default:
                return <FaInfoCircle className="text-blue-400 text-xl" />;
        }
    };

    const getBgColor = () => {
        switch (notification.type) {
            case 'transaction_received':
                return 'bg-gradient-to-r from-green-900 to-green-800';
            case 'transaction_sent':
                return 'bg-gradient-to-r from-blue-900 to-blue-800';
            case 'alert':
                return 'bg-gradient-to-r from-yellow-900 to-yellow-800';
            default:
                return 'bg-gradient-to-r from-blue-900 to-blue-800';
        }
    };

    const getBorderColor = () => {
        switch (notification.type) {
            case 'transaction_received':
                return 'border-green-500';
            case 'transaction_sent':
                return 'border-blue-500';
            case 'alert':
                return 'border-yellow-500';
            default:
                return 'border-blue-500';
        }
    };

    return (
        <div 
            className={`fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-96 ${getBgColor()} 
                        backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden z-50 cursor-pointer
                        border-l-4 ${getBorderColor()} animate-slide-down`}
            onClick={onClick}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold text-sm">
                                {notification.title}
                            </h4>
                            {notification.amount && (
                                <span className="text-green-300 text-xs font-mono">
                                    +{notification.amount.toLocaleString()} FCFA
                                </span>
                            )}
                        </div>
                        <p className="text-white/70 text-sm break-words">
                            {notification.message}
                        </p>
                        <p className="text-white/30 text-xs mt-1">
                            {new Date().toLocaleTimeString('fr-FR')}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            </div>
            
            {/* Barre de progression */}
            <div 
                className="h-1 bg-white/20 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
            >
                <div className="h-full bg-white/50 rounded-full"></div>
            </div>
        </div>
    );
}

export default ToastNotification;