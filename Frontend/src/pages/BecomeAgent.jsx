// src/pages/BecomeAgent.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUserTie, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaCheckCircle, FaMoneyBillWave, FaUsers, FaChartLine,
  FaShieldAlt, FaWhatsapp, FaArrowRight, FaUpload
} from 'react-icons/fa'
import Layout from '../components/Layout'

function BecomeAgent({ user }) {
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    email: '',
    agency_name: '',
    agency_address: '',
    city: '',
    experience: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await axios.post('/api/become-agent', formData)
      setSubmitted(true)
      toast.success('Votre demande a été envoyée avec succès !')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.')
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
            Notre équipe vous contactera dans les plus brefs délais.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/" className="btn-primary">Retour à l'accueil</Link>
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
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaUserTie className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Devenez agent CashPays
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Rejoignez le réseau CashPays et développez votre activité tout en servant votre communauté.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {benefits.map((benefit, index) => (
          <div key={index} className="card text-center">
            <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3">
              <benefit.icon className="text-blue-400 text-xl" />
            </div>
            <h3 className="text-white font-semibold mb-2">{benefit.title}</h3>
            <p className="text-white/50 text-sm">{benefit.description}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Formulaire */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Formulaire de candidature</h2>
          
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
              <label className="label">Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="label">Expérience (optionnel)</label>
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
              <label className="label">Message / Motivation</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="input-field"
                rows="3"
                placeholder="Pourquoi voulez-vous devenir agent CashPays ?"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
              <li className="flex items-center gap-2">✓ Être majeur (18 ans minimum)</li>
              <li className="flex items-center gap-2">✓ Avoir un local commercial</li>
              <li className="flex items-center gap-2">✓ Disposer d'un smartphone</li>
              <li className="flex items-center gap-2">✓ Être disponible 6j/7</li>
            </ul>
          </div>
          
          <div className="card">
            <h3 className="text-white font-semibold mb-3">Ce que nous offrons</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">✓ Commission attractive sur les transactions</li>
              <li className="flex items-center gap-2">✓ Formation gratuite</li>
              <li className="flex items-center gap-2">✓ Support technique dédié</li>
              <li className="flex items-center gap-2">✓ Visibilité sur notre réseau</li>
            </ul>
          </div>
          
          <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
            <p className="text-yellow-400 text-sm">
              📞 Une question ? Contactez-nous au <strong className="text-white">62 78 73 07</strong>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BecomeAgent