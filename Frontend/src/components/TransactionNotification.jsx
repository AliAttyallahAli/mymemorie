// src/components/TransactionNotification.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FaCheckCircle, FaTimes, FaDownload, FaShare, FaPrint, 
  FaWhatsapp, FaEnvelope, FaCopy, FaArrowRight, FaHome,
  FaHistory, FaExchangeAlt, FaReceipt, FaBell, FaMoneyBillWave
} from 'react-icons/fa'
import toast from 'react-hot-toast'

function TransactionNotification({ transaction, onClose, type }) {
  const [countdown, setCountdown] = useState(5)
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

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
      
      // Jouer un son de notification
      const audio = new Audio('/notification-success.mp3')
      audio.play().catch(e => console.log('Audio non supporté'))
      
      return () => clearInterval(timer)
    }
  }, [type])

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = () => {
    return new Date().toLocaleString('fr-FR', {
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
╔══════════════════════════════════════════════════════════════╗
║                    CASHPAYS - REÇU DE TRANSACTION            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Référence: ${transaction?.reference || 'N/A'}                ║
║  Date: ${formatDate()}                                       ║
║  Statut: ${transaction?.status === 'completed' ? '✓ COMPLÉTÉ' : 'EN ATTENTE'}    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  DÉTAILS DE LA TRANSACTION                                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  EXPÉDITEUR                                                  ║
║  Nom: ${transaction?.sender_name || 'Vous'}                   ║
║  Téléphone: ${transaction?.sender_phone || user?.phone}      ║
║                                                              ║
║  DESTINATAIRE                                                ║
║  Nom: ${transaction?.receiver_name || 'N/A'}                  ║
║  Téléphone: ${transaction?.receiver_phone || 'N/A'}          ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  MONTANTS                                                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Montant envoyé: ${formatAmount(transaction?.amount || 0)}    ║
║  Frais (2%): ${formatAmount(transaction?.fee || 0)}          ║
║  Total débité: ${formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))} ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  SERVICE CLIENT                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Tél: 62 78 73 07 | Email: support@cashpays.td              ║
║  WhatsApp: 62 78 73 07                                      ║
╚══════════════════════════════════════════════════════════════╝
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
*🏦 CASHPAYS - Transaction ${transaction?.status === 'completed' ? 'réussie' : 'confirmée'}*

📋 *Référence:* ${transaction?.reference}
💰 *Montant:* ${formatAmount(transaction?.amount)}
📊 *Frais:* ${formatAmount(transaction?.fee)}
📅 *Date:* ${formatDate()}

${transaction?.type === 'sent' ? '📤 Envoyé à' : '📥 Reçu de'}: ${transaction?.type === 'sent' ? transaction?.receiver_name : transaction?.sender_name}

✅ Statut: COMPLÉTÉ

---
CashPays - Transfert d'argent instantané au Tchad
📞 Service client: 62 78 73 07
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
Frais: ${formatAmount(transaction?.fee)}
Date: ${formatDate()}
Statut: ${transaction?.status === 'completed' ? 'Complété' : 'En attente'}

Merci d'utiliser CashPays !
    `.trim()
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const printReceipt = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>CashPays - Reçu ${transaction?.reference}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .receipt { border: 1px solid #ccc; padding: 20px; max-width: 500px; margin: 0 auto; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">CASHPAYS</div>
              <p>Transfert d'argent instantané</p>
            </div>
            <div class="row"><strong>Référence:</strong> <span>${transaction?.reference}</span></div>
            <div class="row"><strong>Date:</strong> <span>${formatDate()}</span></div>
            <div class="row"><strong>Expéditeur:</strong> <span>${transaction?.sender_name || 'Vous'}</span></div>
            <div class="row"><strong>Destinataire:</strong> <span>${transaction?.receiver_name || transaction?.receiver_phone}</span></div>
            <div class="row"><strong>Montant:</strong> <span>${formatAmount(transaction?.amount)}</span></div>
            <div class="row"><strong>Frais:</strong> <span>${formatAmount(transaction?.fee)}</span></div>
            <div class="row total"><strong>Total:</strong> <strong>${formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))}</strong></div>
            <div class="footer">
              <p>Merci d'utiliser CashPays</p>
              <p>Service client: 62 78 73 07</p>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.print()
    printWindow.close()
  }

  if (type === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header avec animation */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
          
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3 animate-bounce">
              <FaCheckCircle className="text-green-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Transaction réussie !</h2>
            <p className="text-green-200 text-sm mt-1">
              Votre transfert a été effectué avec succès
            </p>
          </div>

          {/* Montant principal */}
          <div className="text-center py-2">
            <p className="text-white/60 text-xs">Montant envoyé</p>
            <p className="text-white text-3xl font-bold">
              {formatAmount(transaction?.amount)}
            </p>
          </div>

          {/* Détails */}
          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex justify-between items-center text-white"
            >
              <span className="text-sm font-semibold">Détails de la transaction</span>
              <FaArrowRight className={`transform transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>
            
            {showDetails && (
              <div className="mt-3 space-y-2 pt-3 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-xs">Référence</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs font-mono">{transaction?.reference}</span>
                    <button onClick={() => copyToClipboard(transaction?.reference, 'Référence')} className="text-white/40 hover:text-white">
                      <FaCopy size={10} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-xs">Date</span>
                  <span className="text-white text-xs">{formatDate()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-xs">Destinataire</span>
                  <span className="text-white text-xs">{transaction?.receiver_name || transaction?.receiver_phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-xs">Téléphone destinataire</span>
                  <span className="text-white text-xs">{transaction?.receiver_phone}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/20">
                  <span className="text-white/60 text-xs">Frais (2%)</span>
                  <span className="text-yellow-300 text-xs">{formatAmount(transaction?.fee)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold text-sm">Total débité</span>
                  <span className="text-white font-bold">{formatAmount((transaction?.amount || 0) + (transaction?.fee || 0))}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={downloadReceipt}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all text-sm"
              >
                <FaDownload size={14} /> Reçu
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="flex items-center justify-center gap-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-xl transition-all text-sm"
              >
                <FaWhatsapp size={14} /> WhatsApp
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={shareViaEmail}
                className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all text-xs"
              >
                <FaEnvelope size={12} /> Email
              </button>
              <button
                onClick={printReceipt}
                className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all text-xs"
              >
                <FaPrint size={12} /> Imprimer
              </button>
              <button
                onClick={() => copyToClipboard(transaction?.reference, 'Référence')}
                className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-all text-xs"
              >
                <FaCopy size={12} /> Réf
              </button>
            </div>
          </div>

          {/* Navigation rapide */}
          <div className="bg-white/5 p-4 flex justify-around">
            <Link to="/dashboard" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white transition-colors">
              <FaHome size={20} />
              <span className="text-xs mt-1">Accueil</span>
            </Link>
            <Link to="/transfer" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white transition-colors">
              <FaExchangeAlt size={20} />
              <span className="text-xs mt-1">Nouveau</span>
            </Link>
            <Link to="/history" onClick={onClose} className="flex flex-col items-center text-white/60 hover:text-white transition-colors">
              <FaHistory size={20} />
              <span className="text-xs mt-1">Historique</span>
            </Link>
            <button onClick={downloadReceipt} className="flex flex-col items-center text-white/60 hover:text-white transition-colors">
              <FaReceipt size={20} />
              <span className="text-xs mt-1">Reçu</span>
            </button>
          </div>

          {/* Auto-fermeture */}
          <div className="text-center py-2 bg-black/20">
            <p className="text-white/40 text-xs">
              Fermeture dans {countdown} seconde{countdown > 1 ? 's' : ''}...
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
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
              {transaction?.error || 'Une erreur est survenue'}
            </p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Code erreur</span>
                <span className="text-red-300 font-mono text-sm">{transaction?.errorCode || 'ERR_001'}</span>
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

  if (type === 'received') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
        <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="text-center pt-6 pb-2">
            <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3 animate-bounce">
              <FaMoneyBillWave className="text-blue-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Argent reçu !</h2>
            <p className="text-blue-200 text-sm mt-1">
              Vous avez reçu un transfert
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-white/60 text-xs">Montant reçu</p>
            <p className="text-white text-3xl font-bold text-green-400">
              +{formatAmount(transaction?.amount)}
            </p>
          </div>

          <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-xs">De</span>
                <span className="text-white text-sm font-medium">{transaction?.sender_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-xs">Téléphone</span>
                <span className="text-white text-xs">{transaction?.sender_phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-xs">Référence</span>
                <span className="text-white text-xs font-mono">{transaction?.reference}</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <Link to="/dashboard" onClick={onClose} className="w-full btn-primary block text-center">
              Voir mon solde
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

  return null
}

export default TransactionNotification