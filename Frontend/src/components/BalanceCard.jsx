// src/components/BalanceCard.jsx
import React, { useState } from 'react'
import { FaEye, FaEyeSlash, FaCopy, FaQrcode } from 'react-icons/fa'
import toast from 'react-hot-toast'
// Remplacer l'import de qrcode.react par qrcode
import QRCode from 'qrcode'

function BalanceCard({ balance, user, onShowQR }) {
  const [showBalance, setShowBalance] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)

  const formatAmount = (amount) => {
    return amount.toLocaleString() + ' FCFA'
  }

  const copyPhone = () => {
    navigator.clipboard.writeText(user.phone)
    toast.success('Numéro copié')
  }

  const generateQRCode = async () => {
    const qrData = JSON.stringify({
      type: 'transfer',
      recipient: user.phone,
      name: user.fullname,
      currency: 'XAF'
    })
    
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0A2F6C',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
    } catch (err) {
      console.error('Erreur génération QR:', err)
      toast.error('Erreur lors de la génération du QR code')
    }
  }

  const handleShowQR = async () => {
    if (!qrCodeUrl) {
      await generateQRCode()
    }
    setShowQR(true)
  }

  return (
    <>
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-white/70 text-sm">Solde disponible</p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  {showBalance ? formatAmount(balance) : '•••••••• FCFA'}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {showBalance ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">💰</span>
            </div>
          </div>
          
          {/* User info */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/20">
            <div>
              <p className="text-white/60 text-xs">Compte</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-sm">{user.phone}</p>
                <button
                  onClick={copyPhone}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <FaCopy size={12} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs">Wallet ID</p>
              <p className="text-white font-mono text-xs">CP-{user.id?.toString().padStart(6, '0')}</p>
            </div>
            <button
              onClick={handleShowQR}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-all"
            >
              <FaQrcode size={14} className="text-white" />
              <span className="text-white text-sm">Mon QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="card max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-xl mb-4">Mon QR Code CashPays</h3>
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto mb-4">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg"></div>
              )}
            </div>
            <p className="text-white/60 text-sm mb-2">Scannez ce code pour me payer</p>
            <p className="text-white/40 text-xs font-mono">{user.phone}</p>
            <button
              onClick={() => setShowQR(false)}
              className="btn-secondary w-full mt-4"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default BalanceCard