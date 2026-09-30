// src/components/Html5QRScanner.jsx
import React, { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function Html5QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader")
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    }
    
    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        html5QrCode.stop()
        onScan(decodedText)
        onClose()
      },
      (errorMessage) => {
        // Ignorer les erreurs normales de scan
        console.debug(errorMessage)
      }
    ).catch(err => {
      console.error('Erreur démarrage scanner:', err)
    })
    
    return () => {
      html5QrCode.stop().catch(console.error)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="p-4 flex justify-between items-center bg-blue-900">
        <h3 className="text-white">Scanner un QR code</h3>
        <button onClick={onClose} className="text-white">✕</button>
      </div>
      <div id="qr-reader" className="flex-1 p-4"></div>
    </div>
  )
}

export default Html5QRScanner