// src/pages/Features.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { 
  FaExchangeAlt, FaQrcode, FaShieldAlt, FaWallet, FaGlobeAfrica, 
  FaHeadset, FaRocket, FaChartLine, FaMobileAlt, FaClock, 
  FaUsers, FaBell, FaHistory, FaDownload, FaLock, FaCheckCircle,
  FaArrowRight, FaMoneyBillWave, FaUserCheck, FaDatabase
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Features({ user }) {
  const features = [
    {
      icon: FaExchangeAlt,
      title: 'Transfert instantané',
      description: 'Envoyez et recevez de l\'argent en quelques secondes, 24h/24 et 7j/7.',
      details: 'Transactions asynchrones avec notification en temps réel.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: FaQrcode,
      title: 'Paiement QR Code',
      description: 'Payez chez vos commerçants en scannant simplement un QR code.',
      details: 'Génération de QR code dynamique pour chaque utilisateur.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: FaShieldAlt,
      title: 'Sécurité maximale',
      description: 'Transactions sécurisées avec chiffrement AES-256.',
      details: 'Conformité ISO 20022 et normes COBAC/BEAC.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: FaWallet,
      title: 'Portefeuille intégré',
      description: 'Gérez votre argent facilement avec un wallet sécurisé.',
      details: '1000 FCFA offerts à l\'inscription.',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: FaGlobeAfrica,
      title: 'Couverture nationale',
      description: 'Service disponible dans les 23 provinces du Tchad.',
      details: 'Plus de 100 agents répartis sur tout le territoire.',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: FaHeadset,
      title: 'Support 24/7',
      description: 'Une équipe dédiée pour vous accompagner.',
      details: 'Support téléphonique, WhatsApp et email.',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: FaHistory,
      title: 'Historique complet',
      description: 'Consultez toutes vos transactions à tout moment.',
      details: 'Export XML ISO 20022 pour chaque transaction.',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: FaBell,
      title: 'Notifications en temps réel',
      description: 'Soyez alerté à chaque transaction.',
      details: 'Notifications push, SMS et email.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: FaDownload,
      title: 'Téléchargement de reçus',
      description: 'Téléchargez vos reçus de transaction.',
      details: 'Format PDF et XML conforme ISO 20022.',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  return (
    <Layout user={user}>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaRocket className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Fonctionnalités AlkherPay
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Découvrez toutes les fonctionnalités qui font de AlkherPay la meilleure solution 
          de transfert d'argent au Tchad.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="card group hover:transform hover:-translate-y-2 transition-all duration-300">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
              <feature.icon className="text-white text-xl" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-white/70 mb-2">{feature.description}</p>
            <p className="text-white/40 text-sm">{feature.details}</p>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Pourquoi choisir AlkherPay ?</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Fonctionnalité</th>
                <th className="text-center py-3 px-4">AlkherPay</th>
                <th className="text-center py-3 px-4">Transfert classique</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4">Transfert instantané</td>
                <td className="text-center py-3 px-4 text-green-400"><FaCheckCircle className="inline" /></td>
                <td className="text-center py-3 px-4 text-red-400">✗</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4">Frais (2%)</td>
                <td className="text-center py-3 px-4 text-green-400">2%</td>
                <td className="text-center py-3 px-4 text-red-400">5-10%</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4">Disponibilité 24/7</td>
                <td className="text-center py-3 px-4 text-green-400"><FaCheckCircle className="inline" /></td>
                <td className="text-center py-3 px-4 text-red-400">Horaires limités</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 px-4">Wallet intégré</td>
                <td className="text-center py-3 px-4 text-green-400"><FaCheckCircle className="inline" /></td>
                <td className="text-center py-3 px-4 text-red-400">✗</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Bonus à l'inscription</td>
                <td className="text-center py-3 px-4 text-green-400">1000 FCFA</td>
                <td className="text-center py-3 px-4 text-red-400">0 FCFA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

export default Features