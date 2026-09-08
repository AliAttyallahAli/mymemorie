// src/components/QRCodeModal.jsx
import React, { useState, useRef } from 'react'
import { 
  FaTimes, FaQrcode, FaUpload, FaPaste, FaEye, 
  FaCheckCircle, FaExclamationTriangle, FaCopy,
  FaArrowRight, FaTrash, FaFileAlt, FaKeyboard
} from 'react-icons/fa'
import toast from 'react-hot-toast'

function QRCodeModal({ isOpen, onClose, onConfirm, title = "Saisir un QR code" }) {
  const [qrInput, setQrInput] = useState('')
  const [mode, setMode] = useState('manual') // 'manual' ou 'file'
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const validateAndParse = (input) => {
    setError(null)
    setParsedData(null)
    
    if (!input || input.trim() === '') {
      setError('Veuillez saisir un QR code ou un numéro de téléphone')
      return false
    }
    
    const trimmedInput = input.trim()
    
    // Vérifier si c'est un numéro de téléphone (8 chiffres)
    if (/^\d{8}$/.test(trimmedInput)) {
      setParsedData({
        type: 'phone',
        recipient: trimmedInput,
        name: null,
        amount: null
      })
      return true
    }
    
    // Essayer de parser du JSON
    try {
      const jsonData = JSON.parse(trimmedInput)
      
      if (jsonData.recipient || jsonData.phone || jsonData.numero) {
        setParsedData({
          type: 'json',
          recipient: jsonData.recipient || jsonData.phone || jsonData.numero,
          name: jsonData.name || jsonData.nom || null,
          amount: jsonData.amount || jsonData.montant || null,
          raw: jsonData
        })
        return true
      } else {
        setError('Format JSON invalide : aucun destinataire trouvé')
        return false
      }
    } catch (e) {
      // Ce n'est pas du JSON valide
      setError('Format invalide. Utilisez un numéro à 8 chiffres ou un JSON valide')
      return false
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setQrInput(text)
      validateAndParse(text)
      toast.success('Texte collé avec succès')
    } catch (err) {
      toast.error('Impossible de lire le presse-papier')
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (content) {
        setQrInput(content)
        validateAndParse(content)
        setPreview(content.substring(0, 200) + (content.length > 200 ? '...' : ''))
        toast.success('Fichier chargé avec succès')
      }
    }
    reader.readAsText(file)
  }

  const handleConfirm = () => {
    if (validateAndParse(qrInput) && parsedData) {
      onConfirm(parsedData)
      onClose()
      setQrInput('')
      setPreview(null)
      setError(null)
      setParsedData(null)
    }
  }

  const handleClear = () => {
    setQrInput('')
    setPreview(null)
    setError(null)
    setParsedData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const exampleFormats = [
    { label: 'Numéro simple', value: '66234567' },
    { label: 'Format JSON', value: '{"recipient":"66234567","amount":5000,"name":"Jean"}' },
    { label: 'Format court', value: 'recipient:66234567,amount:5000' }
  ]

  const fillExample = (example) => {
    setQrInput(example)
    validateAndParse(example)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="relative max-w-lg w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaQrcode className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{title}</h2>
              <p className="text-blue-200 text-xs">Saisissez le QR code manuellement</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === 'manual' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <FaKeyboard /> Saisie manuelle
            </button>
            <button
              onClick={() => setMode('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                mode === 'file' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <FaUpload /> Importer un fichier
            </button>
          </div>

          {/* Zone de saisie */}
          {mode === 'manual' ? (
            <div className="space-y-4">
              <div>
                <label className="label block mb-2">
                  Contenu du QR code ou numéro de téléphone
                </label>
                <textarea
                  value={qrInput}
                  onChange={(e) => {
                    setQrInput(e.target.value)
                    if (e.target.value) {
                      validateAndParse(e.target.value)
                    } else {
                      setError(null)
                      setParsedData(null)
                    }
                  }}
                  className="input-field w-full"
                  rows="4"
                  placeholder={`Exemples:
- 66234567
- {"recipient":"66234567","amount":5000}
- recipient:66234567,amount:5000`}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePaste}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all"
                >
                  <FaPaste /> Coller
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all"
                >
                  <FaTrash /> Effacer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-400 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.json,.qr,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="qr-file-input"
                />
                <label
                  htmlFor="qr-file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-4 bg-blue-500/20 rounded-full">
                    <FaFileAlt className="text-blue-400 text-3xl" />
                  </div>
                  <p className="text-white font-medium">Cliquez pour importer un fichier</p>
                  <p className="text-white/40 text-sm">.txt, .json, .qr</p>
                </label>
              </div>
              
              {preview && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/50 text-xs mb-1">Aperçu :</p>
                  <p className="text-white/70 text-xs font-mono break-all">{preview}</p>
                </div>
              )}
            </div>
          )}

          {/* Exemples */}
          <div className="mt-4">
            <p className="text-white/50 text-xs mb-2">📋 Formats acceptés :</p>
            <div className="flex flex-wrap gap-2">
              {exampleFormats.map((example, index) => (
                <button
                  key={index}
                  onClick={() => fillExample(example.value)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white/70 px-2 py-1 rounded-lg transition-all"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {/* Résultat de validation */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-xl border border-red-500/30 flex items-start gap-2">
              <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Erreur de validation</p>
                <p className="text-red-300/80 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Aperçu des données parsées */}
          {parsedData && !error && (
            <div className="mt-4 p-3 bg-green-500/20 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-400" />
                <p className="text-green-400 text-sm font-medium">Données validées</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Destinataire :</span>
                  <span className="text-white font-mono">{parsedData.recipient}</span>
                </div>
                {parsedData.name && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Nom :</span>
                    <span className="text-white">{parsedData.name}</span>
                  </div>
                )}
                {parsedData.amount && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Montant :</span>
                    <span className="text-white font-bold">{parsedData.amount} FCFA</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!parsedData || !!error}
              className={`flex-1 flex items-center justify-center gap-2 ${
                !parsedData || !!error
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              Valider <FaArrowRight />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-black/20 text-center">
          <p className="text-white/30 text-xs">
            💡 Le QR code AlkherPay contient le numéro de téléphone du destinataire
          </p>
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal