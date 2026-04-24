// src/pages/Transfer.jsx
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaMoneyBillWave, FaQrcode, 
  FaCamera, FaTimes, FaUpload, FaCopy, FaCheckCircle,
  FaArrowRight, FaHistory, FaHome, FaReceipt,
  FaWhatsapp, FaEnvelope, FaDownload, FaPrint,
  FaInfoCircle, FaSpinner, FaUserPlus, FaTrash,
  FaRegClock, FaShieldAlt, FaExclamationTriangle
} from 'react-icons/fa'
import Layout from '../components/Layout'
import CameraQRScanner from '../components/CameraQRScanner'

function Transfer({ user }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // États du formulaire
  const [receiverPhone, setReceiverPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentContacts, setRecentContacts] = useState([])
  const [favorites, setFavorites] = useState([])
  
  // États pour la notification
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState('success')
  const [transactionData, setTransactionData] = useState(null)
  const [countdown, setCountdown] = useState(5)
  const [kycLimit, setKycLimit] = useState(null)

  // Traiter les paramètres URL (QR code dynamique)
  useEffect(() => {
    const phoneParam = searchParams.get('phone')
    const amountParam = searchParams.get('amount')
    const tokenParam = searchParams.get('token')
    
    if (phoneParam) {
      setReceiverPhone(phoneParam)
      toast.success(`Destinataire pré-rempli: ${phoneParam}`)
    }
    
    if (amountParam && !isNaN(amountParam)) {
      setAmount(amountParam)
      toast.success(`Montant pré-rempli: ${parseInt(amountParam).toLocaleString()} FCFA`)
    }
    
    if (tokenParam) {
      verifyPaymentToken(tokenParam)
    }
  }, [searchParams])

  // Auto-fermeture de la notification
  useEffect(() => {
    if (showNotification && notificationType === 'success') {
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
  }, [showNotification, notificationType])

  // Charger les contacts et limites KYC
  useEffect(() => {
    fetchRecentContacts()
    loadFavorites()
    fetchKycLimits()
  }, [])

  const fetchRecentContacts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/wallet/history?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const contacts = response.data.transactions
        ?.filter(tx => tx.receiver_phone && tx.receiver_phone !== user?.phone)
        .map(tx => ({
          phone: tx.receiver_phone,
          name: tx.receiver_name || tx.receiver_phone,
          date: tx.created_at
        }))
        .filter((v, i, a) => a.findIndex(t => t.phone === v.phone) === i)
        .slice(0, 5)
      
      setRecentContacts(contacts || [])
    } catch (error) {
      console.error('Erreur chargement contacts:', error)
    }
  }

  const fetchKycLimits = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/kyc/limits', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycLimit(response.data)
    } catch (error) {
      console.error('Erreur chargement limites KYC:', error)
    }
  }

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('cashpays_favorites')
      if (saved) {
        setFavorites(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Erreur chargement favoris:', e)
    }
  }

  const saveFavorite = (phone, name) => {
    const newFavorites = [{ phone, name, date: new Date().toISOString() }, ...favorites]
      .filter((v, i, a) => a.findIndex(t => t.phone === v.phone) === i)
      .slice(0, 10)
    setFavorites(newFavorites)
    localStorage.setItem('cashpays_favorites', JSON.stringify(newFavorites))
    toast.success('Ajouté aux favoris')
  }

  const removeFavorite = (phone) => {
    const newFavorites = favorites.filter(f => f.phone !== phone)
    setFavorites(newFavorites)
    localStorage.setItem('cashpays_favorites', JSON.stringify(newFavorites))
    toast.success('Retiré des favoris')
  }

  const verifyPaymentToken = async (token) => {
    try {
      const decoded = JSON.parse(atob(token))
      if (decoded.type === 'payment_request') {
        toast.info(`Demande de paiement de ${decoded.name || decoded.phone}`)
      }
    } catch (e) {
      console.error('Token invalide')
    }
  }

  const handleQRScan = (qrData) => {
    try {
      let data
      if (qrData.startsWith('{')) {
        data = JSON.parse(qrData)
        if (data.recipient) {
          setReceiverPhone(data.recipient)
          if (data.amount) setAmount(data.amount.toString())
          toast.success(`Destinataire: ${data.recipient}`)
        } else if (data.phone) {
          setReceiverPhone(data.phone)
          toast.success(`Destinataire: ${data.phone}`)
        } else {
          throw new Error('Format invalide')
        }
      } else if (/^\d{8}$/.test(qrData)) {
        setReceiverPhone(qrData)
        toast.success(`Destinataire: ${qrData}`)
      } else {
        toast.error('QR code invalide')
      }
    } catch (e) {
      toast.error('Erreur lors de la lecture du QR code')
    }
  }

  const checkKycLimit = async (amountValue) => {
    if (!kycLimit) return true
    
    if (amountValue > kycLimit.limits?.single_transaction_limit) {
      toast.error(`La limite par transaction est de ${kycLimit.limits.single_transaction_limit.toLocaleString()} FCFA`)
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const amountNum = parseInt(amount)
    if (amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return
    }
    
    if (receiverPhone === user?.phone) {
      toast.error('Vous ne pouvez pas vous envoyer de l\'argent à vous-même')
      return
    }
    
    if (receiverPhone.length !== 8 || !/^\d{8}$/.test(receiverPhone)) {
      toast.error('Le numéro du destinataire doit contenir 8 chiffres')
      return
    }
    
    // Vérifier les limites KYC
    const withinLimit = await checkKycLimit(amountNum)
    if (!withinLimit) return

    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(
        '/api/transfer',
        {
          receiver_phone: receiverPhone,
          amount: amountNum,
          description
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Préparer les données pour la notification
      setTransactionData({
        reference: response.data.transaction.reference,
        amount: amountNum,
        fee: response.data.transaction.fee,
        receiver_name: response.data.transaction.receiver,
        receiver_phone: receiverPhone,
        sender_name: user?.fullname,
        sender_phone: user?.phone,
        status: 'completed',
        type: 'sent',
        new_balance: response.data.transaction.new_balance
      })
      
      setNotificationType('success')
      setShowNotification(true)
      setCountdown(5)
      
      // Réinitialiser le formulaire
      setReceiverPhone('')
      setAmount('')
      setDescription('')
      
      // Recharger les contacts récents
      fetchRecentContacts()
      
    } catch (error) {
      let errorMessage = error.response?.data?.error || 'Erreur lors du transfert'
      let suggestion = 'Vérifiez votre solde ou réessayez plus tard.'
      
      if (error.response?.data?.code === 'INSUFFICIENT_BALANCE') {
        errorMessage = 'Solde insuffisant'
        suggestion = 'Rechargez votre compte ou réduisez le montant'
      } else if (error.response?.data?.code === 'USER_NOT_FOUND') {
        errorMessage = 'Destinataire non trouvé'
        suggestion = 'Vérifiez le numéro de téléphone du destinataire'
      }
      
      setTransactionData({
        error: errorMessage,
        errorCode: error.response?.data?.code || 'ERR_001',
        suggestion: suggestion
      })
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const calculateFees = () => {
    const amountNum = parseInt(amount) || 0
    const fee = Math.floor(amountNum * 0.02)
    const total = amountNum + fee
    return { fee, total }
  }

  const { fee, total } = calculateFees()

  // Composant de notification
  const TransactionNotification = () => {
    const formatAmount = (amt) => {
      return new Intl.NumberFormat('fr-FR').format(amt) + ' FCFA'
    }

    const formatDate = () => {
      return new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const downloadReceipt = () => {
      const receipt = `
╔══════════════════════════════════════════════════════════════╗
║                    CASHPAYS - REÇU DE TRANSACTION            ║
╠══════════════════════════════════════════════════════════════╣
║  Référence: ${transactionData?.reference}                    ║
║  Date: ${formatDate()}                                       ║
║  Statut: ✓ COMPLETÉ                                          ║
╠══════════════════════════════════════════════════════════════╣
║  DE: ${transactionData?.sender_name} (${transactionData?.sender_phone}) ║
║  À: ${transactionData?.receiver_name} (${transactionData?.receiver_phone}) ║
╠══════════════════════════════════════════════════════════════╣
║  Montant: ${formatAmount(transactionData?.amount)}           ║
║  Frais: ${formatAmount(transactionData?.fee)}                ║
║  TOTAL: ${formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))} ║
╚══════════════════════════════════════════════════════════════╝
      `
      const blob = new Blob([receipt], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cashpays_reçu_${transactionData?.reference}.txt`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Reçu téléchargé !')
    }

    const shareViaWhatsApp = () => {
      const message = `🏦 *CASHPAYS - Transaction réussie* ✅\n\n📋 Référence: ${transactionData?.reference}\n💰 Montant: ${formatAmount(transactionData?.amount)}\n📊 Frais: ${formatAmount(transactionData?.fee)}\n📅 Date: ${formatDate()}\n👤 Destinataire: ${transactionData?.receiver_name}\n\n✅ Statut: COMPLETÉ\n\n---\nCashPays - Transfert d'argent instantané au Tchad`
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    if (notificationType === 'success') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative max-w-md w-full bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
            
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3 animate-bounce">
                <FaCheckCircle className="text-green-400 text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Transfert réussi !</h2>
              <p className="text-green-200 text-sm mt-1">
                {formatAmount(transactionData?.amount)} envoyés avec succès
              </p>
            </div>

            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Référence</span>
                  <span className="text-white text-xs font-mono">{transactionData?.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Destinataire</span>
                  <span className="text-white text-sm">{transactionData?.receiver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Téléphone</span>
                  <span className="text-white text-sm">{transactionData?.receiver_phone}</span>
                </div>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Montant</span>
                  <span className="text-white font-bold">{formatAmount(transactionData?.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Frais (2%)</span>
                  <span className="text-yellow-300">{formatAmount(transactionData?.fee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/20">
                  <span className="text-white font-semibold">Total débité</span>
                  <span className="text-white font-bold text-lg">
                    {formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))}
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
                <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                  <FaHome size={14} /> Accueil
                </button>
                <button onClick={() => { setShowNotification(false); setAmount(''); setReceiverPhone('') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                  <FaArrowRight size={14} /> Nouveau
                </button>
                <button onClick={() => { setShowNotification(false); navigate('/history') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs">
                  <FaHistory size={14} /> Historique
                </button>
              </div>
            </div>

            <div className="text-center py-2 bg-black/20">
              <p className="text-white/40 text-xs">Fermeture dans {countdown} seconde{countdown > 1 ? 's' : ''}...</p>
            </div>

            <button onClick={() => setShowNotification(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <FaTimes />
            </button>
          </div>
        </div>
      )
    }

    if (notificationType === 'error') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-red-500/20 rounded-full mb-3">
                <FaExclamationTriangle className="text-red-400 text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Transfert échoué</h2>
              <p className="text-red-200 text-sm mt-1">{transactionData?.error}</p>
            </div>

            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
              <div className="bg-red-500/20 rounded-lg p-3">
                <p className="text-red-300 text-sm">{transactionData?.suggestion}</p>
              </div>
            </div>

            <div className="p-4 flex gap-3">
              <button onClick={() => setShowNotification(false)} className="flex-1 btn-primary">
                Réessayer
              </button>
              <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex-1 btn-secondary">
                Retour
              </button>
            </div>

            <button onClick={() => setShowNotification(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <FaTimes />
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Layout user={user}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">
          <FaMoneyBillWave className="inline mr-2 text-blue-400" />
          Nouveau transfert
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Destinataire */}
          <div>
            <label className="label">
              <FaPhone className="inline mr-2" /> Numéro du destinataire
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                className="input-field flex-1"
                placeholder="Ex: 66345678"
                maxLength="8"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 rounded-xl transition-all flex items-center gap-2"
                title="Scanner un QR code"
              >
                <FaCamera className="text-lg" />
                <span className="hidden sm:inline">Scanner</span>
              </button>
            </div>
            
            {/* Contacts récents */}
            {recentContacts.length > 0 && (
              <div className="mt-3">
                <p className="text-white/40 text-xs mb-2">📋 Contacts récents :</p>
                <div className="flex flex-wrap gap-2">
                  {recentContacts.map(contact => (
                    <button
                      key={contact.phone}
                      type="button"
                      onClick={() => setReceiverPhone(contact.phone)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-all"
                    >
                      {contact.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favoris */}
            {favorites.length > 0 && (
              <div className="mt-3">
                <p className="text-white/40 text-xs mb-2">⭐ Favoris :</p>
                <div className="flex flex-wrap gap-2">
                  {favorites.map(fav => (
                    <button
                      key={fav.phone}
                      type="button"
                      onClick={() => setReceiverPhone(fav.phone)}
                      className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                    >
                      {fav.name}
                      <FaTrash 
                        size={10} 
                        className="ml-1 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFavorite(fav.phone)
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Montant */}
          <div>
            <label className="label">
              <FaMoneyBillWave className="inline mr-2" /> Montant (FCFA)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="Montant à envoyer"
              min="25"
              required
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-white/40 text-xs">Minimum: 25 FCFA</p>
              {kycLimit && (
                <p className="text-white/40 text-xs">
                  <FaShieldAlt className="inline mr-1" size={10} />
                  Limite: {kycLimit.limits?.single_transaction_limit.toLocaleString()} FCFA
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optionnelle)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Motif du transfert"
            />
          </div>

          {/* Récapitulatif */}
          {amount && parseInt(amount) >= 25 && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-white/80">
                <span>Montant à envoyer</span>
                <span>{parseInt(amount).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-white/60 text-sm">
                <span>Frais (2%)</span>
                <span>{fee.toLocaleString()} FCFA</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold">
                <span>Total à débiter</span>
                <span>{total.toLocaleString()} FCFA</span>
              </div>
            </div>
          )}

          {/* Mon QR Code */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-white/60 text-sm">📱 Votre adresse wallet</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white font-mono text-lg font-bold">{user?.phone}</p>
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard(user?.phone || '')} 
                    className="text-white/40 hover:text-white transition-all"
                    title="Copier mon numéro"
                  >
                    {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const qrData = JSON.stringify({ 
                    type: 'payment', 
                    recipient: user?.phone, 
                    name: user?.fullname 
                  })
                  navigator.clipboard.writeText(qrData)
                  toast.success('QR code copié !')
                }}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <FaQrcode /> Partager mon QR
              </button>
            </div>
          </div>

          {/* Bouton de validation */}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin" /> Traitement...
              </div>
            ) : (
              'Confirmer le transfert'
            )}
          </button>
        </form>
      </div>

      {/* Scanner QR code */}
      {showScanner && (
        <CameraQRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Notification de transaction */}
      {showNotification && <TransactionNotification />}
    </Layout>
  )
}

export default Transfer