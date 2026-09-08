// src/pages/TwoFactorAuth.jsx - Version corrigée
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaShieldAlt, FaQrcode, FaMobile, FaEnvelope, FaSms,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaKey,
  FaCopy, FaDownload, FaTrash, FaPlus, FaClock,
  FaExclamationTriangle, FaInfoCircle, FaRegClone,
  FaArrowLeft, FaSave, FaSync
} from 'react-icons/fa'
import Layout from '../components/Layout'
// CORRECTION : Import nommé pour QRCodeSVG
import { QRCodeSVG } from 'qrcode.react'

function TwoFactorAuth({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    method: 'authenticator',
    verified: false,
    backupCodes: []
  })
  
  // États pour l'activation
  const [showSetup, setShowSetup] = useState(false)
  const [secret, setSecret] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  
  // États pour les méthodes
  const [selectedMethod, setSelectedMethod] = useState('authenticator')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  
  // États pour la gestion
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [trustedDevices, setTrustedDevices] = useState([])
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  useEffect(() => {
    fetchTwoFactorStatus()
    fetchTrustedDevices()
  }, [])

  const fetchTwoFactorStatus = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/2fa/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTwoFactorStatus(response.data)
    } catch (error) {
      console.error('Erreur chargement 2FA:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrustedDevices = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/user/2fa/devices', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTrustedDevices(response.data || [])
    } catch (error) {
      console.error('Erreur chargement appareils:', error)
    }
  }

  const init2FASetup = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/user/2fa/setup', {
        method: selectedMethod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setSecret(response.data.secret)
      setQrCodeUrl(response.data.qrCodeUrl)
      setBackupCodes(response.data.backupCodes || [])
      setShowSetup(true)
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'initialisation')
    } finally {
      setSaving(false)
    }
  }

  const verifyAndEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Veuillez entrer un code à 6 chiffres')
      return
    }
    
    setVerifying(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/user/2fa/verify', {
        code: verificationCode,
        method: selectedMethod,
        phoneNumber: selectedMethod === 'sms' ? phoneNumber : undefined,
        email: selectedMethod === 'email' ? emailAddress : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setTwoFactorStatus({ ...twoFactorStatus, enabled: true, verified: true })
      setShowSetup(false)
      setRecoveryCodes(response.data.backupCodes || [])
      setShowBackupCodes(true)
      toast.success('Authentification à deux facteurs activée !')
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Code invalide')
    } finally {
      setVerifying(false)
    }
  }

  const disable2FA = async () => {
    if (!disablePassword) {
      toast.error('Veuillez entrer votre mot de passe')
      return
    }
    
    setSaving(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/user/2fa/disable', {
        password: disablePassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setTwoFactorStatus({ ...twoFactorStatus, enabled: false, verified: false })
      setShowDisableConfirm(false)
      setDisablePassword('')
      toast.success('Authentification à deux facteurs désactivée')
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Mot de passe incorrect')
    } finally {
      setSaving(false)
    }
  }

  const revokeDevice = async (deviceId) => {
    if (!window.confirm('Retirer la confiance de cet appareil ?')) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/user/2fa/device/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTrustedDevices()
      toast.success('Appareil retiré')
    } catch (error) {
      toast.error('Erreur lors du retrait')
    }
  }

  const generateNewBackupCodes = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/user/2fa/backup-codes', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecoveryCodes(response.data.backupCodes)
      toast.success('Nouveaux codes de secours générés')
    } catch (error) {
      toast.error('Erreur lors de la génération')
    }
  }

  const copyBackupCodes = () => {
    const codesText = recoveryCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    toast.success('Codes copiés !')
  }

  const downloadBackupCodes = () => {
    const content = `AlkherPay - CODES DE SECOURS 2FA
=================================

Gardez ces codes dans un endroit sûr.
Chaque code ne peut être utilisé qu'une seule fois.

${recoveryCodes.join('\n')}

=================================
Généré le: ${new Date().toLocaleString('fr-FR')}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AlkherPay-2fa-backup-codes.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Codes téléchargés')
  }

  const methods = [
    { id: 'authenticator', name: 'Application d\'authentification', icon: FaMobile, description: 'Google Authenticator, Microsoft Authenticator, Authy' },
    { id: 'sms', name: 'SMS', icon: FaSms, description: 'Recevez un code par SMS' },
    { id: 'email', name: 'Email', icon: FaEnvelope, description: 'Recevez un code par email' }
  ]

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
    <Layout user={user}>
      <div className="max-w-3xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <FaArrowLeft /> Retour aux paramètres
        </button>

        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
              <FaShieldAlt className="text-white text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-white">Authentification à deux facteurs</h1>
            <p className="text-white/60 text-sm">
              Sécurisez votre compte avec une double authentification
            </p>
          </div>

          {/* Statut actuel */}
          <div className={`rounded-xl p-4 mb-6 ${twoFactorStatus.enabled ? 'bg-green-500/20 border border-green-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {twoFactorStatus.enabled ? (
                  <FaCheckCircle className="text-green-400 text-2xl" />
                ) : (
                  <FaExclamationTriangle className="text-yellow-400 text-2xl" />
                )}
                <div>
                  <p className="text-white font-semibold">
                    {twoFactorStatus.enabled ? '2FA activée' : '2FA désactivée'}
                  </p>
                  <p className="text-white/50 text-sm">
                    {twoFactorStatus.enabled 
                      ? `Méthode: ${twoFactorStatus.method === 'authenticator' ? 'Application' : twoFactorStatus.method === 'sms' ? 'SMS' : 'Email'}`
                      : 'Votre compte n\'est pas protégé par 2FA'}
                  </p>
                </div>
              </div>
              {!twoFactorStatus.enabled && (
                <button
                  onClick={init2FASetup}
                  disabled={saving}
                  className="btn-primary text-sm"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : 'Activer'}
                </button>
              )}
            </div>
          </div>

          {/* Section activation */}
          {showSetup && !twoFactorStatus.enabled && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white text-lg font-semibold mb-4">Configuration 2FA</h3>
              
              {/* Choix de la méthode */}
              <div className="mb-6">
                <label className="label">Méthode d'authentification</label>
                <div className="grid gap-3">
                  {methods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <method.icon className="text-blue-400 text-xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{method.name}</p>
                        <p className="text-white/40 text-xs">{method.description}</p>
                      </div>
                      {selectedMethod === method.id && (
                        <FaCheckCircle className="text-green-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration selon méthode */}
              {selectedMethod === 'authenticator' && secret && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      {/* CORRECTION : Utilisation de QRCodeSVG */}
                      <QRCodeSVG value={qrCodeUrl} size={200} />
                    </div>
                    <p className="text-white/60 text-sm mb-2">
                      Scannez ce QR code avec votre application d'authentification
                    </p>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">Code secret (si scan impossible)</p>
                      <code className="text-white font-mono text-sm break-all">{secret}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(secret)
                          toast.success('Code copié !')
                        }}
                        className="ml-2 text-blue-400 hover:text-blue-300"
                      >
                        <FaRegClone />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === 'sms' && (
                <div className="mb-4">
                  <label className="label">Numéro de téléphone</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="input-field"
                    placeholder="Ex: 62787307"
                    maxLength="8"
                  />
                  <p className="text-white/40 text-xs mt-1">Vous recevrez un code par SMS</p>
                </div>
              )}

              {selectedMethod === 'email' && (
                <div className="mb-4">
                  <label className="label">Adresse email</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="input-field"
                    placeholder="votre@email.com"
                  />
                </div>
              )}

              {/* Vérification */}
              <div className="mb-4">
                <label className="label">Code de vérification</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength="6"
                />
                <p className="text-white/40 text-xs mt-1">
                  Entrez le code à 6 chiffres généré par votre application
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSetup(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={verifyAndEnable2FA}
                  disabled={verifying || !verificationCode}
                  className="flex-1 btn-primary"
                >
                  {verifying ? <FaSpinner className="animate-spin" /> : 'Vérifier et activer'}
                </button>
              </div>
            </div>
          )}

          {/* Codes de secours */}
          {showBackupCodes && recoveryCodes.length > 0 && (
            <div className="border-t border-white/10 pt-6 mt-6">
              <div className="bg-yellow-500/10 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-yellow-400 text-xl flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-semibold mb-1">Codes de secours</p>
                    <p className="text-yellow-400/70 text-sm">
                      Gardez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois.
                      Si vous perdez l'accès à votre application d'authentification, vous pourrez utiliser ces codes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {recoveryCodes.map((code, index) => (
                    <code key={index} className="text-white font-mono text-sm bg-white/10 p-2 rounded text-center">
                      {code}
                    </code>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <button onClick={copyBackupCodes} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                    <FaCopy /> Copier
                  </button>
                  <button onClick={downloadBackupCodes} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                    <FaDownload /> Télécharger
                  </button>
                  <button
                    onClick={() => setShowBackupCodes(false)}
                    className="flex-1 btn-primary text-sm"
                  >
                    J'ai sauvegardé mes codes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gestion 2FA (si activée) */}
          {twoFactorStatus.enabled && !showSetup && (
            <div className="space-y-6">
              {/* Informations */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Configuration actuelle</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Méthode</span>
                    <span className="text-white">
                      {twoFactorStatus.method === 'authenticator' ? 'Application' :
                       twoFactorStatus.method === 'sms' ? 'SMS' : 'Email'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Activée depuis</span>
                    <span className="text-white">{new Date(twoFactorStatus.enabledAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              {/* Codes de secours */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-semibold">Codes de secours</h3>
                  <button
                    onClick={generateNewBackupCodes}
                    className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
                  >
                    <FaSync size={12} /> Générer de nouveaux
                  </button>
                </div>
                <p className="text-white/50 text-sm mb-3">
                  Utilisez ces codes si vous perdez l'accès à votre application d'authentification.
                </p>
                {recoveryCodes.length === 0 ? (
                  <button
                    onClick={generateNewBackupCodes}
                    className="btn-secondary w-full text-sm"
                  >
                    Générer des codes de secours
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.slice(0, 6).map((code, index) => (
                      <code key={index} className="text-white font-mono text-xs bg-white/10 p-2 rounded text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                )}
              </div>

              {/* Appareils de confiance */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Appareils de confiance</h3>
                {trustedDevices.length === 0 ? (
                  <p className="text-white/50 text-sm">Aucun appareil enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {trustedDevices.map(device => (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{device.name || 'Appareil inconnu'}</p>
                          <p className="text-white/40 text-xs">
                            Dernière utilisation: {new Date(device.lastUsed).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeDevice(device.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Désactiver 2FA */}
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={() => setShowDisableConfirm(true)}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2"
                >
                  <FaTimesCircle /> Désactiver l'authentification à deux facteurs
                </button>
              </div>
            </div>
          )}

          {/* Modal de désactivation */}
          {showDisableConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
              <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Désactiver la 2FA</h3>
                  <button
                    onClick={() => setShowDisableConfirm(false)}
                    className="text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="p-6">
                  <p className="text-white/80 mb-4">
                    Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?
                    Votre compte sera moins sécurisé.
                  </p>
                  
                  <div className="mb-4">
                    <label className="label">Mot de passe</label>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="input-field"
                      placeholder="Votre mot de passe"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDisableConfirm(false)}
                      className="flex-1 btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={disable2FA}
                      disabled={saving}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold"
                    >
                      {saving ? <FaSpinner className="animate-spin" /> : 'Confirmer la désactivation'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informations */}
          <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="text-blue-400 text-lg flex-shrink-0" />
              <div>
                <p className="text-blue-300 text-sm font-semibold mb-1">Pourquoi activer la 2FA ?</p>
                <p className="text-blue-300/70 text-xs">
                  L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.
                  Même si quelqu'un obtient votre mot de passe, il ne pourra pas accéder à votre compte sans le code
                  généré par votre application d'authentification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default TwoFactorAuth