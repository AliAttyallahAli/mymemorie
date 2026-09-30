// src/pages/Deposit.jsx - Version corrigée sans erreurs DOM
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaMoneyBillWave, FaMapMarkerAlt, FaPhone, FaUser, 
  FaClock, FaShieldAlt, FaQrcode, FaCopy, FaCheckCircle,
  FaArrowRight, FaHistory, FaHome, FaReceipt,
  FaWhatsapp, FaEnvelope, FaDownload, FaTimes,
  FaSpinner, FaInfoCircle, FaStore, FaUserCheck,
  FaExclamationTriangle
} from 'react-icons/fa'
import Layout from '../components/Layout'
import PinModal from '../components/PinModal'

function Deposit({ user }) {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)
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
  const [pendingDeposit, setPendingDeposit] = useState(null)
  const [checkingPin, setCheckingPin] = useState(true)

  useEffect(() => {
    fetchAgents()
    checkUserPin()
  }, [])

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
        { id: 1, fullname: 'Jean NDOUMBE', phone: '66234567', province: 'N\'Djaména', city: 'N\'Djaména', agency_name: 'Agence AlkherPay Moursal', agency_address: 'Quartier Moursal' },
        { id: 2, fullname: 'Marie MBALLA', phone: '66345678', province: 'Logone Occidental', city: 'Moundou', agency_name: 'Agence AlkherPay Moundou', agency_address: 'Avenue Charles de Gaulle' },
        { id: 3, fullname: 'Pierre MADJI', phone: '66456789', province: 'Mayo-Kebbi Est', city: 'Bongor', agency_name: 'Agence AlkherPay Bongor', agency_address: 'Marché central' },
        { id: 4, fullname: 'Aïssa MAHAMAT', phone: '66567890', province: 'Ouaddaï', city: 'Abéché', agency_name: 'Agence AlkherPay Abéché', agency_address: 'Route de l\'aéroport' }
      ]
      setAgents(mockAgents)
      setCities(['N\'Djaména', 'Moundou', 'Bongor', 'Abéché'])
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

  const prepareDeposit = () => {
    const amountNum = parseInt(amount)
    if (amountNum < 100) {
      toast.error('Le montant minimum est de 100 FCFA')
      return false
    }
    
    if (!selectedAgent) {
      toast.error('Veuillez sélectionner un agent')
      return false
    }
    
    setPendingDeposit({
      amount: amountNum,
      agent_id: selectedAgent.id,
      agent_name: selectedAgent.fullname,
      agent_phone: selectedAgent.phone,
      description: `Dépôt de ${amountNum} FCFA chez ${selectedAgent.fullname}`
    })
    
    return true
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    
    if (!prepareDeposit()) return
    
    if (!hasPin) {
      setShowPinModal(true)
    } else {
      setShowPinModal(true)
    }
  }

  const processDeposit = async () => {
    if (!pendingDeposit) return
    
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/deposit', {
        amount: pendingDeposit.amount,
        agent_id: pendingDeposit.agent_id,
        description: pendingDeposit.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setTransactionData({
        reference: response.data.reference || `DEP-${Date.now()}`,
        amount: pendingDeposit.amount,
        fee: 0,
        agent_name: pendingDeposit.agent_name,
        agent_phone: pendingDeposit.agent_phone,
        status: 'completed',
        type: 'deposit',
        date: new Date().toISOString()
      })
      
      setNotificationType('success')
      setShowNotification(true)
      setCountdown(5)
      
      setAmount('')
      setSelectedAgent(null)
      setPendingDeposit(null)
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du dépôt')
      setTransactionData({ error: error.response?.data?.error || 'Erreur lors du dépôt' })
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setLoading(false)
    }
  }

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
                <h2 className="text-xl font-bold text-white">Dépôt réussi !</h2>
                <p className="text-green-200 text-sm mt-1">
                  {formatAmount(transactionData?.amount)} ajoutés à votre compte
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <div className="space-y-1 text-sm">
                  <p className="text-white/60">Référence: {transactionData?.reference}</p>
                  <p className="text-white/60">Agent: {transactionData?.agent_name}</p>
                  <p className="text-white/60">Téléphone: {transactionData?.agent_phone}</p>
                  <div className="border-t border-white/20 my-2"></div>
                  <p className="text-white font-bold">Montant: {formatAmount(transactionData?.amount)}</p>
                  <p className="text-green-300">Frais: Gratuit</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => window.print()} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                  <FaDownload className="inline mr-1" /> Reçu
                </button>
                <button onClick={() => {
                  const message = `🏦 AlkherPay - Dépôt réussi ✅\n\n💰 Montant: ${formatAmount(transactionData?.amount)}\n👤 Agent: ${transactionData?.agent_name}`
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
              <h2 className="text-xl font-bold text-white mb-2">Dépôt échoué</h2>
              <p className="text-red-200 text-sm">{transactionData?.error}</p>
              <div className="flex gap-3 mt-4">
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
        {/* Formulaire de dépôt */}
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-3">
              <FaMoneyBillWave className="text-green-400 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">Dépôt d'argent</h2>
            <p className="text-white/50 text-sm">Déposez de l'argent chez un agent AlkherPay</p>
          </div>

          <form onSubmit={handleDeposit} className="space-y-5">
            <div>
              <label className="label flex items-center gap-2">
                <FaMoneyBillWave className="text-green-400" /> Montant à déposer (FCFA)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="Ex: 5000"
                min="100"
                required
                autoFocus
              />
              <p className="text-white/40 text-xs mt-1">Minimum: 100 FCFA | Frais: 0% (gratuit)</p>
            </div>

            {selectedAgent && (
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <p className="text-green-400 text-sm font-semibold mb-2">✓ Agent sélectionné</p>
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
              disabled={loading || !selectedAgent || !amount}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" /> Traitement...
                </div>
              ) : (
                'Confirmer le dépôt'
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-500/10 rounded-xl">
            <p className="text-blue-300 text-xs flex items-center gap-2">
              <FaInfoCircle /> Les dépôts sont gratuits. Présentez-vous chez l'agent avec votre téléphone.
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
                      ? 'bg-green-500/20 border border-green-500/50'
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
                      <FaCheckCircle className="text-green-400 text-xl" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal PIN */}
      {showPinModal && (
        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false)
            setPendingDeposit(null)
          }}
          onSuccess={() => {
            setHasPin(true)
            processDeposit()
          }}
          type={hasPin ? 'verify' : 'set'}
          amount={pendingDeposit?.amount}
        />
      )}

      {showNotification && <TransactionNotification />}
    </Layout>
  )
}

export default Deposit