// src/pages/BecomeAgent.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUserTie, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaCheckCircle, FaMoneyBillWave, FaUsers, FaChartLine,
  FaShieldAlt, FaWhatsapp, FaArrowRight, FaUpload,
  FaSpinner, FaTimes, FaInfoCircle, FaStore, FaIdCard,
  FaRegClock, FaStar, FaHandshake, FaRocket
} from 'react-icons/fa'
import Layout from '../components/Layout'

function BecomeAgent({ user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullname: user?.fullname || '',
    phone: user?.phone || '',
    email: user?.email || '',
    agency_name: '',
    agency_address: '',
    city: '',
    province: '',
    experience: '',
    motivation: '',
    id_card_number: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [provinces, setProvinces] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState({
    id_card: null,
    business_license: null
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchProvinces()
    if (user?.phone) {
      setFormData(prev => ({
        ...prev,
        phone: user.phone,
        fullname: user.fullname || ''
      }))
    }
  }, [user])

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

  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.fullname) {
      toast.error('Veuillez entrer votre nom complet')
      return
    }
    
    if (!formData.phone) {
      toast.error('Veuillez entrer votre numéro de téléphone')
      return
    }
    
    if (!formData.agency_name) {
      toast.error('Veuillez entrer le nom de votre agence')
      return
    }
    
    if (!formData.agency_address) {
      toast.error('Veuillez entrer l\'adresse de votre agence')
      return
    }
    
    setLoading(true)
    
    try {
      const submitData = new FormData()
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key])
        }
      })
      
      if (uploadedFiles.id_card) {
        submitData.append('id_card', uploadedFiles.id_card)
      }
      if (uploadedFiles.business_license) {
        submitData.append('business_license', uploadedFiles.business_license)
      }
      
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/become-agent', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : undefined
        }
      })
      
      setSubmitted(true)
      toast.success('Votre demande a été envoyée avec succès !')
      
    } catch (error) {
      console.error('Erreur soumission:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    {
      icon: FaMoneyBillWave,
      title: 'Revenus supplémentaires',
      description: 'Gagnez des commissions sur chaque transaction'
    },
    {
      icon: FaUsers,
      title: 'Clientèle fidèle',
      description: 'Servez votre communauté et fidélisez vos clients'
    },
    {
      icon: FaChartLine,
      title: 'Croissance',
      description: 'Développez votre activité avec CashPays'
    },
    {
      icon: FaShieldAlt,
      title: 'Support dédié',
      description: 'Accompagnement personnalisé 24/7'
    },
    {
      icon: FaHandshake,
      title: 'Partenariat fiable',
      description: 'Rejoignez une marque reconnue au Tchad'
    },
    {
      icon: FaRocket,
      title: 'Innovation',
      description: 'Utilisez notre technologie de pointe'
    }
  ]

  if (submitted) {
    return (
      <Layout user={user}>
        <div className="card max-w-2xl mx-auto text-center">
          <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
            <FaCheckCircle className="text-green-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Demande envoyée !</h2>
          <p className="text-white/70 mb-6">
            Nous avons bien reçu votre demande pour devenir agent CashPays. 
            Notre équipe vous contactera dans les plus brefs délais pour étudier votre candidature.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/')} className="btn-primary">
              Retour à l'accueil
            </button>
            <a href="https://wa.me/23562787307" className="btn-secondary flex items-center gap-2">
              <FaWhatsapp /> Nous contacter
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaUserTie className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Devenez agent CashPays
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Rejoignez notre réseau de partenaires et développez votre activité
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {benefits.map((benefit, index) => (
          <div key={index} className="card text-center group hover:transform hover:-translate-y-1 transition-all">
            <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <benefit.icon className="text-blue-400 text-xl" />
            </div>
            <h3 className="text-white font-semibold mb-2">{benefit.title}</h3>
            <p className="text-white/50 text-sm">{benefit.description}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">
            Formulaire de candidature
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom complet *</label>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="label">Téléphone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="8 chiffres"
                required
              />
            </div>
            
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="votre@email.com"
              />
            </div>
            
            <div>
              <label className="label">Nom de l'agence *</label>
              <input
                type="text"
                name="agency_name"
                value={formData.agency_name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="label">Adresse de l'agence *</label>
              <textarea
                name="agency_address"
                value={formData.agency_address}
                onChange={handleChange}
                className="input-field"
                rows="2"
                required
              />
            </div>
            
            <div>
              <label className="label">Province</label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Sélectionnez une province</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input-field"
                placeholder="Votre ville"
              />
            </div>
            
            <div>
              <label className="label">Numéro de pièce d'identité</label>
              <input
                type="text"
                name="id_card_number"
                value={formData.id_card_number}
                onChange={handleChange}
                className="input-field"
                placeholder="CNI/Passeport"
              />
            </div>
            
            <div>
              <label className="label">Documents (optionnel)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-dashed border-white/20 rounded-lg p-3 text-center hover:border-blue-400 transition-all">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'id_card')}
                    className="hidden"
                    id="id_card"
                  />
                  <label htmlFor="id_card" className="cursor-pointer flex flex-col items-center gap-1">
                    <FaIdCard className="text-blue-400 text-xl" />
                    <span className="text-white/60 text-xs">CNI/Passeport</span>
                  </label>
                </div>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-3 text-center hover:border-blue-400 transition-all">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'business_license')}
                    className="hidden"
                    id="business_license"
                  />
                  <label htmlFor="business_license" className="cursor-pointer flex flex-col items-center gap-1">
                    <FaStore className="text-blue-400 text-xl" />
                    <span className="text-white/60 text-xs">Registre de commerce</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <label className="label">Expérience professionnelle</label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="input-field"
                rows="2"
                placeholder="Décrivez votre expérience dans le domaine financier ou commercial"
              />
            </div>
            
            <div>
              <label className="label">Motivation *</label>
              <textarea
                name="motivation"
                value={formData.motivation}
                onChange={handleChange}
                className="input-field"
                rows="3"
                placeholder="Pourquoi voulez-vous devenir agent CashPays ?"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || uploading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading || uploading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <>
                  Envoyer ma candidature <FaArrowRight />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Informations */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-white font-semibold mb-3">Prérequis</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Être majeur (18 ans minimum)
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Avoir un local commercial
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Disposer d'un smartphone
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Connexion internet stable
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Être disponible 6j/7
              </li>
            </ul>
          </div>
          
          <div className="card">
            <h3 className="text-white font-semibold mb-3">Ce que nous offrons</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Commission attractive sur les transactions
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Formation gratuite
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Support technique dédié 24/7
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Visibilité sur notre réseau
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-xs" /> Matériel de point de vente fourni
              </li>
            </ul>
          </div>
          
          <div className="card">
            <h3 className="text-white font-semibold mb-3">Commissions</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Dépôt en agence</span>
                <span className="text-green-400 font-semibold">0.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Retrait en agence</span>
                <span className="text-green-400 font-semibold">0.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Transfert en agence</span>
                <span className="text-green-400 font-semibold">0.3%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-white font-medium">Commission mensuelle moyenne</span>
                <span className="text-yellow-400 font-bold">100 000 - 500 000 FCFA</span>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
            <p className="text-yellow-400 text-sm flex items-start gap-2">
              <FaInfoCircle className="mt-0.5 flex-shrink-0" />
              <span>Une question ? Contactez-nous au <strong className="text-white">62 78 73 07</strong> ou par email à <strong className="text-white">cashpays@gmail.com</strong></span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BecomeAgent