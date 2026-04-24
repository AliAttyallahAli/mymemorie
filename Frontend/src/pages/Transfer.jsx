// src/pages/Transfer.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaMoneyBillWave, FaQrcode, 
  FaCamera, FaCopy, FaCheckCircle, 
  FaArrowLeft, FaInfoCircle, FaExchangeAlt,
  FaPercent, FaShieldAlt, FaHistory, FaKeyboard,
  FaRegKeyboard, FaMobileAlt
} from 'react-icons/fa'
import Layout from '../components/Layout'
import QRScanner from '../components/QRScanner'

function Transfer({ user }) {
  const [receiverPhone, setReceiverPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showManualInput, setShowManualInput] = useState(true)
  const [copied, setCopied] = useState(false)
  const [recentContacts, setRecentContacts] = useState([])
  const navigate = useNavigate()

  // Charger les contacts récents
  React.useEffect(() => {
    const loadRecentContacts = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const response = await axios.get('/api/wallet/history?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.transactions) {
          const uniqueContacts = [...new Map(
            response.data.transactions
              .filter(tx => tx.receiver_phone !== user?.phone)
              .map(tx => [tx.receiver_phone, {
                phone: tx.receiver_phone,
                name: tx.receiver_name || tx.receiver_phone,
                date: tx.created_at
              }])
          ).values()]
          setRecentContacts(uniqueContacts.slice(0, 5))
        }
      } catch (error) {
        console.error('Erreur chargement contacts récents:', error)
      }
    }
    loadRecentContacts()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const amountNum = parseInt(amount)
    
    // Validations
    if (amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return
    }
    
    if (amountNum > 100000000) {
      toast.error('Le montant maximum est de 100 000 000 FCFA')
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

    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(
        '/api/transfer',
        {
          receiver_phone: receiverPhone,
          amount: amountNum,
          description: description || 'Transfert CashPays'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      toast.success(`Transfert de ${amountNum.toLocaleString()} FCFA effectué avec succès !`)
      navigate('/dashboard')
      
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors du transfert'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleScanSuccess = (qrData) => {
    if (qrData && qrData.recipient) {
      setReceiverPhone(qrData.recipient)
      if (qrData.amount) setAmount(qrData.amount.toString())
      toast.success('QR code scanné avec succès !')
      setShowScanner(false)
      setShowManualInput(true)
    } else if (qrData && typeof qrData === 'string') {
      setReceiverPhone(qrData)
      toast.success('Numéro scanné avec succès !')
      setShowScanner(false)
      setShowManualInput(true)
    } else {
      toast.error('QR code invalide')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const setQuickAmount = (value) => {
    setAmount(value.toString())
  }

  const calculateFees = () => {
    const amountNum = parseInt(amount) || 0
    const fee = Math.floor(amountNum * 0.02)
    const total = amountNum + fee
    return { fee, total }
  }

  const { fee, total } = calculateFees()

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000]

  return (
    <Layout user={user}>
      {/* Header avec retour */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
        >
          <FaArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Transfert d'argent</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Choix du mode de saisie */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  setShowManualInput(true)
                  setShowScanner(false)
                }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  showManualInput && !showScanner
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <FaRegKeyboard /> Saisie manuelle
              </button>
              <button
                onClick={() => {
                  setShowScanner(true)
                  setShowManualInput(false)
                }}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  showScanner
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <FaCamera /> Scanner QR
              </button>
            </div>

            {/* Scanner QR */}
            {showScanner && (
              <QRScanner
                onScan={handleScanSuccess}
                onClose={() => {
                  setShowScanner(false)
                  setShowManualInput(true)
                }}
              />
            )}

            {/* Formulaire de saisie manuelle */}
            {showManualInput && !showScanner && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Contacts récents */}
                {recentContacts.length > 0 && (
                  <div>
                    <label className="label flex items-center gap-2">
                      <FaHistory className="text-blue-400" /> Contacts récents
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {recentContacts.map((contact) => (
                        <button
                          key={contact.phone}
                          type="button"
                          onClick={() => setReceiverPhone(contact.phone)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-all"
                        >
                          {contact.name.length > 10 ? contact.name.substring(0, 10) + '...' : contact.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Destinataire */}
                <div>
                  <label className="label">
                    <FaPhone className="inline mr-2" /> Numéro du destinataire
                    <span className="text-red-400 ml-1">*</span>
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
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowScanner(true)
                        setShowManualInput(false)
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 rounded-xl transition-all"
                      title="Scanner un QR code"
                    >
                      <FaQrcode className="text-xl" />
                    </button>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    Le numéro de téléphone est l'adresse du portefeuille CashPays
                  </p>
                </div>

                {/* Montant */}
                <div>
                  <label className="label">
                    <FaMoneyBillWave className="inline mr-2" /> Montant (FCFA)
                    <span className="text-red-400 ml-1">*</span>
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
                  <p className="text-white/40 text-xs mt-1">Minimum: 25 FCFA</p>
                </div>

                {/* Montants rapides */}
                <div>
                  <label className="label">Montants rapides</label>
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickAmount(amt)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-all"
                      >
                        {amt.toLocaleString()} FCFA
                      </button>
                    ))}
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
                    placeholder="Ex: Remboursement, Paiement, Cadeau..."
                  />
                </div>

                {/* Récapitulatif des frais */}
                {amount && parseInt(amount) >= 25 && (
                  <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <FaPercent className="text-blue-400" />
                      <p className="text-white font-semibold">Détail des frais</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-white/80">
                        <span>Montant à envoyer</span>
                        <span className="font-medium">{parseInt(amount).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-white/60 text-sm">
                        <span>Frais de transaction (2%)</span>
                        <span>{fee.toLocaleString()} FCFA</span>
                      </div>
                      <div className="border-t border-blue-500/30 pt-2 flex justify-between text-white font-bold">
                        <span>Total à débiter</span>
                        <span className="text-lg">{total.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton de confirmation */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Traitement en cours...
                    </div>
                  ) : (
                    <>
                      <FaExchangeAlt className="inline mr-2" /> Confirmer le transfert
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar droite - Informations */}
        <div className="lg:col-span-1 space-y-6">
          {/* Votre wallet */}
          <div className="card">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" /> Votre wallet
            </h3>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Votre adresse</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-white font-mono text-xl font-bold">
                  {user?.phone}
                </p>
                <button
                  onClick={() => copyToClipboard(user?.phone || '')}
                  className="text-white/40 hover:text-white transition-all"
                  title="Copier mon numéro"
                >
                  {copied ? <FaCheckCircle className="text-green-400 text-xl" /> : <FaCopy className="text-xl" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                const qrData = JSON.stringify({
                  type: 'payment',
                  recipient: user?.phone,
                  name: user?.fullname,
                  currency: 'XAF'
                })
                navigator.clipboard.writeText(qrData)
                toast.success('QR code copié dans le presse-papier')
              }}
              className="w-full mt-3 btn-secondary text-sm flex items-center justify-center gap-2"
            >
              <FaQrcode /> Partager mon QR code
            </button>
          </div>

          {/* Informations */}
          <div className="card">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaInfoCircle className="text-blue-400" /> À savoir
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="text-blue-400">💰</div>
                <div>
                  <p className="text-white">Frais de transfert</p>
                  <p className="text-white/50 text-xs">2% du montant envoyé</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-green-400">⚡</div>
                <div>
                  <p className="text-white">Transfert instantané</p>
                  <p className="text-white/50 text-xs">Le destinataire reçoit immédiatement</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-yellow-400">🔒</div>
                <div>
                  <p className="text-white">Transaction sécurisée</p>
                  <p className="text-white/50 text-xs">Chiffrement AES-256 + XML ISO 20022</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-purple-400">📱</div>
                <div>
                  <p className="text-white">Limite minimale</p>
                  <p className="text-white/50 text-xs">25 FCFA par transaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="card bg-gradient-to-r from-blue-600/20 to-blue-700/20">
            <h3 className="text-white font-semibold mb-2">Besoin d'aide ?</h3>
            <p className="text-white/60 text-sm mb-3">
              Une question sur votre transfert ? Contactez notre service client.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = 'tel:+23562787307'}
                className="flex-1 btn-secondary text-sm"
              >
                📞 Appeler
              </button>
              <button
                onClick={() => window.location.href = 'https://wa.me/23562787307'}
                className="flex-1 btn-secondary text-sm"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Transfer