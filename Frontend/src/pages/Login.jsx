// src/pages/Login.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { FaPhone, FaLock, FaKey, FaMoneyBillWave, FaEye, FaEyeSlash, FaGift, FaUserPlus, FaCheckCircle, FaTimes } from 'react-icons/fa'

function Login({ setUser }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [loginMode, setLoginMode] = useState('password')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotPhone, setForgotPhone] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const referralCode = searchParams.get('ref')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      verifyToken(token, savedUser)
    }
  }, [])

  const verifyToken = async (token, savedUser) => {
    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.valid) {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        navigate('/dashboard')
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
    } catch (err) {
      console.error('Erreur vérification token:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let endpoint = '/api/auth/login'
      let payload = { phone }

      if (loginMode === 'password') {
        if (!password) {
          showMessage('Veuillez saisir votre mot de passe', 'error')
          setLoading(false)
          return
        }
        payload.password = password
      } else {
        if (!privateKey) {
          showMessage('Veuillez saisir votre clé privée', 'error')
          setLoading(false)
          return
        }
        endpoint = '/api/auth/login-key'
        payload.privateKey = privateKey
      }

      const response = await axios.post(endpoint, payload)
      
      if (!response.data.tokens || !response.data.user) {
        throw new Error('Données de connexion invalides')
      }
      
      localStorage.setItem('accessToken', response.data.tokens.accessToken)
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      setUser(response.data.user)
      
      showMessage('Connexion réussie !', 'success')
      navigate('/dashboard')
      
    } catch (err) {
      console.error('Erreur connexion:', err)
      const errorMsg = err.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.'
      showMessage(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPhone || forgotPhone.length !== 8) {
      showMessage('Veuillez entrer un numéro de téléphone valide (8 chiffres)', 'error')
      return
    }
    
    setSendingRequest(true)
    try {
      await axios.post('/api/auth/forgot-password', { phone: forgotPhone })
      setForgotSuccess(true)
      setTimeout(() => {
        setShowForgotModal(false)
        setForgotSuccess(false)
        setForgotPhone('')
      }, 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de l\'envoi de la demande'
      showMessage(errorMsg, 'error')
    } finally {
      setSendingRequest(false)
    }
  }

  const showMessage = (message, type) => {
    // Créer un toast temporaire
    const toast = document.createElement('div')
    toast.className = `fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } animate-slide-down`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  const handleDemoLogin = () => {
    setPhone('62787307')
    setPassword('08093Ali')
    setLoginMode('password')
  }

  const handleModeChange = (mode) => {
    setLoginMode(mode)
    setPassword('')
    setPrivateKey('')
    setShowPassword(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-4 rounded-full shadow-lg">
              <FaMoneyBillWave className="text-white text-4xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CashPays</h1>
          <p className="text-blue-200 text-sm">GOUROUSDJA - Transfert d'argent instantané</p>
          
          {referralCode && (
            <div className="mt-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-2 border border-purple-500/30">
              <div className="flex items-center justify-center gap-2">
                <FaGift className="text-purple-300" />
                <p className="text-purple-200 text-xs">
                  🎉 Code parrainage : <span className="font-mono font-bold text-white">{referralCode}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mode de connexion */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleModeChange('password')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              loginMode === 'password'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <FaLock className="text-sm" /> Mot de passe
          </button>
          <button
            onClick={() => handleModeChange('key')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              loginMode === 'key'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <FaKey className="text-sm" /> Clé 6 chiffres
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              <FaPhone className="inline mr-2" /> Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              placeholder="Ex: 62787307"
              maxLength="8"
              required
            />
            <p className="text-white/40 text-xs mt-1">8 chiffres - Identifiant unique</p>
          </div>

          <div key={loginMode}>
            <label className="block text-white/80 text-sm font-medium mb-2">
              {loginMode === 'password' ? (
                <><FaLock className="inline mr-2" /> Mot de passe</>
              ) : (
                <><FaKey className="inline mr-2" /> Clé privée (6 chiffres)</>
              )}
            </label>
            <div className="relative">
              <input
                type={loginMode === 'password' ? (showPassword ? 'text' : 'password') : 'text'}
                value={loginMode === 'password' ? password : privateKey}
                onChange={(e) => {
                  if (loginMode === 'password') {
                    setPassword(e.target.value)
                  } else {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setPrivateKey(value)
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                placeholder={loginMode === 'password' ? 'Votre mot de passe' : '000000'}
                maxLength={loginMode === 'password' ? undefined : 6}
                required
              />
              {loginMode === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              )}
            </div>
            {loginMode === 'key' && (
              <p className="text-white/40 text-xs mt-1">Clé à 6 chiffres reçue à l'inscription</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-900 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connexion...
              </div>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to={referralCode ? `/register?ref=${referralCode}` : "/register"} 
            className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors text-sm"
          >
            <FaUserPlus /> Pas encore de compte ? S'inscrire gratuitement
            {referralCode && (
              <span className="bg-purple-500/30 text-purple-200 text-xs px-2 py-0.5 rounded-full ml-2">
                +500 FCFA offerts
              </span>
            )}
          </Link>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => setShowForgotModal(true)}
            className="text-white/40 hover:text-white/60 transition-colors text-xs"
          >
            Mot de passe ou clé privée oublié ?
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
            <FaGift size={12} />
            <span>Parrainez vos amis et gagnez 500 FCFA par inscription</span>
          </div>
        </div>

        <div className="text-center text-white/30 text-xs mt-6">
          CashPays v1.0.0 - © 2026 GOUROUSDJA
        </div>
      </div>

      {/* Modal Mot de passe oublié - Version améliorée */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaKey className="text-blue-400" /> Mot de passe oublié
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {forgotSuccess ? (
                <div className="text-center">
                  <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-4">
                    <FaCheckCircle className="text-green-400 text-4xl" />
                  </div>
                  <h4 className="text-white text-xl font-bold mb-2">Demande envoyée !</h4>
                  <p className="text-white/70 text-sm">
                    Votre demande a été transmise à l'administrateur. 
                    Vous serez contacté sous 24h pour réinitialiser votre accès.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-white/70 text-sm mb-4">
                    Entrez votre numéro de téléphone. L'administrateur recevra votre demande 
                    et vous contactera pour réinitialiser votre accès.
                  </p>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      <FaPhone className="inline mr-2" /> Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Ex: 62787307"
                      maxLength="8"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleForgotPassword}
                      disabled={sendingRequest}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      {sendingRequest ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        'Envoyer la demande'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login