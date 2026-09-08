// src/pages/Register.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUser, FaPhone, FaLock, FaMapMarkerAlt, FaCity, FaMoneyBillWave, FaGift, FaUserPlus, FaCheckCircle } from 'react-icons/fa'

function Register() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Récupérer le code de parrainage depuis l'URL
  const referralCode = searchParams.get('ref')
  
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    password: '',
    confirmPassword: '',
    province: '',
    city: '',
    address: '',
    referral_code: referralCode || '' // Ajout du champ code parrainage
  })
  const [provinces, setProvinces] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [privateKey, setPrivateKey] = useState(null)
  const [showReferralInput, setShowReferralInput] = useState(!!referralCode)
  const [referralValid, setReferralValid] = useState(false)
  const [checkingReferral, setCheckingReferral] = useState(false)

  useEffect(() => {
    fetchProvinces()
    
    // Vérifier le code de parrainage si présent
    if (referralCode) {
      checkReferralCode(referralCode)
      toast.success(`🎉 Code de parrainage ${referralCode} détecté ! 500 FCFA offerts à l'inscription.`, {
        duration: 6000,
        icon: '🎁'
      })
    }
  }, [referralCode])

  const fetchProvinces = async () => {
    setLoadingProvinces(true)
    try {
      const response = await axios.get('/api/provinces')
      if (Array.isArray(response.data)) {
        setProvinces(response.data)
      } else if (response.data && Array.isArray(response.data.provinces)) {
        setProvinces(response.data.provinces)
      } else {
        setProvinces(defaultProvinces)
      }
    } catch (error) {
      console.error('Erreur chargement provinces:', error)
      setProvinces(defaultProvinces)
      toast.error('Erreur de chargement des provinces, utilisation des valeurs par défaut')
    } finally {
      setLoadingProvinces(false)
    }
  }

  const checkReferralCode = async (code) => {
    if (!code || code.length < 6) return
    
    setCheckingReferral(true)
    try {
      const response = await axios.get(`/api/referral/check/${code}`)
      if (response.data.valid) {
        setReferralValid(true)
        toast.success(`✅ Code valide ! ${response.data.message}`, { duration: 4000 })
      } else {
        setReferralValid(false)
        toast.error(`Code invalide : ${response.data.message}`, { duration: 4000 })
      }
    } catch (error) {
      setReferralValid(false)
      console.error('Erreur vérification code:', error)
    } finally {
      setCheckingReferral(false)
    }
  }

  const handleReferralCodeChange = (e) => {
    const code = e.target.value.toUpperCase()
    setFormData({ ...formData, referral_code: code })
    if (code.length >= 6) {
      checkReferralCode(code)
    } else {
      setReferralValid(false)
    }
  }

  // Données de secours des 23 provinces du Tchad
  const defaultProvinces = [
    { id: 1, name: 'Batha' },
    { id: 2, name: 'Chari-Baguirmi' },
    { id: 3, name: 'Hadjer-Lamis' },
    { id: 4, name: 'Wadi Fira' },
    { id: 5, name: 'Barh El Gazel' },
    { id: 6, name: 'Borkou' },
    { id: 7, name: 'Ennedi Est' },
    { id: 8, name: 'Ennedi Ouest' },
    { id: 9, name: 'Guéra' },
    { id: 10, name: 'Kanem' },
    { id: 11, name: 'Lac' },
    { id: 12, name: 'Logone Occidental' },
    { id: 13, name: 'Logone Oriental' },
    { id: 14, name: 'Mandoul' },
    { id: 15, name: 'Mayo-Kebbi Est' },
    { id: 16, name: 'Mayo-Kebbi Ouest' },
    { id: 17, name: 'Moyen-Chari' },
    { id: 18, name: 'Ouaddaï' },
    { id: 19, name: 'Salamat' },
    { id: 20, name: 'Sila' },
    { id: 21, name: 'Tandjilé' },
    { id: 22, name: 'Tibesti' },
    { id: 23, name: 'N\'Djaména' }
  ]

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (formData.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }
    
    if (!/^\d{8}$/.test(formData.phone)) {
      toast.error('Le numéro de téléphone doit contenir 8 chiffres')
      return
    }

    setLoading(true)
    
    try {
      const submitData = {
        fullname: formData.fullname,
        phone: formData.phone,
        password: formData.password,
        province: formData.province,
        city: formData.city,
        address: formData.address,
        referral_code: formData.referral_code || null
      }
      
      const response = await axios.post('/api/auth/register', submitData)
      
      setPrivateKey(response.data.private_key)
      
      let successMessage = 'Inscription réussie !'
      if (formData.referral_code && referralValid) {
        successMessage = '🎉 Inscription réussie ! Vous avez reçu 500 FCFA de bonus de parrainage !'
      }
      toast.success(successMessage)
      
      localStorage.setItem('accessToken', response.data.tokens.accessToken)
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 4000)
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  // Affichage de la clé privée après inscription
  if (privateKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-4">Inscription réussie !</h2>
          
          {referralValid && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaGift className="text-green-400 text-xl" />
                <p className="text-green-400 font-bold">Bonus de parrainage</p>
              </div>
              <p className="text-green-300 text-sm">500 FCFA ont été crédités sur votre compte !</p>
            </div>
          )}
          
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 font-bold mb-2">🔑 Votre clé privée (à conserver précieusement)</p>
            <p className="text-white text-3xl font-mono tracking-wider">{privateKey}</p>
            <p className="text-yellow-400/70 text-sm mt-2">
              ⚠️ Cette clé vous sera demandée si vous perdez votre mot de passe. 
              Ne la partagez avec personne !
            </p>
          </div>
          
          <p className="text-white/70 mb-4">Redirection vers votre tableau de bord...</p>
          <div className="animate-pulse">
            <div className="w-full bg-blue-600 h-1 rounded-full"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-3 rounded-full">
              <FaMoneyBillWave className="text-white text-3xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Créer un compte AlkherPay</h1>
          <p className="text-white/50 text-sm">Recevez 1 000 FCFA à l'inscription</p>
          
          {/* Bannière parrainage */}
          {referralCode && (
            <div className="mt-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-2 border border-purple-500/30">
              <div className="flex items-center justify-center gap-2">
                <FaGift className="text-purple-300" />
                <p className="text-purple-200 text-xs">
                  🎉 Code parrainage : <span className="font-mono font-bold text-white">{referralCode}</span>
                  {referralValid && <span className="ml-2 text-green-300">✓ Valide</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <FaUser className="inline mr-2" /> Nom complet
            </label>
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              className="input-field"
              placeholder="Votre nom et prénom"
              required
            />
          </div>

          <div>
            <label className="label">
              <FaPhone className="inline mr-2" /> Numéro de téléphone (8 chiffres)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: 66234567"
              maxLength="8"
              required
            />
          </div>

          <div>
            <label className="label">
              <FaLock className="inline mr-2" /> Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Au moins 4 caractères"
              required
            />
          </div>

          <div>
            <label className="label">
              <FaLock className="inline mr-2" /> Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              placeholder="Répétez le mot de passe"
              required
            />
          </div>

          {/* Champ code parrainage */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label mb-0">
                <FaGift className="inline mr-2" /> Code de parrainage (optionnel)
              </label>
              {!showReferralInput && (
                <button
                  type="button"
                  onClick={() => setShowReferralInput(true)}
                  className="text-blue-400 text-xs hover:text-blue-300"
                >
                  + Ajouter un code
                </button>
              )}
            </div>
            
            {showReferralInput && (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    name="referral_code"
                    value={formData.referral_code}
                    onChange={handleReferralCodeChange}
                    className="input-field pr-24"
                    placeholder="Ex: CASH123456"
                    maxLength={20}
                  />
                  {checkingReferral && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    </div>
                  )}
                  {referralValid && !checkingReferral && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <FaCheckCircle className="text-green-400 text-lg" />
                    </div>
                  )}
                </div>
                {referralValid && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <FaCheckCircle size={10} /> Code valide ! Vous recevrez 500 FCFA bonus.
                  </p>
                )}
                {formData.referral_code && !referralValid && !checkingReferral && formData.referral_code.length >= 6 && (
                  <p className="text-red-400 text-xs mt-1">Code invalide ou expiré</p>
                )}
                <p className="text-white/40 text-xs mt-1">
                  Utilisez un code de parrainage pour recevoir 500 FCFA bonus
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="label">
              <FaMapMarkerAlt className="inline mr-2" /> Province
            </label>
            {loadingProvinces ? (
              <div className="input-field flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span className="ml-2 text-white/60">Chargement...</span>
              </div>
            ) : (
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Sélectionnez votre province</option>
                {Array.isArray(provinces) && provinces.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">
              <FaCity className="inline mr-2" /> Ville (optionnelle)
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
              placeholder="Votre ville"
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingProvinces}
            className="btn-primary w-full"
          >
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link to="/login" className="text-blue-300 hover:text-blue-200 block text-sm">
            Déjà un compte ? Se connecter
          </Link>
          
          {/* Information parrainage */}
          <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
            <FaGift size={10} />
            <span>Parrainez vos amis et gagnez 500 FCFA par inscription</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register