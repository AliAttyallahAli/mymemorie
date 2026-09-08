// src/pages/Fees.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { FaMoneyBillWave, FaPercent, FaGift, FaExchangeAlt, FaWallet, FaCheckCircle } from 'react-icons/fa'
import Layout from '../components/Layout'

function Fees({ user }) {
  const fees = [
    {
      title: 'Transfert entre utilisateurs',
      rate: '2%',
      min: '25 FCFA',
      max: 'Sans limite',
      icon: FaExchangeAlt,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Dépôt en agence',
      rate: '0%',
      min: 'Gratuit',
      max: 'Illimité',
      icon: FaWallet,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Retrait en agence',
      rate: '2%',
      min: '25 FCFA',
      max: 'Illimité',
      icon: FaMoneyBillWave,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Bonus parrainage',
      rate: '500 FCFA',
      description: 'Pour chaque ami parrainé',
      icon: FaGift,
      color: 'from-purple-500 to-purple-600'
    }
  ]

  const examples = [
    { amount: 1000, fee: 20, total: 1020, received: 980 },
    { amount: 5000, fee: 100, total: 5100, received: 4900 },
    { amount: 10000, fee: 200, total: 10200, received: 9800 },
    { amount: 50000, fee: 1000, total: 51000, received: 49000 },
    { amount: 100000, fee: 2000, total: 102000, received: 98000 }
  ]

  return (
    <Layout user={user}>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaPercent className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Tarifs transparents
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Des frais clairs et compétitifs. Vous savez exactement ce que vous payez.
        </p>
      </div>

      {/* Fees cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {fees.map((fee, index) => (
          <div key={index} className="card text-center">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${fee.color} mb-4`}>
              <fee.icon className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{fee.title}</h3>
            <p className="text-3xl font-bold text-blue-400 mb-2">{fee.rate}</p>
            <p className="text-white/60 text-sm">
              {fee.min} • {fee.max}
            </p>
            {fee.description && (
              <p className="text-white/50 text-sm mt-2">{fee.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Examples table */}
      <div className="card mb-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Exemples de frais
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Montant envoyé</th>
                <th className="text-left py-3 px-4">Frais (2%)</th>
                <th className="text-left py-3 px-4">Total débité</th>
                <th className="text-left py-3 px-4">Montant reçu</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((ex, index) => (
                <tr key={index} className="border-b border-white/10">
                  <td className="py-3 px-4">{ex.amount.toLocaleString()} FCFA</td>
                  <td className="py-3 px-4 text-yellow-400">{ex.fee.toLocaleString()} FCFA</td>
                  <td className="py-3 px-4">{ex.total.toLocaleString()} FCFA</td>
                  <td className="py-3 px-4 text-green-400">{ex.received.toLocaleString()} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/40 text-sm text-center mt-4">
          * Transfert entre utilisateurs AlkherPay
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-start gap-4">
          <FaCheckCircle className="text-blue-400 text-xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-white font-semibold mb-2">Aucun frais caché</h3>
            <p className="text-white/60 text-sm">
              AlkherPay s'engage à une transparence totale sur ses frais. 
              Les frais sont calculés automatiquement et affichés avant chaque transaction.
              Les dépôts en agence sont entièrement gratuits.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Fees