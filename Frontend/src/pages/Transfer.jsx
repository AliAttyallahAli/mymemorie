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
  FaRegClock, FaShieldAlt, FaExclamationTriangle,
  FaShareAlt, FaFilePdf, FaBell, FaStar
} from 'react-icons/fa'
import Layout from '../components/Layout'

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
  
  // États pour le QR code
  const [showQRModal, setShowQRModal] = useState(false)
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

  // Traiter les paramètres URL (QR code dynamique)
  useEffect(() => {
    const phoneParam = searchParams.get('phone')
    const amountParam = searchParams.get('amount')
    const descParam = searchParams.get('description')
    
    console.log('📱 Paramètres URL reçus:', { phoneParam, amountParam, descParam })
    
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

  // Écouter les notifications socket
  useEffect(() => {
    if (socket) {
      socket.on('transaction_received', (data) => {
        toast.custom((t) => (
          <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-4 shadow-2xl border-l-4 border-green-500 max-w-sm">
            <div className="flex items-start gap-3">
              <FaMoneyBillWave className="text-green-400 text-2xl" />
              <div>
                <p className="text-white font-semibold">Argent reçu !</p>
                <p className="text-white/70 text-sm">
                  {data.amount.toLocaleString()} FCFA de {data.sender_name}
                </p>
              </div>
            </div>
          </div>
        ), { duration: 5000 })
        
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

  // Générer un lien de paiement dynamique
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

  // Générer le QR code
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
    const message = `💰 *Demande de paiement CashPays*\n\nCliquez sur ce lien pour me payer :\n${paymentLink}\n\n📱 CashPays - Transfert instantané`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const shareViaEmail = () => {
    if (!paymentLink) return
    const subject = 'Demande de paiement CashPays'
    const body = `Bonjour,\n\nJe vous invite à me payer via CashPays.\n\nLien de paiement: ${paymentLink}\n\nMerci !`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const downloadQRCode = () => {
    if (qrImageUrl) {
      const link = document.createElement('a')
      link.download = `cashpays-payment-${user?.phone}.png`
      link.href = qrImageUrl
      link.click()
      toast.success('QR code téléchargé')
    }
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
    
    if (kycLimit && amountNum > kycLimit.limits?.single_transaction_limit) {
      toast.error(`La limite par transaction est de ${kycLimit.limits.single_transaction_limit.toLocaleString()} FCFA`)
      return
    }

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
        new_balance: response.data.transaction.new_balance,
        date: new Date().toISOString()
      })
      
      setNotificationType('success')
      setShowNotification(true)
      setCountdown(5)
      
      setReceiverPhone('')
      setAmount('')
      setDescription('')
      
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
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Génération du PDF
  const generatePDF = () => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>CashPays - Reçu ${transactionData?.reference}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 40px; background: white; }
          .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #0A2F6C; border-radius: 16px; padding: 30px; background: white; }
          .header { text-align: center; border-bottom: 2px solid #0A2F6C; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #0A2F6C; }
          .subtitle { color: #666; font-size: 12px; }
          .success-icon { text-align: center; font-size: 48px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 15px; border-top: 2px solid #0A2F6C; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
          .status { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header"><div class="logo">🏦 CASHPAYS</div><div class="subtitle">Transfert d'argent instantané - GOUROUSDJA</div></div>
          <div class="success-icon">✅</div>
          <div class="info-row"><span class="label">RÉFÉRENCE</span><span class="value">${transactionData?.reference}</span></div>
          <div class="info-row"><span class="label">DATE</span><span class="value">${formatDate(transactionData?.date || new Date())}</span></div>
          <div class="info-row"><span class="label">STATUT</span><span class="value"><span class="status">COMPLÉTÉ</span></span></div>
          <div style="margin: 20px 0;"><div class="info-row"><span class="label">EXPÉDITEUR</span><span class="value">${transactionData?.sender_name || user?.fullname}</span></div>
          <div class="info-row"><span class="label">TÉLÉPHONE EXP</span><span class="value">${transactionData?.sender_phone || user?.phone}</span></div></div>
          <div style="margin: 20px 0;"><div class="info-row"><span class="label">DESTINATAIRE</span><span class="value">${transactionData?.receiver_name}</span></div>
          <div class="info-row"><span class="label">TÉLÉPHONE DEST</span><span class="value">${transactionData?.receiver_phone}</span></div></div>
          <div style="margin: 20px 0; background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <div class="info-row"><span class="label">MONTANT ENVOYÉ</span><span class="value">${formatAmount(transactionData?.amount)}</span></div>
            <div class="info-row"><span class="label">FRAIS (2%)</span><span class="value">${formatAmount(transactionData?.fee)}</span></div>
            <div class="info-row total"><span class="label">TOTAL DÉBITÉ</span><span class="value">${formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))}</span></div>
          </div>
          <div class="footer"><p>Merci d'utiliser CashPays - Transfert d'argent instantané au Tchad</p>
          <p>Service client: 62 78 73 07 | support@cashpays.td</p>
          <p>© 2026 CashPays - GOUROUSDJA</p></div>
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
    const message = `🏦 *CASHPAYS - Transaction réussie* ✅\n\n📋 *Référence:* ${transactionData?.reference}\n💰 *Montant:* ${formatAmount(transactionData?.amount)}\n📊 *Frais:* ${formatAmount(transactionData?.fee)}\n👤 *Destinataire:* ${transactionData?.receiver_name}\n✅ *Statut:* COMPLÉTÉ`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }
  const shareViaEmailReceipt = () => {
    const subject = `CashPays - Reçu de transaction ${transactionData?.reference}`
    const body = `Bonjour,\n\nReçu de transaction CashPays.\n\nRÉFÉRENCE: ${transactionData?.reference}\nDATE: ${formatDate(transactionData?.date || new Date())}\nMONTANT: ${formatAmount(transactionData?.amount)}\nDESTINATAIRE: ${transactionData?.receiver_name}\n\nMerci d'utiliser CashPays !`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  const downloadTXT = () => {
    const receipt = `
╔══════════════════════════════════════════════════════════════╗
║                    CASHPAYS - REÇU DE TRANSACTION            ║
╠══════════════════════════════════════════════════════════════╣
║  Référence: ${transactionData?.reference}                    ║
║  Date: ${formatDate(transactionData?.date || new Date())}    ║
║  Statut: ✓ COMPLÉTÉ                                          ║
╠══════════════════════════════════════════════════════════════╣
║  DE: ${transactionData?.sender_name || user?.fullname} (${transactionData?.sender_phone || user?.phone}) ║
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

  const TransactionNotification = () => {
    if (notificationType === 'success') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-green-900 to-green-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse"></div>
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3">
                <FaCheckCircle className="text-green-400 text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Transfert réussi !</h2>
              <p className="text-green-200 text-sm mt-1">{formatAmount(transactionData?.amount)} envoyés</p>
            </div>
            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-white/60 text-sm">Référence</span><span className="text-white text-xs font-mono">{transactionData?.reference}</span></div>
                <div className="flex justify-between"><span className="text-white/60 text-sm">Destinataire</span><span className="text-white text-sm">{transactionData?.receiver_name}</span></div>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex justify-between"><span className="text-white/60 text-sm">Montant</span><span className="text-white font-bold">{formatAmount(transactionData?.amount)}</span></div>
                <div className="flex justify-between"><span className="text-white/60 text-sm">Frais (2%)</span><span className="text-yellow-300">{formatAmount(transactionData?.fee)}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/20"><span className="text-white font-semibold">Total débité</span><span className="text-white font-bold">{formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))}</span></div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={downloadPDF} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm"><FaFilePdf /> PDF</button>
                <button onClick={downloadTXT} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm"><FaDownload /> TXT</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={shareViaWhatsAppReceipt} className="flex items-center justify-center gap-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-xl text-sm"><FaWhatsapp /> WhatsApp</button>
                <button onClick={shareViaEmailReceipt} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm"><FaEnvelope /> Email</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs"><FaHome size={14} /> Accueil</button>
                <button onClick={() => { setShowNotification(false); setAmount(''); setReceiverPhone('') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs"><FaArrowRight size={14} /> Nouveau</button>
                <button onClick={() => { setShowNotification(false); navigate('/history') }} className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs"><FaHistory size={14} /> Historique</button>
              </div>
            </div>
            <div className="text-center py-2 bg-black/20"><p className="text-white/40 text-xs">Fermeture dans {countdown} seconde{countdown > 1 ? 's' : ''}...</p></div>
            <button onClick={() => setShowNotification(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
          </div>
        </div>
      )
    }
    if (notificationType === 'received') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3"><FaMoneyBillWave className="text-blue-400 text-5xl" /></div>
              <h2 className="text-2xl font-bold text-white">Argent reçu !</h2>
              <p className="text-blue-200 text-sm mt-1">{formatAmount(transactionData?.amount)} reçus</p>
            </div>
            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-white/60 text-sm">Référence</span><span className="text-white text-xs font-mono">{transactionData?.reference}</span></div>
                <div className="flex justify-between"><span className="text-white/60 text-sm">Expéditeur</span><span className="text-white text-sm">{transactionData?.sender_name}</span></div>
                <div className="flex justify-between"><span className="text-white/60 text-sm">Téléphone</span><span className="text-white text-sm">{transactionData?.sender_phone}</span></div>
              </div>
            </div>
            <div className="p-4"><button onClick={() => setShowNotification(false)} className="w-full btn-primary">Voir mon solde</button></div>
            <button onClick={() => setShowNotification(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
          </div>
        </div>
      )
    }
    if (notificationType === 'error') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-red-500/20 rounded-full mb-3"><FaExclamationTriangle className="text-red-400 text-5xl" /></div>
              <h2 className="text-2xl font-bold text-white">Transfert échoué</h2>
              <p className="text-red-200 text-sm mt-1">{transactionData?.error}</p>
            </div>
            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4"><div className="bg-red-500/20 rounded-lg p-3"><p className="text-red-300 text-sm">{transactionData?.suggestion}</p></div></div>
            <div className="p-4 flex gap-3"><button onClick={() => setShowNotification(false)} className="flex-1 btn-primary">Réessayer</button><button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex-1 btn-secondary">Retour</button></div>
            <button onClick={() => setShowNotification(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
          </div>
        </div>
      )
    }
    return null
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
                  💡 Le QR code généré redirige vers la page de transfert avec votre numéro pré-rempli
                </p>
                <p className="text-white/40 text-xs text-center mt-2">
                  Lien généré : <span className="text-blue-400 break-all">{`/transfer?phone=${user?.phone}`}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                {qrImageUrl && (
                  <img src={qrImageUrl} alt="QR Code de paiement" className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg" />
                )}
                <p className="text-white/60 text-xs mt-2">Scannez ce code pour me payer</p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Votre numéro</span>
                  <span className="font-mono font-bold text-white">{user?.phone}</span>
                </div>
                {qrAmount && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-white/60">Montant demandé</span>
                    <span className="text-green-400 font-bold">{parseInt(qrAmount).toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/10">
                  <span className="text-white/60">Lien de paiement</span>
                  <button onClick={() => copyToClipboard(paymentLink, 'Lien')} className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                    <FaCopy size={10} /> Copier
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={downloadQRCode} className="flex-1 btn-secondary text-sm"><FaDownload className="inline mr-1" /> Télécharger</button>
                <button onClick={() => copyToClipboard(paymentLink, 'Lien')} className="flex-1 btn-secondary text-sm"><FaCopy className="inline mr-1" /> Copier lien</button>
              </div>

              <div className="flex gap-2">
                <button onClick={shareViaWhatsApp} className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm py-2 rounded-lg"><FaWhatsapp className="inline mr-1" /> WhatsApp</button>
                <button onClick={shareViaEmail} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-lg"><FaEnvelope className="inline mr-1" /> Email</button>
              </div>

              <button onClick={resetQRGenerator} className="w-full text-sm text-white/40 hover:text-white/60">Générer un nouveau QR code</button>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {showNotification && <TransactionNotification />}
    </Layout>
  )
}

export default Transfer