// src/components/CameraQRScanner.jsx
import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { 
  FaTimes, FaCamera, FaExchangeAlt, FaLightbulb 
} from 'react-icons/fa'

function CameraQRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null)
  const [torchOn, setTorchOn] = useState(false)
  const scannerRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    startScanner()
    
    return () => {
      isMounted.current = false
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    // Nettoyer l'ancien scanner s'il existe
    if (scannerRef.current) {
      await stopScanner()
    }
    
    try {
      // Vérifier si l'élément existe déjà et le nettoyer
      const readerElement = document.getElementById('qr-reader')
      if (readerElement) {
        // Vider l'élément
        while (readerElement.firstChild) {
          readerElement.removeChild(readerElement.firstChild)
        }
      }
      
      // Créer une nouvelle instance
      scannerRef.current = new Html5Qrcode("qr-reader")
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: "environment"
        }
      }
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (isMounted.current) {
            onScan(decodedText)
            stopScanner()
            onClose()
          }
        },
        (errorMessage) => {
          // Ignorer les erreurs normales de scan
          console.debug("Scan en cours...")
        }
      )
      
    } catch (err) {
      console.error("Erreur démarrage scanner:", err)
      if (isMounted.current) {
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      }
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (err) {
        console.error("Erreur arrêt scanner:", err)
      }
      scannerRef.current = null
    }
    
    // Nettoyer l'élément DOM
    const readerElement = document.getElementById('qr-reader')
    if (readerElement) {
      while (readerElement.firstChild) {
        readerElement.removeChild(readerElement.firstChild)
      }
    }
  }

  const toggleTorch = () => {
    const newState = !torchOn
    setTorchOn(newState)
    
    // Gestion de la lampe torche
    try {
      const videoElement = document.querySelector('#qr-reader video')
      if (videoElement && videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0]
        if (track && track.applyConstraints) {
          track.applyConstraints({
            advanced: [{ torch: newState }]
          }).catch(e => console.warn("Lampe torche non supportée"))
        }
      }
    } catch (e) {
      console.warn("Lampe torche non supportée")
    }
  }

  const handleManualInput = () => {
    const code = prompt("Entrez le code QR manuellement:")
    if (code && code.trim()) {
      onScan(code.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-900 to-blue-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FaCamera className="text-blue-400 text-xl" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Scanner un QR code</h3>
            <p className="text-white/50 text-xs">Placez le QR code dans le cadre</p>
          </div>
        </div>
        <button 
          onClick={() => { stopScanner(); onClose() }} 
          className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
        >
          <FaTimes size={20} />
        </button>
      </div>
      
      {/* Zone de scan */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-red-400 text-5xl mb-4">📷</div>
              <p className="text-red-300 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={startScanner} className="btn-primary">
                  Réessayer
                </button>
                <button onClick={handleManualInput} className="btn-secondary">
                  Saisie manuelle
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Conteneur unique pour le scanner */}
            <div id="qr-reader" className="w-full h-full min-h-[400px]"></div>
            
            {/* Overlay de scan */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Cadre de scan */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-72 h-72">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg"></div>
                  
                  {/* Animation de scan */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan"></div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <div className="inline-block bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                  <p className="text-white/80 text-sm">
                    <FaExchangeAlt className="inline mr-1 animate-pulse" />
                    Scannez le QR code CashPays
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800">
        <div className="flex gap-3 mb-3">
          <button
            onClick={handleManualInput}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <FaCamera /> Saisie manuelle
          </button>
          <button
            onClick={toggleTorch}
            className={`btn-secondary flex items-center justify-center gap-2 ${
              torchOn ? 'bg-yellow-500/30 text-yellow-400' : ''
            }`}
          >
            <FaLightbulb /> Lampe
          </button>
        </div>
        
        <button
          onClick={() => { stopScanner(); onClose() }}
          className="w-full text-white/50 text-center py-2 hover:text-white/70 transition-colors"
        >
          Annuler
        </button>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        .border-t-3 {
          border-top-width: 3px;
        }
        .border-l-3 {
          border-left-width: 3px;
        }
        .border-r-3 {
          border-right-width: 3px;
        }
        .border-b-3 {
          border-bottom-width: 3px;
        }
        #qr-reader {
          background: #000;
        }
        #qr-reader video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  )
}

export default CameraQRScanner