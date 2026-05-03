// src/components/CameraQRScanner.jsx - Version corrigée avec création dynamique de l'élément
import React, { useState, useEffect, useRef } from 'react'
import { FaTimes, FaCamera, FaUpload, FaSpinner, FaQrcode, FaCopy } from 'react-icons/fa'
import { Html5Qrcode } from 'html5-qrcode'

function CameraQRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const scannerRef = useRef(null)
  const containerRef = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    
    // Vérifier si le navigateur supporte la caméra
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Votre navigateur ne supporte pas l'accès à la caméra")
      setShowManualInput(true)
      return
    }
    
    // Attendre que le DOM soit prêt
    const timer = setTimeout(() => {
      startScanner()
    }, 500)
    
    return () => {
      clearTimeout(timer)
      isMounted.current = false
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    setError(null)
    setScanning(true)
    
    try {
      // Nettoyer l'ancien scanner s'il existe
      if (scannerRef.current) {
        await stopScanner()
      }
      
      // Créer l'élément s'il n'existe pas
      let readerElement = document.getElementById('qr-reader')
      if (!readerElement && containerRef.current) {
        readerElement = document.createElement('div')
        readerElement.id = 'qr-reader'
        readerElement.style.width = '100%'
        readerElement.style.minHeight = '300px'
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(readerElement)
      }
      
      if (!readerElement) {
        throw new Error("Impossible de créer l'élément de scan")
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
          // Ignorer les erreurs de scan normales
          console.debug("Scan en cours...")
        }
      )
      
      if (isMounted.current) {
        setHasPermission(true)
        setScanning(false)
      }
      
    } catch (err) {
      console.error("Erreur démarrage scanner:", err)
      if (isMounted.current) {
        if (err.name === 'NotAllowedError') {
          setError("Permission refusée. Veuillez autoriser l'accès à la caméra.")
        } else if (err.name === 'NotFoundError') {
          setError("Aucune caméra trouvée sur cet appareil.")
        } else {
          setError("Erreur d'accès à la caméra. Utilisez la saisie manuelle.")
        }
        setShowManualInput(true)
        setScanning(false)
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
    
    // Nettoyer l'élément
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
  }

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      onClose()
    } else {
      setError("Veuillez saisir un code QR ou un numéro de téléphone")
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (content) {
        onScan(content)
        onClose()
      }
    }
    reader.readAsText(file)
  }

  const retryScanner = () => {
    setShowManualInput(false)
    setError(null)
    setManualInput('')
    setTimeout(() => {
      startScanner()
    }, 100)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setManualInput(text)
      toast.success('Contenu collé')
    } catch (err) {
      setError("Impossible de lire le presse-papier")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-900 to-blue-800">
        <div className="flex items-center gap-2">
          {!showManualInput && hasPermission ? (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          ) : (
            <FaCamera className="text-blue-400" />
          )}
          <h3 className="text-white font-semibold">
            {!showManualInput && hasPermission ? 'Scanner un QR code' : 'Saisie QR code'}
          </h3>
        </div>
        <button onClick={() => { stopScanner(); onClose() }} className="text-white/60 hover:text-white">
          <FaTimes size={20} />
        </button>
      </div>
      
      {/* Contenu */}
      <div className="flex-1 p-4">
        {!showManualInput && !error ? (
          <div className="relative">
            {/* Conteneur pour le scanner */}
            <div 
              ref={containerRef}
              className="w-full rounded-xl overflow-hidden bg-black"
              style={{ minHeight: '350px' }}
            />
            
            {/* Indicateur de scan */}
            {scanning && (
              <div className="absolute top-4 right-4">
                <div className="bg-blue-500/20 rounded-full px-3 py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span className="text-blue-400 text-xs">Initialisation...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Overlay avec cadre */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-64 h-64">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
                </div>
              </div>
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <p className="text-white/70 text-sm">Placez le QR code dans le cadre</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={retryScanner}
                  className="mt-2 text-blue-400 text-sm hover:underline"
                >
                  Réessayer avec la caméra
                </button>
              </div>
            )}
            
            <div>
              <label className="label text-white">Saisie manuelle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Collez le QR code ou le numéro de téléphone"
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 rounded-lg transition-all"
                  title="Coller"
                >
                  <FaCopy />
                </button>
              </div>
              <p className="text-white/40 text-xs mt-1">
                Format accepté: numéro à 8 chiffres ou JSON {"{recipient: '66234567'}"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManualSubmit}
                className="flex-1 btn-primary"
              >
                <FaQrcode className="inline mr-1" /> Valider
              </button>
              <label className="flex-1 btn-secondary text-center cursor-pointer">
                <FaUpload className="inline mr-1" /> Importer
                <input
                  type="file"
                  accept=".txt,.json,.qr"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={retryScanner}
              className="w-full text-white/40 text-sm py-2 hover:text-white/60"
            >
              <FaCamera className="inline mr-1" /> Utiliser la caméra
            </button>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800">
        {!showManualInput && hasPermission ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowManualInput(true)}
              className="flex-1 btn-secondary"
            >
              Saisie manuelle
            </button>
            <button
              onClick={() => { stopScanner(); onClose() }}
              className="flex-1 btn-secondary"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full btn-secondary"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  )
}

export default CameraQRScanner