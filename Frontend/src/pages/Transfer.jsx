// src/pages/Transfer.jsx - Version finale sans erreurs DOM
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaMoneyBillWave, FaQrcode, 
  FaTimes, FaCopy, FaCheckCircle, FaArrowRight, 
  FaHistory, FaHome, FaWhatsapp, FaEnvelope, 
  FaDownload, FaSpinner, FaTrash, FaShieldAlt, 
  FaExclamationTriangle, FaFilePdf, FaKey
} from 'react-icons/fa'
import Layout from '../components/Layout'
import PinModal from '../components/PinModal'

function Transfer({ user, socket }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // États du formulaire
  const [receiverPhone, setReceiverPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentContacts, setRecentContacts] = useState([])
  const [favorites, setFavorites] = useState([])
  
  // États pour le PIN
  const [hasPin, setHasPin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingTransaction, setPendingTransaction] = useState(null)
  const [checkingPin, setCheckingPin] = useState(true)
  
  // États pour le QR code
  const [qrAmount, setQrAmount] = useState('')
  const [qrDescription, setQrDescription] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  
  // États pour la notification
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState('success')
  const [transactionData, setTransactionData] = useState(null)
  const [countdown, setCountdown] = useState(5)
  const [kycLimit, setKycLimit] = useState(null)

  useEffect(() => {
    checkUserPin()
  }, [])

  const checkUserPin = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/pin-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHasPin(response.data.hasPin || false)
    } catch (error) {
      console.error('Erreur vérification PIN:', error)
      setHasPin(false)
    } finally {
      setCheckingPin(false)
    }
  }

  useEffect(() => {
    const phoneParam = searchParams.get('phone')
    const amountParam = searchParams.get('amount')
    const descParam = searchParams.get('description')
    
    if (phoneParam) {
      setReceiverPhone(phoneParam)
      toast.success(`Destinataire pré-rempli: ${phoneParam}`)
    }
    
    if (amountParam && !isNaN(amountParam) && amountParam > 0) {
      setAmount(amountParam)
      toast.success(`Montant pré-rempli: ${parseInt(amountParam).toLocaleString()} FCFA`)
    }
    
    if (descParam) {
      setDescription(decodeURIComponent(descParam))
    }
  }, [searchParams])

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

  useEffect(() => {
    if (user) {
      fetchRecentContacts()
      loadFavorites()
      fetchKycLimits()
    }
  }, [user])

  useEffect(() => {
    if (socket) {
      socket.on('transaction_received', (data) => {
        toast.success(`💰 ${data.amount.toLocaleString()} FCFA reçu de ${data.sender_name}`)
        
        setTransactionData({
          amount: data.amount,
          reference: data.reference,
          sender_name: data.sender_name,
          sender_phone: data.sender_phone,
          status: 'completed',
          type: 'received'
        })
        setNotificationType('received')
        setShowNotification(true)
      })
    }
    
    return () => {
      if (socket) {
        socket.off('transaction_received')
      }
    }
  }, [socket])

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
      const saved = localStorage.getItem('AlkherPay_favorites')
      if (saved) {
        setFavorites(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Erreur chargement favoris:', e)
    }
  }

  const removeFavorite = (phone) => {
    const newFavorites = favorites.filter(f => f.phone !== phone)
    setFavorites(newFavorites)
    localStorage.setItem('AlkherPay_favorites', JSON.stringify(newFavorites))
    toast.success('Retiré des favoris')
  }

  const generatePaymentLink = () => {
    const amountNum = parseInt(qrAmount)
    if (amountNum && amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return null
    }
    
    const baseUrl = window.location.origin
    const params = new URLSearchParams()
    params.append('phone', user?.phone)
    if (amountNum) params.append('amount', amountNum)
    if (qrDescription) params.append('description', qrDescription)
    
    return `${baseUrl}/transfer?${params.toString()}`
  }

  const generateQRCode = () => {
    const link = generatePaymentLink()
    if (!link) return
    
    setPaymentLink(link)
    setQrImageUrl(`https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=250&margin=2`)
    setQrGenerated(true)
    toast.success('QR code généré avec succès !')
  }

  const resetQRGenerator = () => {
    setQrGenerated(false)
    setQrAmount('')
    setQrDescription('')
    setQrImageUrl('')
    setPaymentLink('')
  }

  const copyToClipboard = (text, label = 'Lien') => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copié !`)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaWhatsApp = () => {
    if (!paymentLink) return
    const message = `💰 *Demande de paiement AlkherPay*\n\nCliquez sur ce lien pour me payer :\n${paymentLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const shareViaEmail = () => {
    if (!paymentLink) return
    const subject = 'Demande de paiement AlkherPay'
    const body = `Bonjour,\n\nLien de paiement: ${paymentLink}\n\nMerci !`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const downloadQRCode = () => {
    if (qrImageUrl) {
      const link = document.createElement('a')
      link.download = `AlkherPay-payment-${user?.phone}.png`
      link.href = qrImageUrl
      link.click()
      toast.success('QR code téléchargé')
    }
  }

  const prepareTransaction = () => {
    const amountNum = parseInt(amount)
    
    if (amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return false
    }
    
    if (receiverPhone === user?.phone) {
      toast.error('Vous ne pouvez pas vous envoyer de l\'argent à vous-même')
      return false
    }
    
    if (receiverPhone.length !== 8 || !/^\d{8}$/.test(receiverPhone)) {
      toast.error('Le numéro du destinataire doit contenir 8 chiffres')
      return false
    }
    
    if (kycLimit && amountNum > kycLimit.limits?.single_transaction_limit) {
      toast.error(`La limite par transaction est de ${kycLimit.limits.single_transaction_limit.toLocaleString()} FCFA`)
      return false
    }
    
    setPendingTransaction({
      receiver_phone: receiverPhone,
      amount: amountNum,
      description
    })
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!prepareTransaction()) return
    
    if (!hasPin) {
      setShowPinModal(true)
    } else {
      setShowPinModal(true)
    }
  }

  const processTransaction = async () => {
    if (!pendingTransaction) return
    
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(
        '/api/transfer',
        {
          receiver_phone: pendingTransaction.receiver_phone,
          amount: pendingTransaction.amount,
          description: pendingTransaction.description
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setTransactionData({
        reference: response.data.transaction.reference,
        amount: pendingTransaction.amount,
        fee: response.data.transaction.fee,
        receiver_name: response.data.transaction.receiver,
        receiver_phone: pendingTransaction.receiver_phone,
        sender_name: user?.fullname,
        sender_phone: user?.phone,
        status: 'completed',
        type: 'sent',
        new_balance: response.data.transaction.new_balance,
        date: new Date().toISOString()
      })
      
      setNotificationType('success')
      setShowNotification(true)
      setCountdown(5)
      
      setReceiverPhone('')
      setAmount('')
      setDescription('')
      setPendingTransaction(null)
      
      if (!hasPin) {
        setHasPin(true)
      }
      
      fetchRecentContacts()
      
    } catch (error) {
      let errorMessage = error.response?.data?.error || 'Erreur lors du transfert'
      let suggestion = 'Vérifiez votre solde ou réessayez plus tard.'
      
      if (error.response?.data?.code === 'INSUFFICIENT_BALANCE') {
        errorMessage = 'Solde insuffisant'
        suggestion = 'Rechargez votre compte ou réduisez le montant'
      }
      
      setTransactionData({
        error: errorMessage,
        suggestion: suggestion
      })
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setLoading(false)
    }
  }

  const calculateFees = () => {
    const amountNum = parseInt(amount) || 0
    const fee = Math.floor(amountNum * 0.02)
    const total = amountNum + fee
    return { fee, total }
  }

  const { fee, total } = calculateFees()

  const formatAmount = (amt) => {
    if (!amt && amt !== 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(amt) + ' FCFA'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const generatePDF = () => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AlkherPay - Reçu ${transactionData?.reference}</title>
        <style>
          body { font-family: Arial; padding: 40px; }
          .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #0A2F6C; border-radius: 16px; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #0A2F6C; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #0A2F6C; }
          .subtitle { color: #666; font-size: 12px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 15px; border-top: 2px solid #0A2F6C; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header"><div class="logo">AlkherPay</div><div class="subtitle">Transfert d'argent instantané - GOUROUSDJA</div></div>
          <div class="info-row"><span class="label">RÉFÉRENCE</span><span>${transactionData?.reference}</span></div>
          <div class="info-row"><span class="label">DATE</span><span>${formatDate(transactionData?.date || new Date())}</span></div>
          <div class="info-row"><span class="label">STATUT</span><span>COMPLÉTÉ</span></div>
          <div class="info-row"><span class="label">EXPÉDITEUR</span><span>${transactionData?.sender_name || user?.fullname}</span></div>
          <div class="info-row"><span class="label">TÉLÉPHONE EXP</span><span>${transactionData?.sender_phone || user?.phone}</span></div>
          <div class="info-row"><span class="label">DESTINATAIRE</span><span>${transactionData?.receiver_name}</span></div>
          <div class="info-row"><span class="label">TÉLÉPHONE DEST</span><span>${transactionData?.receiver_phone}</span></div>
          <div class="info-row"><span class="label">MONTANT ENVOYÉ</span><span>${formatAmount(transactionData?.amount)}</span></div>
          <div class="info-row"><span class="label">FRAIS (2%)</span><span>${formatAmount(transactionData?.fee)}</span></div>
          <div class="info-row total"><span class="label">TOTAL DÉBITÉ</span><span>${formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))}</span></div>
          <div class="footer"><p>Merci d'utiliser AlkherPay</p><p>Service client: 62 78 73 07</p></div>
        </div>
      </body>
      </html>
    `
    const win = window.open()
    win.document.write(receiptHTML)
    win.document.close()
    win.print()
  }

  const downloadPDF = () => generatePDF()
  
  const shareViaWhatsAppReceipt = () => {
    const message = `🏦 AlkherPay - Transaction réussie ✅\n\n📋 Référence: ${transactionData?.reference}\n💰 Montant: ${formatAmount(transactionData?.amount)}\n📊 Frais: ${formatAmount(transactionData?.fee)}\n👤 Destinataire: ${transactionData?.receiver_name}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }
  
  const shareViaEmailReceipt = () => {
    const subject = `AlkherPay - Reçu ${transactionData?.reference}`
    const body = `Reçu de transaction AlkherPay.\n\nRéférence: ${transactionData?.reference}\nMontant: ${formatAmount(transactionData?.amount)}\nDestinataire: ${transactionData?.receiver_name}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  
  const downloadTXT = () => {
    const receipt = `AlkherPay - REÇU\n\nRéférence: ${transactionData?.reference}\nMontant: ${formatAmount(transactionData?.amount)}\nFrais: ${formatAmount(transactionData?.fee)}\nDestinataire: ${transactionData?.receiver_name}`
    const blob = new Blob([receipt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AlkherPay_reçu_${transactionData?.reference}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Reçu téléchargé !')
  }

  // Rendu simplifié de la notification - sans animations problématiques
  const renderNotification = () => {
    if (!showNotification) return null
    
    if (notificationType === 'success') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-md w-full bg-green-800 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-green-400 text-5xl mb-3">✓</div>
              <h2 className="text-xl font-bold text-white mb-2">Transfert réussi !</h2>
              <p className="text-white/70 text-sm mb-4">{formatAmount(transactionData?.amount)} envoyés</p>
              <div className="bg-white/10 rounded-lg p-3 mb-4 text-left">
                <p className="text-white/60 text-xs">Référence: {transactionData?.reference}</p>
                <p className="text-white/60 text-xs">Destinataire: {transactionData?.receiver_name}</p>
                <p className="text-white/60 text-xs">Montant: {formatAmount(transactionData?.amount)}</p>
                <p className="text-white/60 text-xs">Frais: {formatAmount(transactionData?.fee)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadPDF} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">PDF</button>
                <button onClick={downloadTXT} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">TXT</button>
                <button onClick={shareViaWhatsAppReceipt} className="flex-1 bg-[#25d366]/20 text-white py-2 rounded-lg text-sm">WhatsApp</button>
              </div>
              <button onClick={() => setShowNotification(false)} className="w-full mt-4 bg-white text-green-800 py-2 rounded-lg font-semibold">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    if (notificationType === 'received') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-md w-full bg-blue-800 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-blue-400 text-5xl mb-3">💰</div>
              <h2 className="text-xl font-bold text-white mb-2">Argent reçu !</h2>
              <p className="text-white/70 text-sm mb-4">{formatAmount(transactionData?.amount)} reçus</p>
              <div className="bg-white/10 rounded-lg p-3 mb-4 text-left">
                <p className="text-white/60 text-xs">Référence: {transactionData?.reference}</p>
                <p className="text-white/60 text-xs">Expéditeur: {transactionData?.sender_name}</p>
              </div>
              <button onClick={() => setShowNotification(false)} className="w-full bg-white text-blue-800 py-2 rounded-lg font-semibold">
                Voir mon solde
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    if (notificationType === 'error') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-md w-full bg-red-800 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-red-400 text-5xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold text-white mb-2">Transfert échoué</h2>
              <p className="text-white/70 text-sm mb-4">{transactionData?.error}</p>
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <p className="text-white/60 text-sm">{transactionData?.suggestion}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNotification(false)} className="flex-1 bg-white/20 text-white py-2 rounded-lg">Réessayer</button>
                <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex-1 bg-white text-red-800 py-2 rounded-lg font-semibold">Retour</button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  if (checkingPin) {
    return (
      <Layout user={user} socket={socket}>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user} socket={socket}>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulaire de transfert */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <FaMoneyBillWave className="text-blue-400" /> Nouveau transfert
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label"><FaPhone className="inline mr-2" /> Numéro du destinataire</label>
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
              </div>
              
              {recentContacts.length > 0 && (
                <div className="mt-3">
                  <p className="text-white/40 text-xs mb-2">📋 Contacts récents :</p>
                  <div className="flex flex-wrap gap-2">
                    {recentContacts.map(contact => (
                      <button key={contact.phone} type="button" onClick={() => setReceiverPhone(contact.phone)} className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full">
                        {contact.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {favorites.length > 0 && (
                <div className="mt-3">
                  <p className="text-white/40 text-xs mb-2">⭐ Favoris :</p>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map(fav => (
                      <button key={fav.phone} type="button" onClick={() => setReceiverPhone(fav.phone)} className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full flex items-center gap-1">
                        {fav.name}
                        <FaTrash size={10} className="ml-1 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeFavorite(fav.phone) }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label"><FaMoneyBillWave className="inline mr-2" /> Montant (FCFA)</label>
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
                {kycLimit && <p className="text-white/40 text-xs"><FaShieldAlt className="inline mr-1" size={10} /> Limite: {kycLimit.limits?.single_transaction_limit.toLocaleString()} FCFA</p>}
              </div>
            </div>

            <div>
              <label className="label">Description (optionnelle)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" placeholder="Motif du transfert" />
            </div>

            {amount && parseInt(amount) >= 25 && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-white/80"><span>Montant à envoyer</span><span>{parseInt(amount).toLocaleString()} FCFA</span></div>
                <div className="flex justify-between text-white/60 text-sm"><span>Frais (2%)</span><span>{fee.toLocaleString()} FCFA</span></div>
                <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold"><span>Total à débiter</span><span>{total.toLocaleString()} FCFA</span></div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 mt-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-white/60 text-sm">📱 Votre adresse wallet</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-white font-mono text-lg font-bold">{user?.phone}</p>
                    <button type="button" onClick={() => copyToClipboard(user?.phone || '', 'Numéro')} className="text-white/40 hover:text-white">
                      {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-xl p-3 flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" />
              <p className="text-blue-300 text-xs">
                {hasPin ? '🔐 Vos transactions sont sécurisées par votre code PIN' : '🔒 Définissez votre code PIN pour sécuriser vos transactions'}
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><FaSpinner className="animate-spin" /> Traitement...</> : 'Confirmer le transfert'}
            </button>
          </form>
        </div>

        {/* QR Code Generator */}
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3">
              <FaQrcode className="text-blue-400 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Recevoir un paiement</h2>
            <p className="text-white/50 text-sm">Générez un QR code pour recevoir de l'argent</p>
          </div>

          {!qrGenerated ? (
            <div className="space-y-4">
              <div>
                <label className="label">Montant (optionnel)</label>
                <input
                  type="number"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(e.target.value)}
                  className="input-field"
                  placeholder="Ex: 5000"
                  min="25"
                />
                <p className="text-white/40 text-xs mt-1">Laissez vide pour laisser le montant à définir</p>
              </div>
              <div>
                <label className="label">Description (optionnelle)</label>
                <input
                  type="text"
                  value={qrDescription}
                  onChange={(e) => setQrDescription(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Paiement service"
                />
              </div>
              <button onClick={generateQRCode} className="btn-primary w-full flex items-center justify-center gap-2">
                <FaQrcode /> Générer mon QR code
              </button>
              <div className="bg-blue-500/10 rounded-xl p-3">
                <p className="text-blue-300 text-xs text-center">
                  💡 Le QR code redirige vers la page de transfert avec votre numéro pré-rempli
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                {qrImageUrl && (
                  <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg" />
                )}
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Votre numéro</span>
                  <span className="font-mono font-bold text-white">{user?.phone}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/10">
                  <button onClick={() => copyToClipboard(paymentLink, 'Lien')} className="text-blue-400 text-xs">Copier le lien</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadQRCode} className="flex-1 btn-secondary text-sm"><FaDownload /> Télécharger</button>
                <button onClick={shareViaWhatsApp} className="flex-1 btn-secondary text-sm"><FaWhatsapp /> WhatsApp</button>
              </div>
              <button onClick={resetQRGenerator} className="w-full text-sm text-white/40">Nouveau QR code</button>
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false)
            setPendingTransaction(null)
          }}
          onSuccess={() => {
            if (!hasPin) setHasPin(true)
            processTransaction()
          }}
          type={hasPin ? 'verify' : 'set'}
          amount={pendingTransaction?.amount}
        />
      )}

      {renderNotification()}
    </Layout>
  )
}

export default Transfer