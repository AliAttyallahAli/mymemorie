// src/pages/Contact.jsx
import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaWhatsapp, FaTelegram, FaFacebook, FaClock, FaUser, FaComment, FaPaperPlane } from 'react-icons/fa'
import Layout from '../components/Layout'
import { Link } from 'react-router-dom'



function Contact({ user }) {
  const [formData, setFormData] = useState({
    name: user?.fullname || '',
    email: '',
    phone: user?.phone || '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.message) {
      toast.error('Veuillez saisir un message')
      return
    }
    
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/contact', formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      toast.success('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.')
      setFormData(prev => ({ ...prev, subject: '', message: '' }))
    } catch (error) {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const contactInfo = [
    {
      icon: FaPhone,
      title: 'Téléphone',
      details: '+235 62 78 73 07',
      link: 'tel:+23562787307',
      color: 'bg-green-500/20 text-green-400'
    },
    {
      icon: FaWhatsapp,
      title: 'WhatsApp',
      details: '+235 62 78 73 07',
      link: 'https://wa.me/23562787307',
      color: 'bg-green-500/20 text-green-400'
    },
    {
      icon: FaEnvelope,
      title: 'Email',
      details: 'supportcashpays@gmail.com',
      link: 'mailto:supportcashpays@gmail.com',
      color: 'bg-blue-500/20 text-blue-400'
    },
    {
      icon: FaMapMarkerAlt,
      title: 'Adresse',
      details: 'mongo, Quartier Secteur N°7, Tchad',
      link: 'https://maps.google.com/?q=Mongo+Tchad',
      color: 'bg-red-500/20 text-red-400'
    }
  ]

  const socialLinks = [
    { icon: FaFacebook, name: 'Facebook', link: 'https://facebook.com/cashpays', color: 'bg-[#1877f2]' },
    { icon: FaWhatsapp, name: 'WhatsApp', link: 'https://wa.me/23562787307', color: 'bg-[#25d366]' },
    { icon: FaTelegram, name: 'Telegram', link: 'https://t.me/cashpays', color: 'bg-[#0088cc]' },
    { icon: FaEnvelope, name: 'Email', link: 'mailto:supportcashpays@gmail.com', color: 'bg-gray-500' }
  ]

  const faqs = [
    {
      question: 'Comment créer un compte CashPays ?',
      answer: 'Téléchargez l\'application, cliquez sur "Créer un compte", renseignez vos informations (nom, téléphone, mot de passe) et validez. Vous recevrez 1000 FCFA offerts à l\'inscription.'
    },
    {
      question: 'Quels sont les frais de transaction ?',
      answer: 'Les frais de transfert entre utilisateurs sont de 2% du montant. Les dépôts en agence sont gratuits. Les retraits sont à 2%.'
    },
    {
      question: 'Comment récupérer ma clé privée perdue ?',
      answer: 'Contactez notre service client au 62 78 73 07. Après vérification de votre identité, nous vous fournirons une nouvelle clé sécurisée.'
    },
    {
      question: 'Quelle est la limite de transaction ?',
      answer: 'Le montant minimum est de 25 FCFA. Le montant maximum dépend de votre solde et du supply total de 100 000 000 FCFA.'
    },
    {
      question: 'L\'application est-elle sécurisée ?',
      answer: 'Oui, CashPays utilise un chiffrement AES-256 et respecte les normes de sécurité de la COBAC et de la BEAC.'
    },
    {
      question: 'Comment devenir agent CashPays ?',
      answer: 'Contactez notre équipe au 62 78 73 07 pour obtenir les conditions d\'agrément et le processus de recrutement.'
    }
  ]

  const [openFaq, setOpenFaq] = useState(null)

  return (
    <Layout user={user}>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaComment className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Contactez-nous</h1>
        <p className="text-white/50 max-w-xl mx-auto">
          Notre équipe est à votre disposition pour répondre à vos questions et vous accompagner.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Informations de contact */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Informations de contact</h2>
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className={`w-10 h-10 rounded-full ${info.color} flex items-center justify-center`}>
                    <info.icon className="text-xl" />
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">{info.title}</p>
                    <p className="text-white font-medium">{info.details}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Horaires */}
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaClock className="text-blue-400" /> Horaires d'ouverture
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between p-2">
                <span className="text-white/60">Lundi - Vendredi</span>
                <span className="text-white">08:00 - 18:00</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-white/60">Samedi</span>
                <span className="text-white">09:00 - 13:00</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-white/60">Dimanche et jours fériés</span>
                <span className="text-white">Fermé</span>
              </div>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Suivez-nous</h2>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl ${social.color} hover:opacity-80 transition-all text-white`}
                >
                  <social.icon className="text-xl" />
                  <span className="text-xs">{social.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Formulaire de contact */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Envoyez-nous un message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FaUser /> Nom complet
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <FaEnvelope /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <FaPhone /> Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="8 chiffres"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <FaComment /> Sujet
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Sujet de votre message"
                  />
                </div>
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="input-field"
                  rows="5"
                  placeholder="Décrivez votre demande..."
                  required
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
                    <FaPaperPlane /> Envoyer le message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FAQ */}
          <div className="card mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Foire aux questions (FAQ)</h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-all"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    <span className={`text-blue-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {openFaq === index && (
                    <div className="p-4 border-t border-white/10 bg-white/5">
                      <p className="text-white/70">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center text-white/40 text-sm">
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/terms" className="hover:text-white transition-colors">Conditions d'utilisation</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
        <p className="mt-4">© 2026 CashPays - GOUROUSDJA. Tous droits réservés.</p>
      </div>
    </Layout>
  )
}

export default Contact