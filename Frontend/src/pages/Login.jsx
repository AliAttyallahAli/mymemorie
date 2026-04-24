// src/pages/Login.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaPhone, 
  FaLock, 
  FaKey, 
  FaMoneyBillWave, 
  FaEye, 
  FaEyeSlash, 
  FaShieldAlt,
  FaUserPlus,
  FaArrowRight
} from 'react-icons/fa'  // Imports corrects

function Login({ setUser }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [loginMode, setLoginMode] = useState('password')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  // Vérifier si déjà connecté au chargement
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
    } catch (error) {
      console.error('Erreur vérification token:', error)
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
          toast.error('Veuillez saisir votre mot de passe')
          setLoading(false)
          return
        }
        payload.password = password
      } else {
        if (!privateKey) {
          toast.error('Veuillez saisir votre clé privée')
          setLoading(false)
          return
        }
        endpoint = '/api/auth/login-key'
        payload.privateKey = privateKey
      }

      const response = await axios.post(endpoint, payload)
      
      localStorage.setItem('accessToken', response.data.tokens.accessToken)
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      setUser(response.data.user)
      
      toast.success('Connexion réussie !')
      navigate('/dashboard')
      
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setPhone('62787307')
    setPassword('08093Ali')
    setLoginMode('password')
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
        </div>

        {/* Mode de connexion */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              loginMode === 'password'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <FaLock className="text-sm" /> Mot de passe
          </button>
          <button
            onClick={() => setLoginMode('key')}
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
          </div>

          <div>
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
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
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
          <Link to="/register" className="text-blue-300 hover:text-blue-200 transition-colors text-sm inline-flex items-center gap-1">
            Pas encore de compte ? S'inscrire <FaArrowRight size={12} />
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={handleDemoLogin}
            className="w-full bg-white/10 hover:bg-white/20 text-white/80 text-sm py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <FaShieldAlt className="text-yellow-400" />
            Connexion admin: 62787307 / 08093Ali
          </button>
        </div>

        <div className="text-center text-white/30 text-xs mt-6">
          CashPays v1.0.0 - © 2026 GOUROUSDJA
        </div>
      </div>
    </div>
  )
}

export default Login