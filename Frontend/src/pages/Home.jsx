// src/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    FaMoneyBillWave, FaExchangeAlt, FaShieldAlt, FaUsers, FaClock,
    FaGlobeAfrica, FaArrowRight, FaCheckCircle, FaQrcode, FaWallet,
    FaChartLine, FaHeadset, FaGooglePlay, FaApple, FaFacebook,
    FaTwitter, FaInstagram, FaWhatsapp, FaTelegram, FaStar, FaUserPlus,
    FaLock, FaGift, FaRocket, FaSignInAlt, FaUserCircle, FaCreditCard,
    FaLandmark, FaPiggyBank, FaHandHoldingUsd, FaBus, FaFileInvoice,
    FaNewspaper, FaBell, FaUniversity, FaStore, FaMobileAlt, FaChevronRight,
    FaQuoteLeft, FaTimes, FaChevronLeft
} from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

function Home() {
    const navigate = useNavigate()
    const { isDark } = useTheme()
    const [animated, setAnimated] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [currentAd, setCurrentAd] = useState(0)
    const [showAdModal, setShowAdModal] = useState(false)

    // ============================================
    // PUBLICITÉS (À MODIFIER SELON TES BESOINS)
    // ============================================
    const ads = [
        {
            id: 1,
            title: '💳 Obtenez votre carte virtuelle',
            description: 'Payez en ligne et chez les commerçants avec votre carte Visa virtuelle CashPays. Demande en 2 minutes.',
            cta: 'Demander ma carte',
            action: '/virtual-card',
            gradient: 'from-purple-600 to-indigo-700',
            icon: FaCreditCard,
            badge: 'NOUVEAU'
        },
        {
            id: 2,
            title: '🏛️ Payez vos impôts en ligne',
            description: 'Réglez vos taxes communales sans vous déplacer. Reçu officiel instantané.',
            cta: 'Payer mes taxes',
            action: '/tax-payment',
            gradient: 'from-blue-600 to-blue-800',
            icon: FaLandmark,
            badge: 'RAPIDE'
        },
        {
            id: 3,
            title: '💰 Épargnez et gagnez des intérêts',
            description: 'Bloquez votre argent et gagnez jusqu\'à 8% d\'intérêts annuels.',
            cta: 'Commencer à épargner',
            action: '/savings',
            gradient: 'from-green-600 to-emerald-700',
            icon: FaPiggyBank,
            badge: '8% INTÉRÊTS'
        },
        {
            id: 4,
            title: '🚌 Réservez votre bus en ligne',
            description: 'Trouvez et réservez vos billets de bus partout au Tchad. Paiement sécurisé.',
            cta: 'Réserver un bus',
            action: '/bus-booking',
            gradient: 'from-orange-500 to-red-600',
            icon: FaBus,
            badge: 'VOYAGE'
        }
    ]

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        setAnimated(true)
        const token = localStorage.getItem('accessToken')
        const user = localStorage.getItem('user')
        if (token && user) {
            setIsLoggedIn(true)
        }
    }, [])

    // Rotation automatique des pubs (toutes les 8 secondes)
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentAd(prev => (prev + 1) % ads.length)
        }, 8000)
        return () => clearInterval(interval)
    }, [ads.length])

    // ============================================
    // DONNÉES
    // ============================================
    const stats = [
        { value: '10M+', label: 'Transactions', icon: FaExchangeAlt },
        { value: '50k+', label: 'Utilisateurs actifs', icon: FaUsers },
        { value: '500M+', label: 'Volume (FCFA)', icon: FaMoneyBillWave },
        { value: '24/7', label: 'Support client', icon: FaClock }
    ]

    const features = [
        {
            icon: FaExchangeAlt,
            title: 'Transfert instantané',
            description: 'Envoyez et recevez de l\'argent en quelques secondes, 24h/24 et 7j/7.',
            color: 'from-blue-500 to-blue-600',
            route: '/transfer'
        },
        {
            icon: FaQrcode,
            title: 'Paiement QR Code',
            description: 'Payez chez vos commerçants préférés en scannant simplement un QR code.',
            color: 'from-green-500 to-green-600',
            route: '/dashboard'
        },
        {
            icon: FaCreditCard,
            title: 'Carte Virtuelle Visa',
            description: 'Une carte bancaire virtuelle unique pour vos paiements en ligne.',
            color: 'from-purple-500 to-purple-600',
            route: '/virtual-card',
            isNew: true
        },
        {
            icon: FaLandmark,
            title: 'Paiement de Taxes',
            description: 'Réglez vos impôts et taxes communales en ligne avec reçu officiel.',
            color: 'from-indigo-500 to-indigo-600',
            route: '/tax-payment',
            isNew: true
        },
        {
            icon: FaPiggyBank,
            title: 'Épargne rémunérée',
            description: 'Gagnez jusqu\'à 8% d\'intérêts annuels sur votre épargne.',
            color: 'from-emerald-500 to-emerald-600',
            route: '/savings'
        },
        {
            icon: FaHandHoldingUsd,
            title: 'Micro-crédits',
            description: 'Obtenez un prêt rapidement avec des taux compétitifs.',
            color: 'from-yellow-500 to-yellow-600',
            route: '/loans'
        },
        {
            icon: FaChartLine,
            title: 'Investissements',
            description: 'Investissez dans des projets locaux et générez des rendements.',
            color: 'from-teal-500 to-teal-600',
            route: '/investments'
        },
        {
            icon: FaFileInvoice,
            title: 'Paiement de factures',
            description: 'Eau, électricité, internet : payez toutes vos factures en un clic.',
            color: 'from-cyan-500 to-cyan-600',
            route: '/bill-payment'
        },
        {
            icon: FaBus,
            title: 'Réservation Bus',
            description: 'Réservez vos billets de bus en ligne partout au Tchad.',
            color: 'from-orange-500 to-orange-600',
            route: '/bus-booking',
            isNew: true
        },
        {
            icon: FaNewspaper,
            title: 'Blog & Actualités',
            description: 'Restez informé des nouveautés et opportunités financières.',
            color: 'from-pink-500 to-pink-600',
            route: '/blog'
        },
        {
            icon: FaShieldAlt,
            title: 'Sécurité maximale',
            description: 'Transactions sécurisées avec chiffrement AES-256 et conformité ISO 20022.',
            color: 'from-red-500 to-red-600'
        },
        {
            icon: FaHeadset,
            title: 'Support 24/7',
            description: 'Une équipe dédiée pour vous accompagner à chaque étape.',
            color: 'from-slate-500 to-slate-600'
        }
    ]

    const steps = [
        {
            icon: FaUserPlus,
            title: '1. Inscription',
            description: 'Créez votre compte en quelques minutes',
            time: '2 min',
            color: 'from-blue-500 to-blue-600'
        },
        {
            icon: FaCheckCircle,
            title: '2. Vérification',
            description: 'Validez votre identité (KYC)',
            time: '5 min',
            color: 'from-green-500 to-green-600'
        },
        {
            icon: FaWallet,
            title: '3. Rechargez',
            description: 'Ajoutez de l\'argent via Mobile Money',
            time: 'Instantané',
            color: 'from-purple-500 to-purple-600'
        },
        {
            icon: FaRocket,
            title: '4. Profitez',
            description: 'Utilisez tous nos services',
            time: 'Immédiat',
            color: 'from-orange-500 to-orange-600'
        }
    ]

    const testimonials = [
        {
            name: 'Jean NDOUMBE',
            role: 'Commerçant à N\'Djamena',
            content: 'AlkherPay a révolutionné mes transactions. Je peux payer mes taxes et recevoir des paiements clients sans quitter ma boutique.',
            rating: 5,
            avatar: '👨‍💼'
        },
        {
            name: 'Marie MBALLA',
            role: 'Étudiante à Moundou',
            content: 'J\'utilise AlkherPay pour épargner et payer mes factures. Les frais sont très abordables et le service client est réactif.',
            rating: 5,
            avatar: '👩‍🎓'
        },
        {
            name: 'Pierre MADJI',
            role: 'Agent AlkherPay',
            content: 'Devenir agent AlkherPay m\'a permis de développer mon activité. Le support et la formation sont excellents.',
            rating: 5,
            avatar: '👨‍💻'
        }
    ]

    const partners = [
        { name: 'Airtel Money', emoji: '📱' },
        { name: 'Moov Money', emoji: '💰' },
        { name: 'Ecobank', emoji: '🏦' },
        { name: 'BICEC', emoji: '🏛️' },
        { name: 'Visa', emoji: '💳' },
        { name: 'Mastercard', emoji: '💳' }
    ]

    const scrollToSection = (id) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
    }

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'}`}>

            {/* ============================================
                HEADER / NAVIGATION
            ============================================ */}
            <header className={`sticky top-0 z-50 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
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

                        <div className="hidden md:flex items-center gap-6">
                            <button onClick={() => scrollToSection('features')} className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                                Services
                            </button>
                            <button onClick={() => scrollToSection('how')} className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                                Comment ça marche
                            </button>
                            <Link to="/fees" className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                                Tarifs
                            </Link>
                            <Link to="/agents" className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                                Agents
                            </Link>
                            <Link to="/contact" className={`${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                                Contact
                            </Link>
                        </div>

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

            {/* ============================================
                BANDEAU PUBLICITAIRE
            ============================================ */}
            <section className="container mx-auto px-4 pt-6">
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${ads[currentAd].gradient} p-6 md:p-8 shadow-2xl transition-all duration-500`}>
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                        <span className="text-white text-xs font-bold">{ads[currentAd].badge}</span>
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="bg-white/20 backdrop-blur p-4 rounded-2xl hidden md:block">
                                {React.createElement(ads[currentAd].icon, { className: 'text-white text-3xl' })}
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                    {ads[currentAd].title}
                                </h3>
                                <p className="text-white/90 text-sm md:text-base">
                                    {ads[currentAd].description}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(ads[currentAd].action)}
                            className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg"
                        >
                            {ads[currentAd].cta} <FaArrowRight />
                        </button>
                    </div>

                    {/* Indicateurs */}
                    <div className="flex justify-center gap-2 mt-6 relative z-10">
                        {ads.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentAd(index)}
                                className={`h-2 rounded-full transition-all ${
                                    index === currentAd ? 'w-8 bg-white' : 'w-2 bg-white/40'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================================
                HERO SECTION
            ============================================ */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                        <div className={`flex-1 text-center lg:text-left ${animated ? 'animate-fade-in' : ''}`}>
                            <div className="inline-flex items-center gap-2 bg-blue-500/20 rounded-full px-4 py-2 mb-6">
                                <FaRocket className="text-blue-400" />
                                <span className="text-blue-300 text-sm font-medium">Nouveau ! Carte virtuelle Visa disponible</span>
                            </div>

                            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                La banque digitale
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                                    {" "}du Tchad
                                </span>
                            </h1>

                            <p className={`text-lg mb-8 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                Transférez, épargnez, investissez, payez vos taxes et gérez votre argent
                                en toute sécurité depuis votre téléphone. Partout au Tchad, 24h/24.
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
                                    Découvrir les services
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
                                        Noté 4.9/5 par plus de 50 000 utilisateurs
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Carte virtuelle visuelle */}
                        <div className="flex-1 flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-600 rounded-3xl filter blur-3xl opacity-40 animate-pulse"></div>
                                <div className="relative bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-2xl p-6 w-80 h-48 shadow-2xl border border-white/20 flex flex-col justify-between text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs opacity-70 mb-1">CARTE VIRTUELLE</div>
                                            <div className="text-lg font-bold">CashPays</div>
                                        </div>
                                        <div className="text-2xl font-bold italic">VISA</div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-lg tracking-wider mb-3">
                                            4123 **** **** 2345
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-[8px] opacity-70">TITULAIRE</div>
                                                <div className="text-xs font-semibold">VOTRE NOM</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] opacity-70">EXPIRE</div>
                                                <div className="text-xs font-mono">12/28</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Badge 1000 FCFA */}
                                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl">
                                    <div className="text-xs opacity-90">Bonus inscription</div>
                                    <div className="text-lg font-bold">1000 FCFA</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================
                STATS
            ============================================ */}
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

            {/* ============================================
                SERVICES / FONCTIONNALITÉS
            ============================================ */}
            <section id="features" className="py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-blue-500/20 rounded-full px-4 py-2 mb-4">
                            <FaRocket className="text-blue-400" />
                            <span className="text-blue-300 text-sm font-medium">Nos services</span>
                        </div>
                        <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Tous vos besoins financiers en un seul endroit
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                            De la simple transaction au paiement de taxe, AlkherPay couvre tous vos besoins.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                onClick={() => feature.route && navigate(feature.route)}
                                className={`card group hover:transform hover:-translate-y-2 transition-all duration-300 ${isDark ? 'bg-white/5' : 'bg-white shadow-lg'} ${feature.route ? 'cursor-pointer' : ''} relative`}
                            >
                                {feature.isNew && (
                                    <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        NOUVEAU
                                    </div>
                                )}
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="text-white text-xl" />
                                </div>
                                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {feature.title}
                                </h3>
                                <p className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                    {feature.description}
                                </p>
                                {feature.route && (
                                    <div className="mt-3 text-blue-400 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Découvrir <FaChevronRight size={10} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================================
                COMMENT ÇA MARCHE
            ============================================ */}
            <section id="how" className={`py-20 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Comment ça marche ?
                        </h2>
                        <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                            Commencez en 4 étapes simples
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {steps.map((step, index) => (
                            <div key={index} className="text-center relative">
                                <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center mb-4 relative z-10 shadow-lg`}>
                                    <step.icon className="text-white text-2xl" />
                                </div>
                                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {step.title}
                                </h3>
                                <p className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                    {step.description}
                                </p>
                                <span className="text-blue-400 text-xs font-medium">
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

            {/* ============================================
                TÉMOIGNAGES
            ============================================ */}
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
                            <div key={index} className={`card ${isDark ? 'bg-white/5' : 'bg-white shadow-lg'} relative`}>
                                <FaQuoteLeft className="absolute top-4 right-4 text-blue-500/20 text-3xl" />
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

            {/* ============================================
                PARTENAIRES
            ============================================ */}
            <section className={`py-12 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="container mx-auto px-4 text-center">
                    <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                        Nos partenaires de confiance
                    </h3>
                    <div className="flex flex-wrap justify-center gap-8 items-center">
                        {partners.map((partner, index) => (
                            <div key={index} className={`flex items-center gap-2 text-xl font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                <span>{partner.emoji}</span>
                                <span>{partner.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============================================
                CTA FINAL
            ============================================ */}
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
                                Créez votre compte gratuitement et recevez <strong>1000 FCFA offerts</strong> dès votre inscription.
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
                                Pas de smartphone ? Visitez l'un de nos 100+ agents AlkherPay
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================
                FOOTER
            ============================================ */}
            <footer className={`py-12 border-t ${isDark ? 'border-white/10 bg-blue-900/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <FaMoneyBillWave className={`text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                Banque digitale du Tchad. Simple, rapide et sécurisé.
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
                            <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Services</h4>
                            <ul className="space-y-2">
                                <li><Link to="/virtual-card" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Carte virtuelle</Link></li>
                                <li><Link to="/tax-payment" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Paiement taxes</Link></li>
                                <li><Link to="/savings" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Épargne</Link></li>
                                <li><Link to="/loans" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Prêts</Link></li>
                                <li><Link to="/bus-booking" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Réservation bus</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ressources</h4>
                            <ul className="space-y-2">
                                <li><Link to="/faq" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>FAQ</Link></li>
                                <li><Link to="/blog" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Blog</Link></li>
                                <li><Link to="/agents" className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Devenir agent</Link></li>
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
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.6s ease-out; }
                .delay-1000 { animation-delay: 1s; }
            `}</style>
        </div>
    )
}

export default Home