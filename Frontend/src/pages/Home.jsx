// src/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FaMoneyBillWave, FaExchangeAlt, FaShieldAlt, FaMobileAlt, 
  FaUsers, FaClock, FaGlobeAfrica, FaArrowRight, FaCheckCircle,
  FaQrcode, FaWallet, FaChartLine, FaHeadset, FaGooglePlay,
  FaApple, FaFacebook, FaTwitter, FaInstagram, FaWhatsapp,
  FaTelegram, FaStar, FaUserPlus, FaLock, FaGift, FaRocket,
  FaSignInAlt, FaUserCircle
} from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

function Home() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [animated, setAnimated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setAnimated(true)
    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('accessToken')
    const user = localStorage.getItem('user')
    if (token && user) {
      setIsLoggedIn(true)
    }
  }, [])

  const stats = [
    { value: '10M+', label: 'Transactions', icon: FaExchangeAlt },
    { value: '50k+', label: 'Utilisateurs', icon: FaUsers },
    { value: '100M+', label: 'Volume (FCFA)', icon: FaMoneyBillWave },
    { value: '24/7', label: 'Support', icon: FaClock }
  ]

  const features = [
    {
      icon: FaExchangeAlt,
      title: 'Transfert instantané',
      description: 'Envoyez et recevez de l\'argent en quelques secondes, 24h/24 et 7j/7.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: FaQrcode,
      title: 'Paiement QR Code',
      description: 'Payez chez vos commerçants préférés en scannant simplement un QR code.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: FaShieldAlt,
      title: 'Sécurité maximale',
      description: 'Transactions sécurisées avec chiffrement AES-256 et conformité ISO 20022.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: FaWallet,
      title: 'Portefeuille intégré',
      description: 'Gérez votre argent facilement avec un wallet sécurisé et 1000 FCFA offerts.',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: FaGlobeAfrica,
      title: 'Couverture nationale',
      description: 'Service disponible dans les 23 provinces du Tchad avec plus de 100 agents.',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: FaHeadset,
      title: 'Support 24/7',
      description: 'Une équipe dédiée pour vous accompagner à chaque étape.',
      color: 'from-indigo-500 to-indigo-600'
    }
  ]

  const steps = [
    {
      icon: FaUserPlus,
      title: '1. Inscription',
      description: 'Créez votre compte en quelques minutes',
      time: '2 min'
    },
    {
      icon: FaCheckCircle,
      title: '2. Vérification',
      description: 'Validez votre identité (KYC)',
      time: '5 min'
    },
    {
      icon: FaMoneyBillWave,
      title: '3. Transfert',
      description: 'Envoyez et recevez de l\'argent',
      time: 'Instantané'
    }
  ]

  const testimonials = [
    {
      name: 'Jean NDOUMBE',
      role: 'Commerçant',
      content: 'AlkherPay a révolutionné mes transactions. Plus besoin d\'aller à la banque, tout se fait depuis mon téléphone !',
      rating: 5,
      avatar: '👨‍💼'
    },
    {
      name: 'Marie MBALLA',
      role: 'Étudiante',
      content: 'Super application ! Les frais sont très abordables et le service client est réactif. Je recommande vivement.',
      rating: 5,
      avatar: '👩‍🎓'
    },
    {
      name: 'Pierre MADJI',
      role: 'Agent AlkherPay',
      content: 'Devenir agent AlkherPay m\'a permis de développer mon activité et de servir ma communauté.',
      rating: 5,
      avatar: '👨‍💻'
    }
  ]

  const partners = [
    'Airtel Money', 'Moov Money', 'Ecobank', 'BICEC', 'Orange Money'
  ]

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'}`}>
      
      {/* Header / Navigation */}
      <header className={`sticky top-0 z-50 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <div>
                <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  AlkherPay
                </span>
                <span className="text-blue-400 text-xs block">GOUROUSDJA</span>
              </div>
            </Link>

            {/* Navigation Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('features')} className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Fonctionnalités
              </button>
              <Link to="/contact" className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Contact
              </Link>
              <Link to="/agents" className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Agents
              </Link>
            </div>

            {/* Boutons d'authentification */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                >
                  <FaUserCircle /> Tableau de bord
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <FaSignInAlt className="inline mr-1" /> Connexion
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    <FaUserPlus className="inline mr-1" /> Inscription
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Left content */}
            <div className={`flex-1 text-center lg:text-left ${animated ? 'animate-fade-in' : ''}`}>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 rounded-full px-4 py-2 mb-6">
                <FaRocket className="text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">Nouveau ! 1000 FCFA offerts à l'inscription</span>
              </div>
              
              <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Transfert d'argent
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                  {" "}instantané
                </span>
                <br />
                au Tchad
              </h1>
              
              <p className={`text-lg mb-8 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                AlkherPay vous permet d'envoyer et de recevoir de l'argent en toute sécurité, 
                où que vous soyez au Tchad. Des frais transparents et un service disponible 24h/24.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary px-8 py-3 text-lg flex items-center justify-center gap-2 group"
                >
                  <FaUserPlus /> Créer un compte gratuit
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className={`btn-secondary px-8 py-3 text-lg flex items-center justify-center gap-2 ${isDark ? 'text-white' : 'text-gray-700'}`}
                >
                  En savoir plus
                </button>
              </div>
              
              <div className="flex items-center gap-6 justify-center lg:justify-start mt-8">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm border-2 border-white">
                      {['👤', '👩', '🧑', '👨'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} size={14} />
                    ))}
                  </div>
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Noté 4.9/5 par nos utilisateurs
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right content - Illustration */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
                      <FaMoneyBillWave className="text-white text-4xl" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      1000 FCFA
                    </h3>
                    <p className={`${isDark ? 'text-white/50' : 'text-gray-500'} text-sm`}>
                      offerts à l'inscription
                    </p>
                    <div className="mt-4 p-3 bg-white/10 rounded-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>Frais</span>
                        <span className="text-green-400 font-semibold">2%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>Min.</span>
                        <span className="text-white">25 FCFA</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>Dépôt</span>
                        <span className="text-white">Gratuit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-12 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-3">
                  <stat.icon className="text-white text-xl" />
                </div>
                <h3 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </h3>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pourquoi choisir AlkherPay ?
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Une solution simple, rapide et sécurisée pour tous vos besoins de transfert d'argent
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className={`card group hover:transform hover:-translate-y-2 transition-all duration-300 ${isDark ? 'bg-white/5' : 'bg-white shadow-lg'}`}>
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="text-white text-xl" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={`py-20 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Comment ça fonctionne ?
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Commencez à envoyer de l'argent en 3 étapes simples
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-4 relative z-10">
                    <step.icon className="text-white text-2xl" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent"></div>
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {step.title}
                </h3>
                <p className={`mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {step.description}
                </p>
                <span className="text-blue-400 text-sm font-medium">
                  ⏱️ {step.time}
                </span>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary px-8 py-3 text-lg"
            >
              Commencer maintenant
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Ce que nos utilisateurs disent
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Des milliers d'utilisateurs nous font confiance chaque jour
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className={`card ${isDark ? 'bg-white/5' : 'bg-white shadow-lg'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {testimonial.name}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <div className="flex text-yellow-400 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} size={14} />
                  ))}
                </div>
                <p className={`${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className={`py-12 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4 text-center">
          <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Ils nous font confiance
          </h3>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {partners.map((partner, index) => (
              <span key={index} className={`text-xl font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 md:p-12 text-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Prêt à rejoindre AlkherPay ?
              </h2>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                Créez votre compte gratuitement et recevez 1000 FCFA offerts dès votre inscription.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <FaGooglePlay /> Télécharger sur Android
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-white/20 text-white hover:bg-white/30 px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <FaApple /> Prochainement sur iOS
                </button>
              </div>
              <p className="text-blue-200 text-sm mt-6">
                Pas de smartphone ? Visitez l'un de nos agents AlkherPay
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 border-t ${isDark ? 'border-white/10 bg-blue-900/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FaMoneyBillWave className={`text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Transfert d'argent instantané au Tchad. Simple, rapide et sécurisé.
              </p>
              <div className="flex gap-4 mt-4">
                <a href="#" className={`${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  <FaFacebook />
                </a>
                <a href="#" className={`${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  <FaTwitter />
                </a>
                <a href="#" className={`${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  <FaInstagram />
                </a>
                <a href="#" className={`${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  <FaWhatsapp />
                </a>
                <a href="#" className={`${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                  <FaTelegram />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Produit</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Fonctionnalités</button></li>
                <li><Link to="/fees" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Tarifs</Link></li>
                <li><Link to="/agents" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Devenir agent</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ressources</h4>
              <ul className="space-y-2">
                <li><Link to="/faq" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>FAQ</Link></li>
                <li><Link to="/blog" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Blog</Link></li>
                <li><Link to="/contact" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Légal</h4>
              <ul className="space-y-2">
                <li><Link to="/terms" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Conditions</Link></li>
                <li><Link to="/privacy" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Confidentialité</Link></li>
                <li><Link to="/licenses" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Licences</Link></li>
              </ul>
            </div>
          </div>
          
          <div className={`text-center pt-8 mt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              © 2026 AlkherPay - GOUROUSDJA. Tous droits réservés. | Agrément COBAC N° 2026/001
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}

export default Home