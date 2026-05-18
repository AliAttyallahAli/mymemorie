// src/pages/CreateAgent.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaLock, FaMapMarkerAlt, FaBuilding, 
  FaIdCard, FaMoneyBillWave, FaCheckCircle, FaTimes,
  FaEye, FaEyeSlash, FaCopy, FaShieldAlt
} from 'react-icons/fa'
import Layout from '../components/Layout'

function CreateAgent({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [provinces, setProvinces] = useState([])
  const [createdAgent, setCreatedAgent] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const [formData, setFormData] = useState({
    phone: '',
    fullname: '',
    password: '',
    confirmPassword: '',
    province: '',
    agency_name: '',
    agency_address: '',
    agency_phone: '',
    agency_type: 'secondaire'
  })

  useEffect(() => {
    fetchProvinces()
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
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

    if (!formData.fullname) {
      toast.error('Le nom complet est requis')
      return
    }

    if (!formData.province) {
      toast.error('La province est requise')
      return
    }

    if (!formData.agency_name) {
      toast.error('Le nom de l\'agence est requis')
      return
    }

    if (!formData.agency_address) {
      toast.error('L\'adresse de l\'agence est requise')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/admin/agents', 
        {
          phone: formData.phone,
          fullname: formData.fullname,
          password: formData.password,
          province: formData.province,
          agency_name: formData.agency_name,
          agency_address: formData.agency_address,
          agency_phone: formData.agency_phone || formData.phone,
          agency_type: formData.agency_type
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setCreatedAgent(response.data.agent)
      toast.success('Agent créé avec succès !')
      
      // Réinitialiser le formulaire
      setFormData({
        phone: '',
        fullname: '',
        password: '',
        confirmPassword: '',
        province: '',
        agency_name: '',
        agency_address: '',
        agency_phone: '',
        agency_type: 'secondaire'
      })

    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création de l\'agent')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papier`)
  }

  // Si un agent vient d'être créé, afficher les informations
  if (createdAgent) {
    return (
      <Layout user={user}>
        <div className="card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Agent créé avec succès !</h2>
            <p className="text-white/50">Voici les informations d'accès de l'agent</p>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
              <FaShieldAlt /> Informations confidentielles
            </p>
            <p className="text-yellow-400/70 text-sm">
              Ces informations doivent être transmises de manière sécurisée à l'agent.
              L'agent devra changer son mot de passe lors de sa première connexion.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/50 text-sm">Nom complet</p>
                <p className="text-white font-medium">{createdAgent.fullname}</p>
              </div>
              <button
                onClick={() => copyToClipboard(createdAgent.fullname, 'Nom')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/50 text-sm">Numéro de téléphone</p>
                <p className="text-white font-medium">{createdAgent.phone}</p>
              </div>
              <button
                onClick={() => copyToClipboard(createdAgent.phone, 'Numéro')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/50 text-sm">Numéro d'agence</p>
                <p className="text-white font-mono">{createdAgent.agency_number}</p>
              </div>
              <button
                onClick={() => copyToClipboard(createdAgent.agency_number, 'Numéro d\'agence')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/50 text-sm">Mot de passe temporaire</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-mono text-lg tracking-wider">
                    {showPassword ? formData.password : '••••••••'}
                  </p>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/40 hover:text-white"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(formData.password, 'Mot de passe')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/50 text-sm">Clé privée (6 chiffres)</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-mono text-lg tracking-wider">
                    {showPrivateKey ? createdAgent.private_key : '••••••'}
                  </p>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-white/40 hover:text-white"
                  >
                    {showPrivateKey ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy />
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setCreatedAgent(null)}
              className="btn-primary flex-1"
            >
              Créer un autre agent
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="btn-secondary flex-1"
            >
              Retour au panel admin
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
              <FaUser className="text-white text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Créer un nouvel agent</h1>
            <p className="text-white/50 text-sm">
              Remplissez le formulaire pour créer un compte agent CashPays
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section informations personnelles */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaUser className="text-blue-400" /> Informations personnelles
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FaUser /> Nom complet <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Jean NDOUMBE"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaPhone /> Numéro de téléphone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="8 chiffres (Ex: 66234567)"
                    maxLength="8"
                    required
                  />
                  <p className="text-white/40 text-xs mt-1">
                    Ce numéro servira d'identifiant de connexion
                  </p>
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaMapMarkerAlt /> Province <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Sélectionnez une province</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section sécurité */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaLock className="text-blue-400" /> Sécurité
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FaLock /> Mot de passe <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Au moins 4 caractères"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaLock /> Confirmer le mot de passe <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Répétez le mot de passe"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-blue-400 text-sm flex items-center gap-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                  {showPassword ? 'Masquer' : 'Afficher'} le mot de passe
                </button>
              </div>
            </div>

            {/* Section agence */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaBuilding className="text-blue-400" /> Informations de l'agence
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FaBuilding /> Nom de l'agence <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="agency_name"
                    value={formData.agency_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Agence CashPays Moursal"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaMapMarkerAlt /> Adresse de l'agence <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="agency_address"
                    value={formData.agency_address}
                    onChange={handleChange}
                    className="input-field"
                    rows="2"
                    placeholder="Adresse complète de l'agence"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaPhone /> Téléphone de l'agence (optionnel)
                  </label>
                  <input
                    type="tel"
                    name="agency_phone"
                    value={formData.agency_phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Numéro de l'agence"
                    maxLength="8"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <FaIdCard /> Type d'agence
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="agency_type"
                        value="principale"
                        checked={formData.agency_type === 'principale'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-white">Principale</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="agency_type"
                        value="secondaire"
                        checked={formData.agency_type === 'secondaire'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-white">Secondaire</span>
                    </label>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    Les agences principales peuvent gérer des volumes de transactions plus élevés
                  </p>
                </div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="bg-white/5 rounded-xl p-4 mt-4">
              <p className="text-white/70 text-sm mb-2">📋 Récapitulatif</p>
              <div className="space-y-1 text-sm">
                <p className="text-white/50">✓ Un wallet sera automatiquement créé</p>
                <p className="text-white/50">✓ L'agent recevra une clé privée à 6 chiffres</p>
                <p className="text-white/50">✓ L'agent pourra effectuer des dépôts et retraits</p>
                <p className="text-white/50">✓ L'agent aura sa propre interface de gestion</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaCheckCircle /> Créer l'agent
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information supplémentaire */}
        <div className="mt-6 bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
          <p className="text-blue-300 text-sm flex items-start gap-2">
            <span>ℹ️</span>
            <span>
              L'agent pourra se connecter avec son numéro de téléphone et son mot de passe,
              ou avec sa clé privée à 6 chiffres. Transmettez ces informations de manière sécurisée.
            </span>
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default CreateAgent