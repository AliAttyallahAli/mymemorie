// src/components/QRScanner.jsx
import React, { useState, useEffect, useRef } from 'react'
import { FaCamera, FaTimes, FaExclamationTriangle, FaRedo, FaUpload, FaKey } from 'react-icons/fa'

function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null)
  const [permissionState, setPermissionState] = useState('prompt') // 'prompt', 'granted', 'denied'
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    // Vérifier la permission avant de démarrer
    checkCameraPermission()
    
    return () => {
      stopCamera()
    }
  }, [])

  const checkCameraPermission = async () => {
    try {
      // Vérifier si la permission a déjà été accordée
      const result = await navigator.permissions.query({ name: 'camera' })
      setPermissionState(result.state)
      
      if (result.state === 'granted') {
        startCamera()
      } else if (result.state === 'prompt') {
        // Essayer de démarrer, cela demandera la permission
        startCamera()
      }
      
      result.addEventListener('change', () => {
        setPermissionState(result.state)
        if (result.state === 'granted') {
          startCamera()
        }
      })
    } catch (err) {
      console.warn('Permission API not supported, trying direct request')
      startCamera()
    }
  }

  const startCamera = async () => {
    if (streamRef.current) {
      stopCamera()
    }
    
    setIsScanning(true)
    setError(null)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setPermissionState('granted')
        startScanning()
      }
    } catch (err) {
      console.error('Camera error:', err)
      
      if (err.name === 'NotAllowedError') {
        setError('Accès à la caméra refusé. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.')
        setPermissionState('denied')
      } else if (err.name === 'NotFoundError') {
        setError('Aucune caméra trouvée sur votre appareil.')
      } else if (err.name === 'NotReadableError') {
        setError('La caméra est déjà utilisée par une autre application.')
      } else {
        setError(`Erreur d'accès à la caméra: ${err.message}`)
      }
      
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    const scanInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Simuler un scan - dans un vrai projet, utilisez une librairie de QR code
        // Pour cet exemple, on attend une entrée manuelle
      }
    }, 500)
    
    return () => clearInterval(scanInterval)
  }

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError('Veuillez saisir un numéro ou un code QR')
      return
    }
    
    try {
      let qrData
      // Essayer de parser si c'est du JSON
      if (manualInput.startsWith('{')) {
        qrData = JSON.parse(manualInput)
      } else {
        // Sinon, considérer que c'est un numéro de téléphone
        qrData = { recipient: manualInput }
      }
      
      if (onScan) {
        onScan({ text: manualInput, data: qrData })
      }
      onClose()
    } catch (err) {
      // Si le JSON est invalide, traiter comme du texte brut
      if (onScan) {
        onScan({ text: manualInput })
      }
      onClose()
    }
  }

  const requestPermissionAgain = () => {
    setError(null)
    startCamera()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
      <div className="relative w-full max-w-md bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FaCamera className="text-blue-400" /> Scanner un QR Code
          </h3>
          <button
            onClick={() => {
              stopCamera()
              onClose()
            }}
            className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          {/* Permission refusée */}
          {permissionState === 'denied' && (
            <div className="text-center py-8">
              <div className="inline-flex p-4 bg-yellow-500/20 rounded-full mb-4">
                <FaExclamationTriangle className="text-yellow-400 text-4xl" />
              </div>
              <h4 className="text-white font-semibold mb-2">Accès à la caméra refusé</h4>
              <p className="text-white/60 text-sm mb-4">
                Pour scanner un QR code, vous devez autoriser l'accès à la caméra.
              </p>
              <div className="bg-white/10 rounded-lg p-3 mb-4 text-left">
                <p className="text-white/70 text-xs mb-2">Comment autoriser l'accès :</p>
                <ul className="text-white/50 text-xs space-y-1 list-disc pl-4">
                  <li>Cliquez sur l'icône 🔒 dans la barre d'adresse</li>
                  <li>Sélectionnez "Autoriser" pour la caméra</li>
                  <li>Rechargez la page</li>
                </ul>
              </div>
              <button
                onClick={requestPermissionAgain}
                className="btn-primary inline-flex items-center gap-2"
              >
                <FaRedo /> Réessayer
              </button>
            </div>
          )}

          {/* Erreur technique */}
          {error && permissionState !== 'denied' && (
            <div className="text-center py-8">
              <div className="inline-flex p-4 bg-red-500/20 rounded-full mb-4">
                <FaExclamationTriangle className="text-red-400 text-4xl" />
              </div>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button
                onClick={requestPermissionAgain}
                className="btn-primary inline-flex items-center gap-2"
              >
                <FaRedo /> Réessayer
              </button>
            </div>
          )}

          {/* Scanner actif */}
          {permissionState === 'granted' && !error && (
            <div>
              <div className="relative bg-black rounded-xl overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overlay de scan */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/50">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-48 h-48 border-2 border-blue-400 rounded-lg">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-white/50 text-xs text-center mb-4">
                Placez le QR code dans le cadre pour le scanner
              </p>
            </div>
          )}

          {/* Saisie manuelle alternative */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <p className="text-white/60 text-sm mb-3 flex items-center gap-2">
              <FaKey className="text-blue-400" /> Ou saisissez manuellement :
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Numéro de téléphone ou code QR"
                className="input-field flex-1"
              />
              <button
                onClick={handleManualSubmit}
                className="btn-primary px-4"
              >
                Valider
              </button>
            </div>
            <p className="text-white/30 text-xs mt-2">
              Exemple: 62787307 ou {"{\"recipient\":\"62787307\"}"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-white/30 text-xs text-center">
            📱 Cas où la caméra ne fonctionne pas, utilisez la saisie manuelle
          </p>
        </div>
      </div>
    </div>
  )
}

export default QRScanner