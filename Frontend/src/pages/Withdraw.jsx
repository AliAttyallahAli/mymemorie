// src/pages/Withdraw.jsx - Version corrigée avec PIN
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaMoneyBillWave, FaMapMarkerAlt, FaPhone, FaUser, 
  FaClock, FaShieldAlt, FaQrcode, FaCopy, FaCheckCircle,
  FaArrowRight, FaHistory, FaHome, FaReceipt,
  FaWhatsapp, FaEnvelope, FaDownload, FaTimes,
  FaSpinner, FaInfoCircle, FaStore, FaExclamationTriangle,
  FaWallet, FaKey
} from 'react-icons/fa'
import Layout from '../components/Layout'
import PinModal from '../components/PinModal'

function Withdraw({ user, socket }) {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [balance, setBalance] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState('success')
  const [transactionData, setTransactionData] = useState(null)
  const [countdown, setCountdown] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [cities, setCities] = useState([])
  
  // États pour le PIN
  const [hasPin, setHasPin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingWithdraw, setPendingWithdraw] = useState(null)
  const [checkingPin, setCheckingPin] = useState(true)
  
  // Paramètres de transaction
  const WITHDRAWAL_MIN = 25
  const WITHDRAWAL_FEE = 2
  const WITHDRAWAL_MAX = 10000000

  useEffect(() => {
    fetchBalance()
    fetchAgents()
    checkUserPin()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('balance_updated', (data) => {
        if (data.user_id === user?.id) {
          setBalance(data.new_balance)
        }
      })
    }
    return () => {
      if (socket) {
        socket.off('balance_updated')
      }
    }
  }, [socket, user])

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

  const fetchBalance = async () => {
    setLoadingBalance(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBalance(response.data.balance)
    } catch (error) {
      console.error('Erreur chargement solde:', error)
      toast.error('Erreur lors du chargement du solde')
    } finally {
      setLoadingBalance(false)
    }
  }

  const fetchAgents = async () => {
    setLoadingAgents(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/agents', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const agentsData = response.data.agents || response.data || []
      setAgents(agentsData)
      
      const uniqueCities = [...new Set(agentsData.map(a => a.city || a.province).filter(Boolean))]
      setCities(uniqueCities)
    } catch (error) {
      console.error('Erreur chargement agents:', error)
      const mockAgents = [
        { id: 1, fullname: 'Jean NDOUMBE', phone: '66234567', province: 'N\'Djaména', city: 'N\'Djaména', agency_name: 'Agence CashPays Moursal', agency_address: 'Quartier Moursal' },
        { id: 2, fullname: 'Marie MBALLA', phone: '66345678', province: 'Logone Occidental', city: 'Moundou', agency_name: 'Agence CashPays Moundou', agency_address: 'Avenue Charles de Gaulle' },
        { id: 3, fullname: 'Pierre MADJI', phone: '66456789', province: 'Mayo-Kebbi Est', city: 'Bongor', agency_name: 'Agence CashPays Bongor', agency_address: 'Marché central' }
      ]
      setAgents(mockAgents)
    } finally {
      setLoadingAgents(false)
    }
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.phone?.includes(searchTerm) ||
                         (agent.agency_name && agent.agency_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCity = selectedCity === 'all' || agent.city === selectedCity || agent.province === selectedCity
    return matchesSearch && matchesCity
  })

  const calculateFees = () => {
    const amountNum = parseInt(amount) || 0
    const fee = Math.floor(amountNum * (WITHDRAWAL_FEE / 100))
    const netAmount = amountNum - fee
    return { fee, netAmount }
  }

  const prepareWithdraw = () => {
    const amountNum = parseInt(amount)
    
    if (isNaN(amountNum) || amountNum < WITHDRAWAL_MIN) {
      toast.error(`Le montant minimum est de ${WITHDRAWAL_MIN.toLocaleString()} FCFA`)
      return false
    }
    
    if (amountNum > WITHDRAWAL_MAX) {
      toast.error(`Le montant maximum est de ${WITHDRAWAL_MAX.toLocaleString()} FCFA`)
      return false
    }
    
    if (!selectedAgent) {
      toast.error('Veuillez sélectionner un agent')
      return false
    }
    
    if (amountNum > balance) {
      toast.error('Solde insuffisant')
      return false
    }
    
    setPendingWithdraw({
      amount: amountNum,
      agent_id: selectedAgent.id,
      agent_name: selectedAgent.fullname,
      agent_phone: selectedAgent.phone,
      description: `Retrait de ${amountNum} FCFA chez ${selectedAgent.fullname}`
    })
    
    return true
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    
    if (!prepareWithdraw()) return
    
    if (!hasPin) {
      setShowPinModal(true)
    } else {
      setShowPinModal(true)
    }
  }

  const processWithdraw = async () => {
    if (!pendingWithdraw) return
    
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/withdraw', {
        amount: pendingWithdraw.amount,
        agent_id: pendingWithdraw.agent_id,
        agent_phone: pendingWithdraw.agent_phone,
        description: pendingWithdraw.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const { fee, netAmount } = calculateFees()
      
      setBalance(prev => prev - pendingWithdraw.amount)
      
      setTransactionData({
        reference: response.data.reference || `WDR-${Date.now()}`,
        amount: pendingWithdraw.amount,
        fee: fee,
        netAmount: netAmount,
        agent_name: pendingWithdraw.agent_name,
        agent_phone: pendingWithdraw.agent_phone,
        status: 'completed',
        type: 'withdraw',
        date: new Date().toISOString(),
        new_balance: balance - pendingWithdraw.amount
      })
      
      setNotificationType('success')
      setShowNotification(true)
      setCountdown(5)
      
      setAmount('')
      setSelectedAgent(null)
      setPendingWithdraw(null)
      
    } catch (error) {
      console.error('Erreur retrait:', error)
      toast.error(error.response?.data?.error || 'Erreur lors du retrait')
      setTransactionData({ 
        error: error.response?.data?.error || 'Erreur lors du retrait',
        suggestion: 'Vérifiez votre solde ou réessayez plus tard'
      })
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setLoading(false)
    }
  }

  const { fee, netAmount } = calculateFees()

  const formatAmount = (amt) => {
    if (amt === null || amt === undefined) return '0 FCFA'
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

  const getBalanceColor = () => {
    if (balance < 1000) return 'text-red-400'
    if (balance < 10000) return 'text-yellow-400'
    return 'text-green-400'
  }

  const isAmountValid = () => {
    const amountNum = parseInt(amount)
    return amount && 
           !isNaN(amountNum) && 
           amountNum >= WITHDRAWAL_MIN && 
           amountNum <= WITHDRAWAL_MAX &&
           amountNum <= balance
  }

  const TransactionNotification = () => {
    if (notificationType === 'success') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-green-800 rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3">
                  <FaCheckCircle className="text-green-400 text-4xl" />
                </div>
                <h2 className="text-xl font-bold text-white">Retrait effectué !</h2>
                <p className="text-green-200 text-sm mt-1">
                  {formatAmount(transactionData?.netAmount)} retirés
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <div className="space-y-1 text-sm">
                  <p className="text-white/60">Référence: {transactionData?.reference}</p>
                  <p className="text-white/60">Agent: {transactionData?.agent_name}</p>
                  <p className="text-white/60">Téléphone: {transactionData?.agent_phone}</p>
                  <div className="border-t border-white/20 my-2"></div>
                  <p className="text-white/60">Montant retiré: {formatAmount(transactionData?.amount)}</p>
                  <p className="text-yellow-300">Frais: {formatAmount(transactionData?.fee)}</p>
                  <p className="text-white font-bold mt-1">Net reçu: {formatAmount(transactionData?.netAmount)}</p>
                  <div className="border-t border-white/20 my-2"></div>
                  <p className="text-white">Nouveau solde: {formatAmount(transactionData?.new_balance)}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => window.print()} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                  <FaDownload className="inline mr-1" /> Reçu
                </button>
                <button onClick={() => {
                  const message = `🏦 CASHPAYS - Retrait effectué ✅\n\n💰 Montant: ${formatAmount(transactionData?.amount)}\n📊 Frais: ${formatAmount(transactionData?.fee)}\n💰 Net: ${formatAmount(transactionData?.netAmount)}\n👤 Agent: ${transactionData?.agent_name}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                }} className="flex-1 bg-[#25d366]/20 text-white py-2 rounded-lg text-sm">
                  <FaWhatsapp className="inline mr-1" /> Partager
                </button>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                  <FaHome className="inline mr-1" /> Accueil
                </button>
                <button onClick={() => { setShowNotification(false); setAmount(''); setSelectedAgent(null) }} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                  <FaArrowRight className="inline mr-1" /> Nouveau
                </button>
                <button onClick={() => { setShowNotification(false); navigate('/history') }} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                  <FaHistory className="inline mr-1" /> Historique
                </button>
              </div>

              <div className="text-center mt-3">
                <p className="text-white/40 text-xs">Fermeture dans {countdown} secondes...</p>
              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-red-800 rounded-2xl shadow-2xl">
            <div className="p-6 text-center">
              <div className="inline-flex p-3 bg-red-500/20 rounded-full mb-3">
                <FaExclamationTriangle className="text-red-400 text-4xl" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Retrait échoué</h2>
              <p className="text-red-200 text-sm">{transactionData?.error}</p>
              <div className="bg-white/10 rounded-lg p-3 my-4">
                <p className="text-red-300 text-sm">{transactionData?.suggestion}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNotification(false)} className="flex-1 bg-white/20 text-white py-2 rounded-lg">
                  Réessayer
                </button>
                <button onClick={() => { setShowNotification(false); navigate('/dashboard') }} className="flex-1 bg-white text-red-800 py-2 rounded-lg font-semibold">
                  Retour
                </button>
              </div>
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

  if (checkingPin) {
    return (
      <Layout user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulaire de retrait */}
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-yellow-500/20 rounded-full mb-3">
              <FaMoneyBillWave className="text-yellow-400 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Retrait d'argent</h2>
            <p className="text-white/50 text-sm">Retirez de l'argent chez un agent CashPays</p>
          </div>

          <div className={`rounded-xl p-4 mb-6 text-center ${
            balance < WITHDRAWAL_MIN 
              ? 'bg-red-500/20 border border-red-500/30' 
              : balance < 10000 
                ? 'bg-yellow-500/20 border border-yellow-500/30'
                : 'bg-green-500/20 border border-green-500/30'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FaWallet className={`text-xl ${getBalanceColor()}`} />
              <p className="text-white/70 text-sm">Solde disponible</p>
            </div>
            {loadingBalance ? (
              <div className="flex justify-center py-2">
                <FaSpinner className="text-white text-xl animate-spin" />
              </div>
            ) : (
              <>
                <p className={`text-3xl font-bold ${getBalanceColor()}`}>
                  {formatAmount(balance)}
                </p>
                {balance < WITHDRAWAL_MIN && (
                  <p className="text-red-400/70 text-xs mt-2">
                    ⚠️ Solde insuffisant pour un retrait
                  </p>
                )}
              </>
            )}
          </div>

          <form onSubmit={handleWithdraw} className="space-y-5">
            <div>
              <label className="label flex items-center gap-2">
                <FaMoneyBillWave className="text-yellow-400" /> Montant à retirer (FCFA)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder={`Minimum: ${WITHDRAWAL_MIN.toLocaleString()} FCFA`}
                min={WITHDRAWAL_MIN}
                max={Math.min(balance, WITHDRAWAL_MAX)}
                required
                autoFocus
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-white/40 text-xs">
                  Minimum: {WITHDRAWAL_MIN.toLocaleString()} FCFA | Frais: {WITHDRAWAL_FEE}%
                </p>
                <p className="text-white/40 text-xs">Max: {formatAmount(Math.min(balance, WITHDRAWAL_MAX))}</p>
              </div>
            </div>

            {selectedAgent && (
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm font-semibold mb-2">✓ Agent sélectionné</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{selectedAgent.fullname}</p>
                    <p className="text-white/50 text-sm">{selectedAgent.phone}</p>
                    <p className="text-white/40 text-xs">{selectedAgent.agency_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAgent(null)}
                    className="text-white/40 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}

            {amount && parseInt(amount) >= WITHDRAWAL_MIN && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-white/80">
                  <span>Montant demandé</span>
                  <span>{formatAmount(parseInt(amount))}</span>
                </div>
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Frais ({WITHDRAWAL_FEE}%)</span>
                  <span className={fee > 0 ? 'text-yellow-400' : 'text-white/40'}>
                    {formatAmount(fee)}
                  </span>
                </div>
                <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold">
                  <span>Net à recevoir</span>
                  <span className="text-green-400">{formatAmount(netAmount)}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 rounded-xl p-3 flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" />
              <p className="text-blue-300 text-xs">
                {hasPin 
                  ? '🔐 Vos opérations sont sécurisées par votre code PIN' 
                  : '🔒 Définissez votre code PIN pour sécuriser vos transactions'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedAgent || !isAmountValid()}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" /> Traitement...
                </div>
              ) : (
                'Confirmer le retrait'
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-yellow-500/10 rounded-xl">
            <p className="text-yellow-300 text-xs flex items-center gap-2">
              <FaInfoCircle /> Frais de {WITHDRAWAL_FEE}%. Présentez-vous chez l'agent avec votre téléphone.
            </p>
          </div>
        </div>

        {/* Liste des agents */}
        <div className="card">
          <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
            <FaStore className="text-blue-400" /> Choisissez un agent
          </h3>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>

          {cities.length > 0 && (
            <div className="mb-4">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input-field"
              >
                <option value="all">Toutes les villes</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          {loadingAgents ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="text-white text-2xl animate-spin" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/50">Aucun agent trouvé</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{agent.fullname}</p>
                      <p className="text-white/40 text-sm">{agent.phone}</p>
                      <p className="text-white/50 text-xs">{agent.agency_name}</p>
                      <p className="text-white/30 text-xs flex items-center gap-1 mt-1">
                        <FaMapMarkerAlt size={10} /> {agent.agency_address || agent.city || agent.province}
                      </p>
                    </div>
                    {selectedAgent?.id === agent.id && (
                      <FaCheckCircle className="text-yellow-400 text-xl" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false)
            setPendingWithdraw(null)
          }}
          onSuccess={() => {
            setHasPin(true)
            processWithdraw()
          }}
          type={hasPin ? 'verify' : 'set'}
          amount={pendingWithdraw?.amount}
        />
      )}

      {showNotification && <TransactionNotification />}
    </Layout>
  )
}

export default Withdraw