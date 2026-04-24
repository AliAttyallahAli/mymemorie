import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaPhone, FaLock, FaKey, FaMoneyBillWave } from 'react-icons/fa'

function Login({ setUser }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [loginMode, setLoginMode] = useState('password')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let endpoint = '/api/auth/login'
      let payload = { phone }

      if (loginMode === 'password') {
        payload.password = password
      } else {
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
      toast.error(error.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-4 rounded-full">
              <FaMoneyBillWave className="text-white text-4xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CashPays</h1>
          <p className="text-white/60">GOUROUSDJA - Transfert d'argent</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLoginMode('password')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              loginMode === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <FaLock className="inline mr-2" /> Mot de passe
          </button>
          <button
            onClick={() => setLoginMode('key')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              loginMode === 'key'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            <FaKey className="inline mr-2" /> Clé 6 chiffres
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">
              <FaPhone className="inline mr-2" /> Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="Ex: 66234567"
              maxLength="8"
              required
            />
          </div>

          {loginMode === 'password' ? (
            <div>
              <label className="label">
                <FaLock className="inline mr-2" /> Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Votre mot de passe"
                required
              />
            </div>
          ) : (
            <div>
              <label className="label">
                <FaKey className="inline mr-2" /> Clé privée (6 chiffres)
              </label>
              <input
                type="text"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="input-field"
                placeholder="Clé à 6 chiffres"
                maxLength="6"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-blue-300 hover:text-blue-200">
            Pas encore de compte ? S'inscrire
          </Link>
        </div>

        <div className="mt-4 text-center text-white/40 text-sm">
          Admin: 62787307 | Mot de passe: 08093Ali
        </div>
      </div>
    </div>
  )
}

export default Login