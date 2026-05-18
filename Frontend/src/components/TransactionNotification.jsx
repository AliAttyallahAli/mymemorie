// src/components/TransactionNotification.jsx
import React, { useState, useEffect } from 'react'
import { FaTimes, FaCheckCircle, FaDownload, FaWhatsapp, FaEnvelope, FaCopy, FaArrowRight, FaHome, FaHistory, FaExchangeAlt, FaReceipt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function TransactionNotification({ transaction, onClose, type }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (type === 'success') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [type])

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = () => {
    return new Date().toLocaleString('fr-FR')
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copié !`)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadReceipt = () => {
    const receipt = `
CASHPAYS - REÇU DE TRANSACTION
═══════════════════════════════════════════

Référence: ${transaction?.reference}
Date: ${formatDate()}
Statut: ${transaction?.status === 'completed' ? '✓ COMPLÉTÉ' : 'EN ATTENTE'}

EXPÉDITEUR
Nom: ${transaction?.sender_name || 'Vous'}
Téléphone: ${transaction?.sender_phone || 'N/A'}

DESTINATAIRE
Nom: ${transaction?.receiver_name || 'N/A'}
Téléphone: ${transaction?.receiver_phone || 'N/A'}

Montant: ${formatAmount(transaction?.amount)}
Frais (2%): ${formatAmount(transaction?.fee)}
Total: ${formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))}

Service client: 62 78 73 07 | support@cashpays.td
© 2026 CashPays - GOUROUSDJA
    `
    const blob = new Blob([receipt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cashpays_reçu_${transaction?.reference}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Reçu téléchargé !')
  }

  const shareViaWhatsApp = () => {
    const message = `🏦 *CASHPAYS - Transaction réussie* ✅\n\n📋 Référence: ${transaction?.reference}\n💰 Montant: ${formatAmount(transaction?.amount)}\n📅 Date: ${formatDate()}\n👤 Destinataire: ${transaction?.receiver_name}\n\n✅ Statut: COMPLÉTÉ`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (type === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
          
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3 animate-bounce">
              <FaCheckCircle className="text-green-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {transaction?.type === 'withdraw' ? 'Retrait effectué !' : 
               transaction?.type === 'deposit' ? 'Dépôt effectué !' : 
               'Transfert réussi !'}
            </h2>
            <p className="text-green-200 text-sm mt-1">
              {formatAmount(transaction?.amount)} {transaction?.type === 'withdraw' ? 'retirés' : transaction?.type === 'deposit' ? 'déposés' : 'envoyés'}
            </p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Référence</span>
                <span className="text-white text-xs font-mono">{transaction?.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">
                  {transaction?.type === 'withdraw' ? 'Agent' : transaction?.type === 'deposit' ? 'Agent' : 'Destinataire'}
                </span>
                <span className="text-white text-sm">
                  {transaction?.receiver_name || transaction?.agent_name || 'N/A'}
                </span>
              </div>
              <div className="border-t border-white/20 my-2"></div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Montant</span>
                <span className="text-white font-bold">{formatAmount(transaction?.amount)}</span>
              </div>
              {transaction?.fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Frais (2%)</span>
                  <span className="text-yellow-300">{formatAmount(transaction?.fee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/20">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-bold text-lg">
                  {formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={downloadReceipt} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm">
                <FaDownload /> Reçu
              </button>
              <button onClick={shareViaWhatsApp} className="flex items-center justify-center gap-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-xl text-sm">
                <FaWhatsapp /> Partager
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { onClose(); navigate('/dashboard') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                <FaHome size={14} /> Accueil
              </button>
              <button onClick={() => { onClose(); navigate('/transfer') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                <FaArrowRight size={14} /> Nouveau
              </button>
              <button onClick={() => { onClose(); navigate('/history') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                <FaHistory size={14} /> Historique
              </button>
            </div>
          </div>

          <div className="text-center py-2 bg-black/20">
            <p className="text-white/40 text-xs">Fermeture dans {countdown} seconde{countdown > 1 ? 's' : ''}...</p>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
            <FaTimes />
          </button>
        </div>
      </div>
    )
  }

  if (type === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-red-500/20 rounded-full mb-3">
              <FaTimes className="text-red-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Transaction échouée</h2>
            <p className="text-red-200 text-sm mt-1">{transaction?.error || 'Une erreur est survenue'}</p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="bg-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm">{transaction?.suggestion || 'Vérifiez votre solde ou réessayez plus tard.'}</p>
            </div>
          </div>

          <div className="p-4 flex gap-3">
            <button onClick={onClose} className="flex-1 btn-primary">Réessayer</button>
            <button onClick={() => { onClose(); navigate('/dashboard') }} className="flex-1 btn-secondary">Retour</button>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
            <FaTimes />
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default TransactionNotification