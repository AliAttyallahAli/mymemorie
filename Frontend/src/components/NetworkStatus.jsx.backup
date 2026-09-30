// src/components/NetworkStatus.jsx
import React, { useState, useEffect } from 'react'
//import { FaWifi, FaWifiOff } from 'react-icons/fa'  // Changé: FaWifiSlash → FaWifiOff

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div className={`fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 rounded-xl p-3 shadow-lg transition-all ${
      isOnline ? 'bg-green-600' : 'bg-red-600'
    }`}>
      <div className="flex items-center gap-2">
        {isOnline ? <FaWifi className="text-white" /> : <FaWifiOff className="text-white" />}
        <span className="text-white text-sm">
          {isOnline ? '✓ Connexion rétablie' : '⚠️ Connexion perdue. Mode hors ligne actif.'}
        </span>
      </div>
    </div>
  )
}

export default NetworkStatus