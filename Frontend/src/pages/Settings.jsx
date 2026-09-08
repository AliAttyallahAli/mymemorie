// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'  // ← AJOUTER Link ici
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaBell, FaLock, FaLanguage, FaGlobe, 
  FaMoneyBillWave, FaShieldAlt, FaPalette, FaMobile, 
  FaExchangeAlt, FaDatabase, FaSave, FaUndo, FaKey,
  FaEnvelope, FaSms, FaMoon, FaSun, FaQrcode, FaFingerprint,
  FaChartLine, FaPercent, FaMinusCircle, FaPlusCircle,
  FaDownload, FaWhatsapp, FaCopy, FaShare, FaLockOpen,
  FaClock, FaCheckCircle, FaExclamationTriangle, FaChevronRight
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Settings({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [provinces, setProvinces] = useState([])
  
  // États pour le QR code dynamique
  const [qrAmount, setQrAmount] = useState('')
  const [qrDescription, setQrDescription] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // États pour le PIN de transaction
  const [transactionPin, setTransactionPin] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
    isPinSet: false
  })
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinMode, setPinMode] = useState('create')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [resetRequestSent, setResetRequestSent] = useState(false)
  const [resetReason, setResetReason] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  
  // États pour la 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  
  // États des différents paramètres
  const [profileData, setProfileData] = useState({
    fullname: '',
    phone: '',
    email: '',
    province: '',
    city: '',
    address: ''
  })
  
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [preferences, setPreferences] = useState({
    language: 'fr',
    theme: 'dark',
    notifications: {
      email: true,
      sms: true,
      push: true,
      transaction: true,
      promo: true
    },
    biometric: false,
    quickActions: true,
    defaultTransferMessage: ''
  })
  
  const [appSettings, setAppSettings] = useState({
    minTransaction: 25,
    maxTransaction: 10000000,
    transferFee: 2,
    depositFee: 0,
    withdrawalFee: 2,
    referralBonus: 500,
    maintenanceMode: false,
    allowInternationalTransfer: false
  })
  
  const [qrSettings, setQrSettings] = useState({
    qrSize: 200,
    qrColor: '#1e3a8a',
    qrBgColor: '#ffffff',
    showAmountInQR: true
  })

  useEffect(() => {
    fetchProvinces()
    fetchUserProfile()
    fetchUserPreferences()
    fetchTransactionPinStatus()
    fetch2FAStatus()
    if (user?.role === 'admin') {
      fetchAppSettings()
    }
  }, [])

  const fetchProvinces = async () => {
    try {
      const response = await axios.get('/api/provinces')
      if (Array.isArray(response.data)) {
        setProvinces(response.data)
      }
    } catch (error) {
      console.error('Erreur chargement provinces:', error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfileData({
        fullname: response.data.fullname || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        province: response.data.province || '',
        city: response.data.city || '',
        address: response.data.address || ''
      })
    } catch (error) {
      console.error('Erreur chargement profil:', error)
    }
  }

  const fetchTransactionPinStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/pin-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactionPin(prev => ({
        ...prev,
        isPinSet: response.data.isPinSet || false
      }))
    } catch (error) {
      console.error('Erreur chargement statut PIN:', error)
    }
  }

  const fetch2FAStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/2fa/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTwoFactorEnabled(response.data.enabled || false)
    } catch (error) {
      console.error('Erreur chargement statut 2FA:', error)
    }
  }

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: null }))
      
      if (response.data) {
        setPreferences(prev => ({ ...prev, ...response.data }))
      }
      
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        setPreferences(prev => ({ ...prev, theme: savedTheme }))
      }
    } catch (error) {
      console.error('Erreur chargement préférences:', error)
    }
  }

  const fetchAppSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data) {
        setAppSettings(prev => ({ ...prev, ...response.data }))
      }
    } catch (error) {
      console.error('Erreur chargement paramètres app:', error)
    }
  }

  const updateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put('/api/user/profile', {
        fullname: profileData.fullname,
        city: profileData.city,
        address: profileData.address
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Profil mis à jour avec succès')
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
      savedUser.fullname = profileData.fullname
      localStorage.setItem('user', JSON.stringify(savedUser))
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault()
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (securityData.newPassword.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/change-password', {
        oldPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Mot de passe modifié avec succès')
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  // ========== FONCTIONS PIN DE TRANSACTION ==========
  
  const handleCreatePin = async (e) => {
    e.preventDefault()
    setPinError('')
    setPinSuccess('')
    
    if (transactionPin.newPin.length !== 4 || !/^\d{4}$/.test(transactionPin.newPin)) {
      setPinError('Le PIN doit contenir 4 chiffres')
      return
    }
    
    if (transactionPin.newPin !== transactionPin.confirmPin) {
      setPinError('Les PIN ne correspondent pas')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/set-transaction-pin', {
        pin: transactionPin.newPin
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setPinSuccess('PIN de transaction créé avec succès !')
      toast.success('PIN de transaction créé')
      setShowPinModal(false)
      fetchTransactionPinStatus()
      setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
      
    } catch (error) {
      setPinError(error.response?.data?.error || 'Erreur lors de la création du PIN')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChangePin = async (e) => {
    e.preventDefault()
    setPinError('')
    setPinSuccess('')
    
    if (!transactionPin.currentPin || transactionPin.currentPin.length !== 4) {
      setPinError('Veuillez entrer votre PIN actuel')
      return
    }
    
    if (transactionPin.newPin.length !== 4 || !/^\d{4}$/.test(transactionPin.newPin)) {
      setPinError('Le nouveau PIN doit contenir 4 chiffres')
      return
    }
    
    if (transactionPin.newPin !== transactionPin.confirmPin) {
      setPinError('Les nouveaux PIN ne correspondent pas')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/change-transaction-pin', {
        currentPin: transactionPin.currentPin,
        newPin: transactionPin.newPin
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setPinSuccess('PIN de transaction modifié avec succès !')
      toast.success('PIN modifié')
      setShowPinModal(false)
      setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
      
    } catch (error) {
      setPinError(error.response?.data?.error || 'Erreur lors du changement de PIN')
    } finally {
      setLoading(false)
    }
  }
  
  const handleResetPinRequest = async () => {
    if (!resetReason.trim()) {
      toast.error('Veuillez indiquer une raison')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/request-pin-reset', {
        reason: resetReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setResetRequestSent(true)
      toast.success('Demande de réinitialisation envoyée. L\'administrateur vous contactera.')
      setShowResetModal(false)
      setResetReason('')
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la demande')
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/preferences', preferences, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      document.documentElement.classList.toggle('light', preferences.theme === 'light')
      localStorage.setItem('theme', preferences.theme)
      
      toast.success('Préférences enregistrées')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  const updateAppSettings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put('/api/admin/settings', appSettings, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Paramètres de l\'application mis à jour')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const resetSettings = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      setAppSettings({
        minTransaction: 25,
        maxTransaction: 10000000,
        transferFee: 2,
        depositFee: 0,
        withdrawalFee: 2,
        referralBonus: 500,
        maintenanceMode: false,
        allowInternationalTransfer: false
      })
      toast.success('Paramètres réinitialisés')
    }
  }

  // ========== FONCTIONS QR CODE DYNAMIQUE ==========
  const generatePaymentLink = () => {
    const amountNum = parseInt(qrAmount)
    if (amountNum && amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return null
    }
    
    const params = new URLSearchParams()
    if (user?.phone) params.append('phone', user.phone)
    if (amountNum) params.append('amount', amountNum)
    if (qrDescription) params.append('description', qrDescription)
    
    return `${window.location.origin}/transfer?${params.toString()}`
  }

  const generateDynamicQR = async () => {
    const link = generatePaymentLink()
    if (!link) return
    
    setGenerating(true)
    
    try {
      const encodedLink = encodeURIComponent(link)
      const qrApiUrl = `https://quickchart.io/qr?text=${encodedLink}&size=250&margin=2`
      
      const response = await fetch(qrApiUrl)
      if (response.ok) {
        setPaymentLink(link)
        setQrImageUrl(qrApiUrl)
        setQrGenerated(true)
        toast.success('QR code généré avec succès !')
      } else {
        throw new Error('Erreur génération QR code')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const resetQRGenerator = () => {
    setQrGenerated(false)
    setQrAmount('')
    setQrDescription('')
    setQrImageUrl('')
    setPaymentLink('')
  }

  const copyToClipboard = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Lien copié !')
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

  const tabs = [
    { id: 'profile', label: 'Profil', icon: FaUser },
    { id: 'security', label: 'Sécurité', icon: FaShieldAlt },
    { id: 'preferences', label: 'Préférences', icon: FaPalette },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'qr', label: 'QR Code', icon: FaQrcode },
  ]

  if (user?.role === 'admin') {
    tabs.push(
      { id: 'app', label: 'Application', icon: FaGlobe },
      { id: 'fees', label: 'Frais & Limites', icon: FaPercent },
      { id: 'system', label: 'Système', icon: FaDatabase }
    )
  }

  return (
    <Layout user={user}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">
          ⚙️ Paramètres
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Profil */}
        {activeTab === 'profile' && (
          <form onSubmit={updateProfile} className="space-y-4 max-w-2xl">
            <div>
              <label className="label">Nom complet</label>
              <input
                type="text"
                value={profileData.fullname}
                onChange={(e) => setProfileData({...profileData, fullname: e.target.value})}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="label">Numéro de téléphone</label>
              <input
                type="tel"
                value={profileData.phone}
                className="input-field bg-white/5"
                disabled
              />
              <p className="text-white/40 text-xs mt-1">Le numéro de téléphone ne peut pas être modifié</p>
            </div>
            
            <div>
              <label className="label">Email (optionnel)</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="input-field"
                placeholder="votre@email.com"
              />
            </div>
            
            <div>
              <label className="label">Province</label>
              <select
                value={profileData.province}
                onChange={(e) => setProfileData({...profileData, province: e.target.value})}
                className="input-field"
              >
                <option value="">Sélectionnez votre province</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Ville</label>
              <input
                type="text"
                value={profileData.city}
                onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                className="input-field"
                placeholder="Votre ville"
              />
            </div>
            
            <div>
              <label className="label">Adresse</label>
              <textarea
                value={profileData.address}
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                className="input-field"
                rows="2"
                placeholder="Votre adresse complète"
              />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        )}

        {/* Tab Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            {/* Changer le mot de passe */}
            <form onSubmit={updatePassword} className="space-y-4">
              <h3 className="text-white text-lg font-semibold">Changer le mot de passe</h3>
              <div>
                <label className="label">Mot de passe actuel</label>
                <input
                  type="password"
                  value={securityData.currentPassword}
                  onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                Changer le mot de passe
              </button>
            </form>

            {/* Authentification à deux facteurs - AVEC LIEN VERS 2FA */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-semibold">Authentification à deux facteurs</h3>
                <Link 
                  to="/settings/2fa" 
                  className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
                >
                  Configurer <FaChevronRight size={12} />
                </Link>
              </div>
              <div className={`rounded-xl p-4 ${twoFactorEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className="flex items-center gap-3">
                  <FaShieldAlt className={`text-xl ${twoFactorEnabled ? 'text-green-400' : 'text-yellow-400'}`} />
                  <div>
                    <p className="text-white font-medium">
                      {twoFactorEnabled ? '2FA activée' : '2FA désactivée'}
                    </p>
                    <p className="text-white/50 text-xs">
                      {twoFactorEnabled 
                        ? 'Votre compte est protégé par double authentification'
                        : 'Activez la 2FA pour plus de sécurité'}
                    </p>
                  </div>
                  {twoFactorEnabled && <FaCheckCircle className="text-green-400 ml-auto" />}
                </div>
              </div>
            </div>

            {/* Section PIN de transaction */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-semibold">PIN de transaction</h3>
                <div className="flex gap-2">
                  {transactionPin.isPinSet && (
                    <button
                      onClick={() => {
                        setPinMode('change')
                        setShowPinModal(true)
                        setPinError('')
                        setPinSuccess('')
                        setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
                      }}
                      className="text-blue-400 text-sm hover:text-blue-300"
                    >
                      Modifier le PIN
                    </button>
                  )}
                  {!transactionPin.isPinSet && (
                    <button
                      onClick={() => {
                        setPinMode('create')
                        setShowPinModal(true)
                        setPinError('')
                        setPinSuccess('')
                      }}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      Créer un PIN
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaLock className="text-blue-400" />
                    <div>
                      <p className="text-white font-medium">PIN de transaction</p>
                      <p className="text-white/40 text-xs">
                        {transactionPin.isPinSet 
                          ? "✓ PIN activé - Utilisé pour sécuriser vos transactions" 
                          : "PIN non défini - Activez-le pour plus de sécurité"}
                      </p>
                    </div>
                  </div>
                  {transactionPin.isPinSet ? (
                    <FaCheckCircle className="text-green-400 text-xl" />
                  ) : (
                    <FaExclamationTriangle className="text-yellow-400 text-xl" />
                  )}
                </div>
              </div>
              
              {/* Bouton PIN oublié */}
              <div className="mt-3">
                <button
                  onClick={() => setShowResetModal(true)}
                  className="text-yellow-400 text-sm hover:text-yellow-300 flex items-center gap-2"
                >
                  <FaLockOpen size={14} />
                  PIN oublié ? Demander une réinitialisation
                </button>
              </div>
            </div>
            
            {/* Appareils connectés */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white text-lg font-semibold mb-4">Appareils connectés</h3>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Appareil actuel</p>
                    <p className="text-white/40 text-sm">Chrome • Windows</p>
                  </div>
                  <span className="text-green-400 text-sm">✓ Connecté</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PIN DE TRANSACTION */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {pinMode === 'create' ? 'Créer un PIN de transaction' : 'Modifier le PIN'}
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6">
                {pinSuccess && (
                  <div className="bg-green-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <FaCheckCircle className="text-green-400" />
                    <p className="text-green-400 text-sm">{pinSuccess}</p>
                  </div>
                )}
                
                {pinError && (
                  <div className="bg-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-400" />
                    <p className="text-red-400 text-sm">{pinError}</p>
                  </div>
                )}
                
                <form onSubmit={pinMode === 'create' ? handleCreatePin : handleChangePin} className="space-y-4">
                  {pinMode === 'change' && (
                    <div>
                      <label className="label">PIN actuel</label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={transactionPin.currentPin}
                        onChange={(e) => setTransactionPin({...transactionPin, currentPin: e.target.value})}
                        className="input-field text-center text-2xl tracking-widest"
                        placeholder="••••"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="label">
                      {pinMode === 'create' ? 'Nouveau PIN' : 'Nouveau PIN'}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      value={transactionPin.newPin}
                      onChange={(e) => setTransactionPin({...transactionPin, newPin: e.target.value})}
                      className="input-field text-center text-2xl tracking-widest"
                      placeholder="••••"
                      required
                    />
                    <p className="text-white/40 text-xs mt-1">Code à 4 chiffres</p>
                  </div>
                  
                  <div>
                    <label className="label">Confirmer le PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      value={transactionPin.confirmPin}
                      onChange={(e) => setTransactionPin({...transactionPin, confirmPin: e.target.value})}
                      className="input-field text-center text-2xl tracking-widest"
                      placeholder="••••"
                      required
                    />
                  </div>
                  
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Traitement...' : (pinMode === 'create' ? 'Créer le PIN' : 'Modifier le PIN')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DEMANDE RÉINITIALISATION PIN */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="relative max-w-md w-full bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaLockOpen className="text-yellow-400" />
                  Demande de réinitialisation du PIN
                </h3>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-white/80 text-sm mb-4">
                  Vous avez oublié votre PIN de transaction ? Une demande sera envoyée à l'administrateur qui vous contactera après vérification de votre identité.
                </p>
                
                <div className="bg-yellow-500/20 rounded-xl p-3 mb-4">
                  <p className="text-yellow-300 text-xs flex items-center gap-2">
                    <FaClock size={12} />
                    Le traitement peut prendre quelques minutes.
                  </p>
                </div>
                
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  className="input-field w-full mb-4"
                  rows="3"
                  placeholder="Raison de la demande (optionnel)..."
                />
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleResetPinRequest}
                    disabled={loading}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold transition-all"
                  >
                    {loading ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                </div>
                
                {resetRequestSent && (
                  <div className="mt-4 bg-green-500/20 rounded-xl p-3">
                    <p className="text-green-400 text-sm text-center">
                      ✓ Demande envoyée. L'administrateur vous contactera.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Préférences */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 max-w-2xl">
            {/* Contenu existant */}
            <div>
              <label className="label">Langue</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                className="input-field"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            
            <div>
              <label className="label">Thème</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPreferences({...preferences, theme: 'dark'})}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    preferences.theme === 'dark' 
                      ? 'border-blue-500 bg-blue-500/20' 
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <FaMoon className="mx-auto text-2xl mb-2" />
                  <p className="text-white">Sombre</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferences({...preferences, theme: 'light'})}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    preferences.theme === 'light' 
                      ? 'border-blue-500 bg-blue-500/20' 
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <FaSun className="mx-auto text-2xl mb-2" />
                  <p className="text-white">Clair</p>
                </button>
              </div>
            </div>
            
            <div>
              <label className="label">Actions rapides</label>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white">Afficher les actions rapides</p>
                  <p className="text-white/40 text-sm">Transfert rapide, QR code sur le dashboard</p>
                </div>
                <button
                  onClick={() => setPreferences({...preferences, quickActions: !preferences.quickActions})}
                  className={`w-12 h-6 rounded-full transition-all ${
                    preferences.quickActions ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    preferences.quickActions ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            
            <div>
              <label className="label">Message par défaut pour les transferts</label>
              <textarea
                value={preferences.defaultTransferMessage}
                onChange={(e) => setPreferences({...preferences, defaultTransferMessage: e.target.value})}
                className="input-field"
                rows="2"
                placeholder="Ex: Merci pour votre paiement"
              />
            </div>
            
            <button onClick={updatePreferences} disabled={loading} className="btn-primary">
              <FaSave className="inline mr-2" /> Enregistrer les préférences
            </button>
          </div>
        )}

        {/* Tab Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-2xl">
            {/* Contenu existant */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-blue-400" />
                <div>
                  <p className="text-white">Notifications par email</p>
                  <p className="text-white/40 text-sm">Recevez des alertes par email</p>
                </div>
              </div>
              <button
                onClick={() => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, email: !preferences.notifications.email}
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.notifications?.email ? 'bg-blue-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                  preferences.notifications?.email ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <FaSms className="text-blue-400" />
                <div>
                  <p className="text-white">Notifications par SMS</p>
                  <p className="text-white/40 text-sm">Recevez des alertes par SMS</p>
                </div>
              </div>
              <button
                onClick={() => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, sms: !preferences.notifications.sms}
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.notifications?.sms ? 'bg-blue-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                  preferences.notifications?.sms ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <FaBell className="text-blue-400" />
                <div>
                  <p className="text-white">Notifications push</p>
                  <p className="text-white/40 text-sm">Notifications dans l'application</p>
                </div>
              </div>
              <button
                onClick={() => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, push: !preferences.notifications.push}
                })}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.notifications?.push ? 'bg-blue-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                  preferences.notifications?.push ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white font-semibold mb-3">Types de notifications</h3>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
                <div>
                  <p className="text-white">Transactions</p>
                  <p className="text-white/40 text-sm">Envoi/réception d'argent</p>
                </div>
                <button
                  onClick={() => setPreferences({
                    ...preferences,
                    notifications: {...preferences.notifications, transaction: !preferences.notifications.transaction}
                  })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    preferences.notifications?.transaction ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    preferences.notifications?.transaction ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white">Promotions</p>
                  <p className="text-white/40 text-sm">Offres et actualités</p>
                </div>
                <button
                  onClick={() => setPreferences({
                    ...preferences,
                    notifications: {...preferences.notifications, promo: !preferences.notifications.promo}
                  })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    preferences.notifications?.promo ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    preferences.notifications?.promo ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
            
            <button onClick={updatePreferences} disabled={loading} className="btn-primary">
              Enregistrer les préférences
            </button>
          </div>
        )}

        {/* Tab QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-6 max-w-2xl">
            {!qrGenerated ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
                    <FaQrcode className="text-blue-400 text-3xl" />
                  </div>
                  <p className="text-white/60 text-sm">
                    Générez un QR code pour recevoir un paiement
                  </p>
                </div>

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
                  <p className="text-white/40 text-xs mt-1">Minimum: 25 FCFA</p>
                </div>

                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={qrDescription}
                    onChange={(e) => setQrDescription(e.target.value)}
                    className="input-field"
                    placeholder="Ex: Paiement service"
                  />
                </div>

                <button 
                  onClick={generateDynamicQR} 
                  disabled={generating}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {generating ? 'Génération...' : 'Générer mon QR code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  {qrImageUrl && (
                    <img
                      src={qrImageUrl}
                      alt="QR Code"
                      className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg"
                    />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex justify-between text-sm">
                    <span>Votre numéro</span>
                    <span className="font-mono font-bold">{user?.phone}</span>
                  </div>
                  {qrAmount && (
                    <div className="flex justify-between text-sm mt-2">
                      <span>Montant</span>
                      <span className="text-green-400 font-bold">{parseInt(qrAmount).toLocaleString()} FCFA</span>
                    </div>
                  )}
                  {qrDescription && (
                    <div className="flex justify-between text-sm mt-2">
                      <span>Description</span>
                      <span className="text-white/70">{qrDescription}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                    <button onClick={() => copyToClipboard(paymentLink)} className="text-blue-400 text-xs flex items-center gap-1">
                      <FaCopy size={10} /> Copier le lien
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={downloadQRCode} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                    <FaDownload /> Télécharger
                  </button>
                  <button onClick={shareViaWhatsApp} className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2">
                    <FaWhatsapp /> WhatsApp
                  </button>
                </div>

                <div className="flex gap-2">
                  <button onClick={shareViaEmail} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                    <FaEnvelope /> Email
                  </button>
                  <button onClick={() => copyToClipboard(paymentLink)} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                    <FaCopy /> Copier le lien
                  </button>
                </div>

                <button onClick={resetQRGenerator} className="w-full text-sm text-white/40 hover:text-white/60">
                  Générer un nouveau QR code
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Application (Admin) */}
        {activeTab === 'app' && user?.role === 'admin' && (
          <div className="space-y-6 max-w-2xl">
            {/* Contenu existant */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white">Mode maintenance</p>
                <p className="text-white/40 text-sm">L'application est en maintenance</p>
              </div>
              <button
                onClick={() => setAppSettings({...appSettings, maintenanceMode: !appSettings.maintenanceMode})}
                className={`w-12 h-6 rounded-full transition-all ${
                  appSettings.maintenanceMode ? 'bg-red-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                  appSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white">Transferts internationaux</p>
                <p className="text-white/40 text-sm">Autoriser les transferts vers l'étranger</p>
              </div>
              <button
                onClick={() => setAppSettings({...appSettings, allowInternationalTransfer: !appSettings.allowInternationalTransfer})}
                className={`w-12 h-6 rounded-full transition-all ${
                  appSettings.allowInternationalTransfer ? 'bg-blue-500' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                  appSettings.allowInternationalTransfer ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="label">Bonus de parrainage (FCFA)</label>
              <input
                type="number"
                value={appSettings.referralBonus}
                onChange={(e) => setAppSettings({...appSettings, referralBonus: parseInt(e.target.value)})}
                className="input-field"
              />
            </div>
            
            <div className="flex gap-4">
              <button onClick={updateAppSettings} disabled={loading} className="btn-primary">
                <FaSave className="inline mr-2" /> Sauvegarder
              </button>
              <button onClick={resetSettings} className="btn-secondary">
                <FaUndo className="inline mr-2" /> Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Tab Frais & Limites (Admin) */}
        {activeTab === 'fees' && user?.role === 'admin' && (
          <div className="space-y-6 max-w-2xl">
            {/* Contenu existant */}
            <div>
              <label className="label">Montant minimum de transaction (FCFA)</label>
              <input
                type="number"
                value={appSettings.minTransaction}
                onChange={(e) => setAppSettings({...appSettings, minTransaction: parseInt(e.target.value)})}
                className="input-field"
                min="1"
              />
            </div>
            
            <div>
              <label className="label">Montant maximum de transaction (FCFA)</label>
              <input
                type="number"
                value={appSettings.maxTransaction}
                onChange={(e) => setAppSettings({...appSettings, maxTransaction: parseInt(e.target.value)})}
                className="input-field"
                min="1000"
              />
            </div>
            
            <div>
              <label className="label">Frais de transfert (%)</label>
              <input
                type="number"
                value={appSettings.transferFee}
                onChange={(e) => setAppSettings({...appSettings, transferFee: parseInt(e.target.value)})}
                className="input-field"
                min="0"
                max="10"
                step="0.5"
              />
            </div>
            
            <div>
              <label className="label">Frais de dépôt (%)</label>
              <input
                type="number"
                value={appSettings.depositFee}
                onChange={(e) => setAppSettings({...appSettings, depositFee: parseInt(e.target.value)})}
                className="input-field"
                min="0"
                max="10"
              />
            </div>
            
            <div>
              <label className="label">Frais de retrait (%)</label>
              <input
                type="number"
                value={appSettings.withdrawalFee}
                onChange={(e) => setAppSettings({...appSettings, withdrawalFee: parseInt(e.target.value)})}
                className="input-field"
                min="0"
                max="10"
              />
            </div>
            
            <div className="bg-yellow-500/10 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">
                ⚠️ Les modifications des frais s'appliquent uniquement aux nouvelles transactions.
              </p>
            </div>
            
            <button onClick={updateAppSettings} disabled={loading} className="btn-primary">
              <FaSave className="inline mr-2" /> Sauvegarder
            </button>
          </div>
        )}

        {/* Tab Système (Admin) */}
        {activeTab === 'system' && user?.role === 'admin' && (
          <div className="space-y-6 max-w-2xl">
            {/* Contenu existant */}
            <div className="bg-green-500/10 rounded-xl p-4">
              <h3 className="text-green-400 font-semibold mb-2">✓ Système opérationnel</h3>
              <p className="text-white/70 text-sm">Tous les services sont actifs</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/40 text-sm">Version API</p>
                <p className="text-white text-xl font-bold">v1.0.0</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/40 text-sm">Version App</p>
                <p className="text-white text-xl font-bold">v1.0.0</p>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-sm mb-2">Cache</p>
              <button className="text-blue-400 text-sm">Vider le cache</button>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-sm mb-2">Logs système</p>
              <button className="text-blue-400 text-sm">Exporter les logs</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Settings