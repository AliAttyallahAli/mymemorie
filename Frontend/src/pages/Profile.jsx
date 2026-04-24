import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaUser, FaPhone, FaMapMarkerAlt, FaCity, FaKey, FaCopy, FaEye, FaEyeSlash } from 'react-icons/fa'
import Layout from '../components/Layout'

function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(0)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [provinces, setProvinces] = useState([])

  useEffect(() => {
    fetchProfile()
    fetchProvinces()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const [userRes, balanceRes] = await Promise.all([
        axios.get('/api/admin/users?limit=1', { // Simplifié - normalement un endpoint /me
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/wallet/balance', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      // Simulation - dans un vrai projet, ajoutez un endpoint /api/user/me
      setProfile({
        fullname: user.fullname,
        phone: user.phone,
        province: 'N\'Djaména',
        city: 'N\'Djaména',
        address: 'Non renseignée',
        private_key: '******'
      })
      setBalance(balanceRes.data.balance)
    } catch (error) {
      console.error('Erreur chargement profil:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProvinces = async () => {
    try {
      const response = await axios.get('/api/provinces')
      setProvinces(response.data)
    } catch (error) {
      console.error('Erreur chargement provinces:', error)
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papier`)
  }

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      {/* Solde Card */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 mb-6">
        <div className="text-center">
          <p className="text-white/80 text-sm">Mon portefeuille</p>
          <h2 className="text-4xl font-bold text-white my-2">
            {balance.toLocaleString()} FCFA
          </h2>
          <p className="text-white/60 text-sm">Solde disponible</p>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="card mb-6">
        <h3 className="text-white text-xl font-semibold mb-4">
          <FaUser className="inline mr-2" /> Informations personnelles
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-400" />
              <div>
                <p className="text-white/50 text-xs">Nom complet</p>
                <p className="text-white font-medium">{profile?.fullname}</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(profile?.fullname, 'Nom')}
              className="text-white/40 hover:text-white"
            >
              <FaCopy size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaPhone className="text-blue-400" />
              <div>
                <p className="text-white/50 text-xs">Adresse wallet / Téléphone</p>
                <p className="text-white font-medium">{profile?.phone}</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(profile?.phone, 'Numéro')}
              className="text-white/40 hover:text-white"
            >
              <FaCopy size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-blue-400" />
              <div>
                <p className="text-white/50 text-xs">Province</p>
                <p className="text-white font-medium">{profile?.province}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaCity className="text-blue-400" />
              <div>
                <p className="text-white/50 text-xs">Ville</p>
                <p className="text-white font-medium">{profile?.city || 'Non renseignée'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="card">
        <h3 className="text-white text-xl font-semibold mb-4">
          <FaKey className="inline mr-2" /> Sécurité
        </h3>

        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4">
          <p className="text-yellow-400 text-sm">
            ⚠️ Gardez votre clé privée confidentielle. Ne la partagez avec personne.
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <FaKey className="text-blue-400" />
            <div>
              <p className="text-white/50 text-xs">Clé privée (6 chiffres)</p>
              <p className="text-white font-mono text-lg tracking-wider">
                {showPrivateKey ? profile?.private_key : '••••••'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-white/40 hover:text-white"
            >
              {showPrivateKey ? <FaEyeSlash /> : <FaEye />}
            </button>
            <button
              onClick={() => copyToClipboard(profile?.private_key, 'Clé privée')}
              className="text-white/40 hover:text-white"
            >
              <FaCopy size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 rounded-xl">
          <p className="text-blue-300 text-sm">
            💡 En cas de perte de votre clé privée, contactez l'administrateur au <strong>62787307</strong>
          </p>
        </div>
      </div>
    </Layout>
  )
}

export default Profile