// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  FaArrowUp, FaArrowDown, FaHistory, FaUser, FaQrcode, 
  FaBell, FaWallet, FaCopy, FaCheckCircle, FaTimes 
} from 'react-icons/fa'
import { QRCodeSVG } from 'qrcode.react'  // Import correct pour QRCode
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

function Dashboard({ user, socket }) {
  const [balance, setBalance] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchData()
    
    // Écouter les mises à jour de transaction en temps réel
    if (socket) {
      socket.on('transaction_update', () => {
        fetchData()
      })
    }
    
    return () => {
      if (socket) {
        socket.off('transaction_update')
      }
    }
  }, [socket])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const [balanceRes, historyRes] = await Promise.all([
        axios.get('/api/wallet/balance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/wallet/history?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setBalance(balanceRes.data.balance)
      setRecentTransactions(historyRes.data.transactions || [])
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer': return '↗️'
      case 'deposit': return '💰'
      case 'withdraw': return '💸'
      default: return '🔄'
    }
  }

  const getTransactionColor = (type, isSender) => {
    if (type === 'deposit') return 'text-green-400'
    if (type === 'withdraw') return 'text-red-400'
    if (isSender) return 'text-red-400'
    return 'text-green-400'
  }

  const getTransactionPrefix = (type, isSender) => {
    if (type === 'deposit') return '+'
    if (type === 'withdraw') return '-'
    if (isSender) return '-'
    return '+'
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const qrData = JSON.stringify({
    type: 'payment',
    recipient: user?.phone,
    name: user?.fullname,
    currency: 'XAF'
  })

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
      {/* Balance Card */}
      <div className="card mb-6 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="text-center">
          <p className="text-white/80 text-sm mb-2">Solde disponible</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {formatAmount(balance)}
          </h2>
          <p className="text-white/60 text-sm">Wallet CashPays</p>
        </div>
      </div>

      {/* Actions Rapides */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/transfer" className="card text-center hover:bg-white/20 transition-all group">
          <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <FaArrowUp className="text-green-400 text-xl" />
          </div>
          <p className="text-white font-semibold">Envoyer</p>
          <p className="text-white/50 text-xs">Transfert instantané</p>
        </Link>
        
        <button
          onClick={() => setShowQR(true)}
          className="card text-center hover:bg-white/20 transition-all group"
        >
          <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <FaQrcode className="text-blue-400 text-xl" />
          </div>
          <p className="text-white font-semibold">Mon QR Code</p>
          <p className="text-white/50 text-xs">Scanner pour payer</p>
        </button>
      </div>

      {/* Dernières Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-xl font-semibold">
            <FaHistory className="inline mr-2" /> Dernières transactions
          </h3>
          <Link to="/history" className="text-blue-300 text-sm hover:text-blue-200">
            Voir tout →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-white/20 text-5xl mb-3">💸</div>
            <p className="text-white/50">Aucune transaction pour le moment</p>
            <Link to="/transfer" className="text-blue-400 text-sm mt-2 inline-block">
              Effectuer un transfert →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => {
              const isSender = tx.sender_phone === user?.phone
              const prefix = getTransactionPrefix(tx.type, isSender)
              const color = getTransactionColor(tx.type, isSender)
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getTransactionIcon(tx.type)}</div>
                    <div>
                      <p className="text-white font-medium">
                        {tx.type === 'deposit' ? 'Dépôt' :
                         tx.type === 'withdraw' ? 'Retrait' :
                         isSender ? `Envoi à ${tx.receiver_name || tx.receiver_phone}` : 
                         `Réception de ${tx.sender_name || tx.sender_phone}`}
                      </p>
                      <p className="text-white/40 text-xs">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${color}`}>
                      {prefix} {formatAmount(tx.amount)}
                    </p>
                    {tx.fee > 0 && (
                      <p className="text-white/30 text-xs">Frais: {formatAmount(tx.fee)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative max-w-sm w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Mon QR Code</h3>
              <button 
                onClick={() => setShowQR(false)} 
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4">
              <QRCodeSVG 
                value={qrData}
                size={200}
                bgColor="#ffffff"
                fgColor="#0A2F6C"
                level="H"
                includeMargin={true}
              />
            </div>
            
            {/* Informations */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-white font-mono text-xl tracking-wider">
                  {user?.phone}
                </p>
                <button
                  onClick={() => copyToClipboard(user?.phone || '')}
                  className="text-white/40 hover:text-white transition-all"
                  title="Copier le numéro"
                >
                  {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                </button>
              </div>
              <p className="text-white/50 text-sm">
                Scannez ce code pour me payer
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const canvas = document.querySelector('canvas')
                  if (canvas) {
                    const link = document.createElement('a')
                    link.download = 'cashpays-qrcode.png'
                    link.href = canvas.toDataURL()
                    link.click()
                  }
                }}
                className="flex-1 btn-secondary text-sm"
              >
                📥 Télécharger
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="flex-1 btn-primary text-sm"
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