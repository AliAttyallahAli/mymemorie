// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  FaArrowUp, FaHistory, FaNewspaper,FaBell, FaBullhorn, FaQrcode, FaWallet, FaCopy, FaCheckCircle, FaCalendarAlt, FaUser, 
  FaTimes, FaEye, FaEyeSlash,FaArrowDown, FaChartLine, FaWater, FaBolt, FaLandmark,FaMoneyBillWave, FaBus, FaFileInvoice 
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

function Dashboard({ user, socket }) {
  const [balance, setBalance] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    fetchData()
    
    if (socket) {
      socket.on('transaction_update', () => fetchData())
    }
    
    return () => {
      if (socket) socket.off('transaction_update')
    }
  }, [socket])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const [balanceRes, historyRes] = await Promise.all([
        axios.get('/api/wallet/balance', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/wallet/history?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setBalance(balanceRes.data.balance)
      setRecentTransactions(historyRes.data.transactions || [])
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount) => amount?.toLocaleString('fr-FR') + ' FCFA' || '0 FCFA'

  const formatBalanceDisplay = () => {
    if (!showBalance) {
      return '****** FCFA'
    }
    return formatAmount(balance)
  }

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
    if (date.toDateString() === yesterday.toDateString()) return 'Hier'
    return date.toLocaleDateString('fr-FR')
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleModalClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setShowQR(false)
    }
  }

  const qrData = JSON.stringify({ type: 'payment', recipient: user?.phone, name: user?.fullname })
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user} socket={socket}>
      {/* Balance Card avec bouton masquer/afficher */}
      <div className="card mb-6 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-white/80 text-sm">Solde disponible</p>
            <button 
              onClick={toggleBalanceVisibility}
              className="text-white/70 hover:text-white transition-colors"
              title={showBalance ? "Masquer le solde" : "Afficher le solde"}
            >
              {showBalance ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
            </button>
          </div>
          <h2 className="text-4xl font-bold text-white my-2">{formatBalanceDisplay()}</h2>
          <p className="text-white/60 text-sm">Wallet AlkherPay</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/transfer" className="card text-center hover:bg-white/20 transition-all">
          <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <FaArrowUp className="text-green-400 text-xl" />
          </div>
          <p className="text-white font-semibold">Envoyer</p>
          <p className="text-white/50 text-xs">Transfert d'argent</p>
        </Link>
        
        <button onClick={() => setShowQR(true)} className="card text-center hover:bg-white/20 transition-all">
          <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <FaQrcode className="text-blue-400 text-xl" />
          </div>
          <p className="text-white font-semibold">Mon QR Code</p>
          <p className="text-white/50 text-xs">Recevoir un paiement</p>
        </button>
      </div>

      {/* Section Paiement de factures */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FaFileInvoice className="text-yellow-400 text-xl" />
          <h3 className="text-white font-semibold">Annonces, Taxes et Investissements</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link 
            to="/bill-payment" 
            className="bg-green-500/40 border-b-emerald-800 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaMoneyBillWave className="text-emerald-800 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Payement de Facture</p>
            <p className="text-black text-xs">services</p>
          </Link>
         <Link 
            to="/blog" 
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/30 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-blue-500/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaBullhorn className="text-blue-400 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Article de blog</p>
            <p className="text-white/40 text-xs">publication</p>
          </Link>
          
          <Link 
            to="/announcements" 
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-yellow-500/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaBell className="text-yellow-400 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Nouvelles</p>
            <p className="text-white/40 text-xs">Annonces</p>
          </Link>
        <Link 
            to="/bus-booking" 
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-yellow-500/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaBus className="text-yellow-400 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Réservation Bus</p>
            <p className="text-white/40 text-xs">Voyages</p>
          </Link>
          <Link 
            to="/tax-payment" 
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-purple-500/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaLandmark className="text-purple-400 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Impôts</p>
            <p className="text-white/40 text-xs">Taxes communales</p>
          </Link>
          <Link 
            to="/investments" 
            className="bg-green-500/40 border-b-emerald-800 rounded-xl p-4 text-center transition-all transform hover:scale-105"
          >
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaChartLine className="text-emerald-800 text-2xl" />
            </div>
            <p className="text-white font-semibold text-sm">Investissements</p>
            <p className="text-black text-xs">finance</p>
          </Link>
          
        </div>
      </div> 
      

      {/* Historique */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold">📜 Dernières transactions</h3>
          <Link to="/history" className="text-blue-300 text-sm hover:text-blue-200 transition-colors">
            Voir tout →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/50">Aucune transaction</p>
            <Link to="/transfer" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
              Effectuer un transfert →
            </Link>
          </div>
        ) : (
          recentTransactions.map((tx) => {
            const isSender = tx.sender_phone === user?.phone
            const isPositive = tx.type === 'deposit' || (!isSender && tx.type !== 'withdraw')
            return (
              <div key={tx.id} className="flex justify-between items-center p-3 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">
                    {tx.type === 'deposit' ? '💰 Dépôt' : 
                     tx.type === 'withdraw' ? '💸 Retrait' : 
                     isSender ? '📤 Envoi' : '📥 Réception'}
                  </p>
                  <p className="text-white/40 text-xs">{formatDate(tx.created_at)}</p>
                  {tx.description && (
                    <p className="text-white/30 text-xs mt-1 truncate max-w-[150px]">{tx.description}</p>
                  )}
                </div>
                <p className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : '-'}{formatAmount(tx.amount)}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Modal QR */}
      {showQR && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={handleModalClick}
        >
          <div 
            ref={modalRef}
            className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Mon QR Code</h3>
              <button 
                onClick={() => setShowQR(false)} 
                className="text-white/60 hover:text-white"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl text-center mb-4">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-44 h-44 mx-auto"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="180"%3E%3Crect width="180" height="180" fill="%233b82f6"/%3E%3Ctext x="90" y="90" text-anchor="middle" fill="white" font-size="14"%3EAlkherPay%3C/text%3E%3C/svg%3E'
                }}
              />
            </div>
            
            <p className="text-white text-center font-mono text-lg mb-1">{user?.phone}</p>
            <p className="text-white/50 text-center text-xs mb-4">Scannez ce code pour me payer</p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => copyToClipboard(user?.phone || '')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                {copied ? 'Copié' : 'Copier le numéro'}
              </button>
              <button 
                onClick={() => setShowQR(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Dashboard