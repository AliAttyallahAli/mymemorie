// src/components/QRScanner.jsx - Version corrigée
import React, { useState, useRef, useEffect } from 'react'
import { FaTimes, FaCamera } from 'react-icons/fa'

function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    
    try {
      // Demander la permission d'accéder à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Caméra arrière
      })
      
      streamRef.current = stream
      setHasPermission(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true) // Important pour iOS
        
        // Gérer la lecture vidéo avec Promise
        const playPromise = videoRef.current.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Caméra démarrée avec succès')
              startScanning()
            })
            .catch(err => {
              console.error('Erreur de lecture vidéo:', err)
              setError('Impossible de démarrer la caméra. Vérifiez les permissions.')
            })
        }
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err)
      if (err.name === 'NotAllowedError') {
        setError('Permission refusée. Veuillez autoriser l\'accès à la caméra.')
      } else if (err.name === 'NotFoundError') {
        setError('Aucune caméra trouvée sur cet appareil.')
      } else {
        setError('Erreur d\'accès à la caméra. Vérifiez vos permissions.')
      }
      setHasPermission(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      tracks.forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.pause()
    }
  }

  const startScanning = () => {
    // Simulation du scan - dans une vraie implémentation,
    // utilisez une bibliothèque comme html5-qrcode
    setScanning(true)
    
    // Pour la démo, on va scanner périodiquement
    const scanInterval = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        // Simulation - dans la réalité, analysez l'image ici
        // Pour l'instant, on affiche juste un message
        console.log('Scanning...')
      }
    }, 500)
    
    return () => clearInterval(scanInterval)
  }

  const handleManualInput = () => {
    const code = prompt('Entrez le code QR manuellement:')
    if (code && onScan) {
      onScan({ text: code })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-blue-900">
        <div className="flex items-center gap-2">
          <FaCamera className="text-white" />
          <h3 className="text-white font-semibold">Scanner un QR code</h3>
        </div>
        <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-lg transition-all">
          <FaTimes size={20} />
        </button>
      </div>
      
      {/* Zone de scan */}
      <div className="flex-1 relative flex items-center justify-center">
        {!hasPermission && !error && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Demande d'accès à la caméra...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center p-4">
            <div className="text-red-400 text-5xl mb-4">📷</div>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="btn-primary"
            >
              Réessayer
            </button>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          style={{ display: hasPermission && !error ? 'block' : 'none' }}
        />
        
        {/* Overlay de scan */}
        {hasPermission && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-64 h-64 border-2 border-blue-400 rounded-lg shadow-lg">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
              </div>
            </div>
            <div className="absolute bottom-20 left-0 right-0 text-center">
              <p className="text-white/80 text-sm">Placez le QR code dans le cadre</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-blue-900">
        <button
          onClick={handleManualInput}
          className="btn-secondary w-full mb-2"
        >
          Saisir manuellement
        </button>
        <button
          onClick={onClose}
          className="text-white/60 text-center w-full py-2"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

export default QRScanner