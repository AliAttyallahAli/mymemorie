// src/components/QRCodeManualInput.jsx
import React, { useState } from 'react'
import { FaTimes, FaQrcode, FaUpload, FaCopy } from 'react-icons/fa'
import toast from 'react-hot-toast'

function QRCodeManualInput({ onScan, onClose }) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      setError("Veuillez saisir un code QR")
      return
    }
    
    try {
      let data
      if (inputValue.startsWith('{')) {
        data = JSON.parse(inputValue)
        if (data.recipient) {
          onScan(data.recipient)
        } else if (data.phone) {
          onScan(data.phone)
        } else {
          throw new Error('Format invalide')
        }
      } else if (/^\d{8}$/.test(inputValue)) {
        onScan(inputValue)
      } else {
        // Essayer comme URL
        try {
          const url = new URL(inputValue)
          const phoneParam = url.searchParams.get('phone')
          if (phoneParam) {
            onScan(phoneParam)
          } else {
            throw new Error('Format invalide')
          }
        } catch {
          throw new Error('Format invalide')
        }
      }
      onClose()
    } catch (e) {
      setError("Format de QR code invalide")
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

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInputValue(text)
      toast.success('Contenu collé')
    } catch (err) {
      toast.error("Impossible de lire le presse-papier")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2"><FaQrcode className="text-blue-400" /> Saisir QR code</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30"><p className="text-red-400 text-sm">{error}</p></div>}
          <div>
            <label className="label text-white">Contenu du QR code</label>
            <div className="flex gap-2">
              <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="input-field flex-1" rows="3" placeholder='Collez le QR code ici ou le lien :&#10;http://localhost:5173/transfer?phone=66234567' />
              <button type="button" onClick={pasteFromClipboard} className="bg-white/10 hover:bg-white/20 text-white px-3 rounded-lg transition-all h-10" title="Coller"><FaCopy /></button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="flex-1 btn-primary"><FaQrcode className="inline mr-1" /> Valider</button>
            <label className="flex-1 btn-secondary text-center cursor-pointer"><FaUpload className="inline mr-1" /> Importer<input type="file" accept=".txt,.json" onChange={handleFileUpload} className="hidden" /></label>
          </div>
          <div className="bg-white/5 rounded-lg p-3"><p className="text-white/50 text-xs text-center">💡 Scannez un QR code CashPays ou collez le lien de paiement</p></div>
        </div>
      </div>
    </div>
  )
}

export default QRCodeManualInput