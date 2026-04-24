// src/components/QRScanner.jsx
import React, { useEffect, useRef, useState } from 'react'
import { FaTimes, FaCamera, FaSync, FaLightbulb, FaRegLightbulb } from 'react-icons/fa'
import { Html5Qrcode } from 'html5-qrcode'

function QRScanner({ onScan, onClose }) {
  const [torchOn, setTorchOn] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [cameraFacing, setCameraFacing] = useState('environment') // 'environment' ou 'user'
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    const startScanner = async () => {
      try {
        // Nettoyer l'ancien scanner s'il existe
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop()
          } catch (e) {}
        }

        // Créer une nouvelle instance du scanner
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-container")
        
        // Démarrer le scan avec la caméra spécifiée
        await html5QrCodeRef.current.start(
          { facingMode: cameraFacing },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
              facingMode: cameraFacing
            }
          },
          (decodedText) => {
            // Succès du scan
            if (scanning) {
              setScanning(false)
              try {
                let qrData
                if (decodedText.startsWith('{')) {
                  qrData = JSON.parse(decodedText)
                } else {
                  qrData = { recipient: decodedText }
                }
                onScan(qrData)
                stopScanner()
                onClose()
              } catch (e) {
                onScan({ recipient: decodedText })
                stopScanner()
                onClose()
              }
            }
          },
          (errorMessage) => {
            // Erreur de scan (ignorer, c'est normal)
            // console.warn(errorMessage)
          }
        )
        
        setCameraError(null)
      } catch (err) {
        console.error("Erreur d'accès à la caméra:", err)
        
        // Si la caméra arrière échoue, essayer la caméra avant
        if (cameraFacing === 'environment') {
          setCameraFacing('user')
        } else {
          setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions et réessayez.")
        }
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
  }, [cameraFacing])

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.error("Erreur lors de l'arrêt du scanner:", err)
      }
    }
  }

  const switchCamera = async () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')
  }

  const toggleTorch = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      const torch = !torchOn
      // La torche n'est pas directement supportée par html5-qrcode
      // On va essayer d'appliquer la contrainte
      try {
        const videoElement = document.querySelector('#qr-reader-container video')
        if (videoElement && videoElement.srcObject) {
          const track = videoElement.srcObject.getVideoTracks()[0]
          if (track && track.getCapabilities().torch) {
            track.applyConstraints({ advanced: [{ torch: torch }] })
            setTorchOn(torch)
          } else {
            toast.error('Lampe torche non disponible sur cet appareil')
          }
        }
      } catch (err) {
        console.error('Erreur torche:', err)
        toast.error('Lampe torche non disponible')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="relative w-full max-w-md h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-900 to-blue-800">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FaCamera /> Scanner un QR code
          </h3>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Contenu du scanner */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {cameraError ? (
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-4">📷</div>
              <p className="text-red-300 mb-4">{cameraError}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setCameraError(null)
                    setCameraFacing('environment')
                  }}
                  className="btn-primary"
                >
                  Réessayer
                </button>
                <button
                  onClick={() => {
                    setShowManualInput(true)
                    onClose()
                  }}
                  className="btn-secondary"
                >
                  Saisie manuelle
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Zone de scan */}
              <div className="relative">
                <div 
                  id="qr-reader-container" 
                  className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl bg-black"
                />
                
                {/* Overlay de guidage */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-64">
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    
                    {/* Ligne de scan animée */}
                    <div className="absolute left-0 right-0 top-0 animate-scan">
                      <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent w-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <p className="text-white/60 text-sm text-center mt-6 max-w-xs">
                Placez le QR code dans le cadre pour le scanner automatiquement
              </p>
            </>
          )}
        </div>

        {/* Footer avec boutons de contrôle */}
        {!cameraError && (
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-blue-900 to-blue-800">
            <div className="flex justify-center gap-6 mb-4">
              <button
                onClick={switchCamera}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all w-12 h-12 flex items-center justify-center"
                title="Changer de caméra"
              >
                <FaSync size={18} />
              </button>
              <button
                onClick={toggleTorch}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all w-12 h-12 flex items-center justify-center"
                title={torchOn ? "Éteindre la lampe" : "Allumer la lampe"}
              >
                {torchOn ? <FaLightbulb size={18} /> : <FaRegLightbulb size={18} />}
              </button>
            </div>
            <button
              onClick={() => {
                stopScanner()
                onClose()
              }}
              className="w-full btn-secondary text-center"
            >
              Annuler
            </button>
            <p className="text-white/30 text-xs text-center mt-3">
              Ou saisissez le numéro manuellement
            </p>
          </div>
        )}
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
      `}</style>
    </div>
  )
}

export default QRScanner