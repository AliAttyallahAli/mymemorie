// src/components/TransactionModal.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FaCheckCircle, FaTimes, FaDownload, FaShare, FaPrint, 
  FaWhatsapp, FaEnvelope, FaCopy, FaArrowRight, FaHome,
  FaHistory, FaExchangeAlt
} from 'react-icons/fa'
import toast from 'react-hot-toast'

function TransactionModal({ isOpen, onClose, transaction, type }) {
  const [countdown, setCountdown] = useState(5)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && type === 'success') {
      // Auto-fermeture après 5 secondes
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            onClose()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [isOpen, type, onClose])

  if (!isOpen) return null

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copié !`)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadReceipt = () => {
    const receiptContent = `
      ================================================
                    CASHPAYS - REÇU DE TRANSACTION
      ================================================
      
      Référence: ${transaction?.reference || 'N/A'}
      Date: ${formatDate(new Date())}
      Type: ${transaction?.type === 'sent' ? 'ENVOI' : 'RÉCEPTION'}
      
      ------------------------------------------------
      
      EXPÉDITEUR
      Nom: ${transaction?.sender_name || 'N/A'}
      Téléphone: ${transaction?.sender_phone || 'N/A'}
      
      DESTINATAIRE
      Nom: ${transaction?.receiver_name || 'N/A'}
      Téléphone: ${transaction?.receiver_phone || 'N/A'}
      
      ------------------------------------------------
      
      Montant: ${formatAmount(transaction?.amount || 0)}
      Frais: ${formatAmount(transaction?.fee || 0)}
      Net: ${formatAmount((transaction?.amount || 0) - (transaction?.fee || 0))}
      
      ------------------------------------------------
      
      Statut: ${transaction?.status === 'completed' ? '✓ COMPLÉTÉ' : 'EN ATTENTE'}
      
      ================================================
      Merci d'utiliser CashPays - GOUROUSDJA
      Service client: 62 78 73 07
      ================================================
    `
    
    const blob = new Blob([receiptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cashpays_reçu_${transaction?.reference || Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Reçu téléchargé !')
  }

  const shareViaWhatsApp = () => {
    const message = `
*CASHPAYS - Transaction ${transaction?.status === 'completed' ? 'réussie' : 'en attente'}* ✅

Référence: ${transaction?.reference}
Montant: ${formatAmount(transaction?.amount)}
${transaction?.type === 'sent' ? 'Envoyé à' : 'Reçu de'}: ${transaction?.type === 'sent' ? transaction?.receiver_name : transaction?.sender_name}
Date: ${formatDate(new Date())}

Merci d'utiliser CashPays! 🚀
    `.trim()
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const shareViaEmail = () => {
    const subject = `CashPays - Transaction ${transaction?.reference}`
    const body = `
Transaction CashPays
    
Référence: ${transaction?.reference}
Montant: ${formatAmount(transaction?.amount)}
Date: ${formatDate(new Date())}
Statut: ${transaction?.status === 'completed' ? 'Complété' : 'En attente'}
    `.trim()
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (type === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Confetti effect (simulé) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
          
          {/* Header */}
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3 animate-bounce">
              <FaCheckCircle className="text-green-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Transaction réussie !</h2>
            <p className="text-green-200 text-sm mt-1">
              Votre transfert a été effectué avec succès
            </p>
          </div>

          {/* Détails */}
          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Référence</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">{transaction?.reference}</span>
                  <button onClick={() => copyToClipboard(transaction?.reference, 'Référence')} className="text-white/40 hover:text-white">
                    <FaCopy size={12} />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Date</span>
                <span className="text-white text-sm">{formatDate(new Date())}</span>
              </div>
              
              <div className="border-t border-white/10 my-2"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">De</span>
                <span className="text-white font-medium">{transaction?.sender_name || 'Vous'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">À</span>
                <span className="text-white font-medium">{transaction?.receiver_name || transaction?.receiver_phone}</span>
              </div>
              
              <div className="border-t border-white/10 my-2"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Montant envoyé</span>
                <span className="text-white font-bold text-lg">{formatAmount(transaction?.amount)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Frais (2%)</span>
                <span className="text-yellow-300">{formatAmount(transaction?.fee)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-white font-semibold">Total débité</span>
                <span className="text-white font-bold text-xl">{formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={downloadReceipt}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all"
              >
                <FaDownload /> Reçu
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="flex items-center justify-center gap-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-xl transition-all"
              >
                <FaWhatsapp /> Partager
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareViaEmail}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all"
              >
                <FaEnvelope /> Email
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all"
              >
                <FaPrint /> Imprimer
              </button>
            </div>
          </div>

          {/* Navigation rapide */}
          <div className="bg-white/5 p-4 flex justify-around">
            <Link to="/dashboard" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white">
              <FaHome size={20} />
              <span className="text-xs mt-1">Accueil</span>
            </Link>
            <Link to="/transfer" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white">
              <FaExchangeAlt size={20} />
              <span className="text-xs mt-1">Nouveau</span>
            </Link>
            <Link to="/history" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white">
              <FaHistory size={20} />
              <span className="text-xs mt-1">Historique</span>
            </Link>
          </div>

          {/* Auto-fermeture */}
          <div className="text-center py-3 bg-black/20">
            <p className="text-white/40 text-xs">
              Fermeture dans {countdown} seconde{countdown > 1 ? 's' : ''}...
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white"
          >
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
            <p className="text-red-200 text-sm mt-1">
              {transaction?.error || 'Une erreur est survenue lors du transfert'}
            </p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Code erreur</span>
                <span className="text-red-300 font-mono">{transaction?.errorCode || 'ERR_001'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Date</span>
                <span className="text-white text-sm">{formatDate(new Date())}</span>
              </div>
              <div className="bg-red-500/20 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  {transaction?.suggestion || 'Vérifiez votre solde ou réessayez plus tard.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 flex gap-3">
            <button onClick={onClose} className="flex-1 btn-primary">
              Réessayer
            </button>
            <Link to="/dashboard" onClick={onClose} className="flex-1 btn-secondary text-center">
              Retour
            </Link>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    )
  }

  if (type === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-yellow-500/20 rounded-full mb-3 animate-spin">
              <FaExchangeAlt className="text-yellow-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Transaction en cours</h2>
            <p className="text-yellow-200 text-sm mt-1">
              Votre transfert est en cours de traitement
            </p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Référence</span>
                <span className="text-white font-mono text-sm">{transaction?.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Montant</span>
                <span className="text-white font-bold">{formatAmount(transaction?.amount)}</span>
              </div>
            </div>
            
            <div className="mt-4 bg-yellow-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></div>
                <p className="text-yellow-300 text-sm">Traitement en cours...</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button onClick={onClose} className="w-full btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default TransactionModal