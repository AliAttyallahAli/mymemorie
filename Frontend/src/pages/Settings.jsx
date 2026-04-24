// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaBell, FaLock, FaLanguage, FaGlobe, 
  FaMoneyBillWave, FaShieldAlt, FaPalette, FaMobile, 
  FaExchangeAlt, FaDatabase, FaSave, FaUndo, FaKey,
  FaEnvelope, FaSms, FaMoon, FaSun, FaQrcode, FaFingerprint,
  FaChartLine, FaPercent, FaMinusCircle, FaPlusCircle
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Settings({ user }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [provinces, setProvinces] = useState([])
  
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

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: null }))
      
      if (response.data) {
        setPreferences(prev => ({ ...prev, ...response.data }))
      }
      
      // Charger le thème depuis localStorage
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
      // Mettre à jour l'utilisateur dans localStorage
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

  const updatePreferences = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/preferences', preferences, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Appliquer le thème
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
            
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white text-lg font-semibold mb-4">Authentification à deux facteurs</h3>
              <div className="bg-yellow-500/10 rounded-xl p-4">
                <p className="text-yellow-400 text-sm">
                  🔐 Bientôt disponible : Sécurisez votre compte avec l'authentification à deux facteurs.
                </p>
              </div>
            </div>
            
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

        {/* Tab Préférences */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 max-w-2xl">
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
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-xl mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSettings.qrSize}x${qrSettings.qrSize}&data=${encodeURIComponent(JSON.stringify({
                    type: 'payment',
                    recipient: user?.phone,
                    amount: qrSettings.showAmountInQR ? '{{amount}}' : undefined
                  }))}`}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>
              <p className="text-white/60 text-sm">Scannez ce QR code pour recevoir un paiement</p>
            </div>
            
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold mb-4">Personnalisation du QR code</h3>
              
              <div>
                <label className="label">Taille du QR code</label>
                <input
                  type="range"
                  min="100"
                  max="400"
                  value={qrSettings.qrSize}
                  onChange={(e) => setQrSettings({...qrSettings, qrSize: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-white/60 text-sm">{qrSettings.qrSize}px</span>
              </div>
              
              <div className="mt-4">
                <label className="label">Afficher le montant dans le QR code</label>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <p className="text-white">Inclure un montant par défaut</p>
                  <button
                    onClick={() => setQrSettings({...qrSettings, showAmountInQR: !qrSettings.showAmountInQR})}
                    className={`w-12 h-6 rounded-full transition-all ${
                      qrSettings.showAmountInQR ? 'bg-blue-500' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                      qrSettings.showAmountInQR ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Application (Admin) */}
        {activeTab === 'app' && user?.role === 'admin' && (
          <div className="space-y-6 max-w-2xl">
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