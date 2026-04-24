// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaMapMarkerAlt, FaCity, FaKey, 
  FaCopy, FaEye, FaEyeSlash, FaWallet, FaEnvelope,
  FaEdit, FaSave, FaTimes, FaSpinner, FaCalendarAlt,
  FaIdCard, FaUpload, FaCheckCircle, FaFilePdf,
  FaDownload, FaShieldAlt, FaUserCheck, FaClock
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(0)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [provinces, setProvinces] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // États pour KYC
  const [kycStatus, setKycStatus] = useState({
    status: 'pending', // pending, verified, rejected, none
    level: 1,
    submittedAt: null,
    verifiedAt: null,
    documents: []
  })
  const [showKycModal, setShowKycModal] = useState(false)
  const [kycForm, setKycForm] = useState({
    fullname: '',
    birthDate: '',
    birthPlace: '',
    nationality: 'Tchadienne',
    idType: 'cni',
    idNumber: '',
    idIssueDate: '',
    idExpiryDate: '',
    address: '',
    occupation: '',
    phoneNumber: ''
  })
  const [selectedFiles, setSelectedFiles] = useState({
    idFront: null,
    idBack: null,
    selfie: null,
    proofOfAddress: null
  })
  const [uploadingKyc, setUploadingKyc] = useState(false)
  const [kycHistory, setKycHistory] = useState([])

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    city: '',
    address: '',
    province: ''
  })

  useEffect(() => {
    fetchProfile()
    fetchProvinces()
    fetchKycStatus()
    fetchKycHistory()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      
      const profileRes = await axios.get('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const balanceRes = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const userData = profileRes.data
      setProfile({
        id: userData.id,
        fullname: userData.fullname,
        phone: userData.phone,
        email: userData.email || '',
        province: userData.province || 'N\'Djaména',
        city: userData.city || '',
        address: userData.address || '',
        private_key: '********',
        created_at: userData.created_at
      })
      
      setFormData({
        fullname: userData.fullname || '',
        email: userData.email || '',
        city: userData.city || '',
        address: userData.address || '',
        province: userData.province || 'N\'Djaména'
      })
      
      setBalance(balanceRes.data.balance)
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      setProfile({
        fullname: user?.fullname || 'Utilisateur',
        phone: user?.phone || 'Non renseigné',
        email: '',
        province: 'N\'Djaména',
        city: '',
        address: '',
        private_key: '********'
      })
      setBalance(0)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

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

  const fetchKycStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/kyc/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycStatus(response.data)
      
      // Pré-remplir le formulaire KYC
      if (response.data.userData) {
        setKycForm(prev => ({
          ...prev,
          fullname: response.data.userData.fullname || profile?.fullname || '',
          address: response.data.userData.address || profile?.address || '',
          phoneNumber: response.data.userData.phone || profile?.phone || ''
        }))
      }
    } catch (error) {
      console.error('Erreur chargement KYC:', error)
      setKycStatus({ status: 'none', level: 0, documents: [] })
    }
  }

  const fetchKycHistory = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/kyc/history', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycHistory(response.data || [])
    } catch (error) {
      console.error('Erreur chargement historique KYC:', error)
    }
  }

  const handleEditChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleKycFormChange = (e) => {
    setKycForm({ ...kycForm, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put('/api/user/profile', {
        fullname: formData.fullname,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        province: formData.province
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setProfile(prev => ({
        ...prev,
        fullname: formData.fullname,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        province: formData.province
      }))
      
      setEditMode(false)
      toast.success('Profil mis à jour avec succès')
      
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
      savedUser.fullname = formData.fullname
      localStorage.setItem('user', JSON.stringify(savedUser))
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitKyc = async (e) => {
    e.preventDefault()
    setUploadingKyc(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const formDataKyc = new FormData()
      
      formDataKyc.append('fullname', kycForm.fullname)
      formDataKyc.append('birthDate', kycForm.birthDate)
      formDataKyc.append('birthPlace', kycForm.birthPlace)
      formDataKyc.append('nationality', kycForm.nationality)
      formDataKyc.append('idType', kycForm.idType)
      formDataKyc.append('idNumber', kycForm.idNumber)
      formDataKyc.append('idIssueDate', kycForm.idIssueDate)
      formDataKyc.append('idExpiryDate', kycForm.idExpiryDate)
      formDataKyc.append('address', kycForm.address)
      formDataKyc.append('occupation', kycForm.occupation)
      formDataKyc.append('phoneNumber', kycForm.phoneNumber)
      
      if (selectedFiles.idFront) {
        formDataKyc.append('idFront', selectedFiles.idFront)
      }
      if (selectedFiles.idBack) {
        formDataKyc.append('idBack', selectedFiles.idBack)
      }
      if (selectedFiles.selfie) {
        formDataKyc.append('selfie', selectedFiles.selfie)
      }
      if (selectedFiles.proofOfAddress) {
        formDataKyc.append('proofOfAddress', selectedFiles.proofOfAddress)
      }
      
      await axios.post('/api/kyc/submit', formDataKyc, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      
      toast.success('Documents KYC soumis avec succès')
      setShowKycModal(false)
      fetchKycStatus()
      fetchKycHistory()
      
      // Réinitialiser les fichiers
      setSelectedFiles({
        idFront: null,
        idBack: null,
        selfie: null,
        proofOfAddress: null
      })
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la soumission KYC')
    } finally {
      setUploadingKyc(false)
    }
  }

  const downloadKycDocument = async (documentId, filename) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/kyc/download/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Document téléchargé')
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
    }
  }

  const copyToClipboard = (text, label) => {
    if (!text) {
      toast.error('Aucune information à copier')
      return
    }
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papier`)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getKycStatusBadge = () => {
    switch(kycStatus.status) {
      case 'verified':
        return { color: 'bg-green-500/20 text-green-400', text: 'Vérifié', icon: FaCheckCircle }
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente', icon: FaClock }
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400', text: 'Rejeté', icon: FaTimes }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', text: 'Non soumis', icon: FaIdCard }
    }
  }

  const kycBadge = getKycStatusBadge()
  const KycIcon = kycBadge.icon

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      {/* Solde Card */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 mb-6">
        <div className="text-center">
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-3">
            <FaWallet className="text-white text-2xl" />
          </div>
          <p className="text-white/80 text-sm">Mon portefeuille</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white my-2">
            {balance.toLocaleString()} FCFA
          </h2>
          <p className="text-white/60 text-sm">Solde disponible</p>
        </div>
      </div>

      {/* KYC Status Card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${kycBadge.color}`}>
              <KycIcon className="text-xl" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Statut KYC</p>
              <p className={`font-semibold ${kycBadge.color.split(' ')[1]}`}>
                {kycBadge.text}
              </p>
              {kycStatus.level > 0 && (
                <p className="text-white/40 text-xs">Niveau {kycStatus.level}</p>
              )}
            </div>
          </div>
          
          {kycStatus.status !== 'verified' ? (
            <button
              onClick={() => setShowKycModal(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <FaIdCard /> {kycStatus.status === 'pending' ? 'Voir le statut' : 'Vérifier mon identité'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <FaCheckCircle /> Compte vérifié
            </div>
          )}
        </div>
        
        {kycStatus.status === 'verified' && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/50 text-xs flex items-center gap-1">
              <FaShieldAlt size={10} />
              Votre compte est vérifié. Vous bénéficiez de limites de transaction plus élevées.
            </p>
          </div>
        )}
        
        {kycStatus.status === 'pending' && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-yellow-400/70 text-xs flex items-center gap-1">
              <FaClock size={10} />
              Votre dossier est en cours de vérification. Vous serez notifié sous 24-48h.
            </p>
          </div>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-xl font-semibold">
            <FaUser className="inline mr-2" /> Informations personnelles
          </h3>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
            >
              <FaEdit size={14} /> Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <FaTimes size={16} />
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 text-sm"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave size={14} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Nom complet */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-400" />
              <div className="flex-1">
                <p className="text-white/50 text-xs">Nom complet</p>
                {editMode ? (
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleEditChange}
                    className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                  />
                ) : (
                  <p className="text-white font-medium">{profile?.fullname}</p>
                )}
              </div>
            </div>
            {!editMode && (
              <button
                onClick={() => copyToClipboard(profile?.fullname, 'Nom')}
                className="text-white/40 hover:text-white"
              >
                <FaCopy size={14} />
              </button>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaEnvelope className="text-blue-400" />
              <div className="flex-1">
                <p className="text-white/50 text-xs">Email</p>
                {editMode ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleEditChange}
                    className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                    placeholder="votre@email.com"
                  />
                ) : (
                  <p className="text-white font-medium">{profile?.email || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Téléphone */}
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

          {/* Province */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-blue-400" />
              <div className="flex-1">
                <p className="text-white/50 text-xs">Province</p>
                {editMode ? (
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleEditChange}
                    className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                  >
                    <option value="">Sélectionnez une province</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-white font-medium">{profile?.province}</p>
                )}
              </div>
            </div>
          </div>

          {/* Ville */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaCity className="text-blue-400" />
              <div className="flex-1">
                <p className="text-white/50 text-xs">Ville</p>
                {editMode ? (
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleEditChange}
                    className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                    placeholder="Votre ville"
                  />
                ) : (
                  <p className="text-white font-medium">{profile?.city || 'Non renseignée'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-blue-400" />
              <div className="flex-1">
                <p className="text-white/50 text-xs">Adresse</p>
                {editMode ? (
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleEditChange}
                    className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"
                    rows="2"
                    placeholder="Votre adresse complète"
                  />
                ) : (
                  <p className="text-white font-medium">{profile?.address || 'Non renseignée'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Date d'inscription */}
          {profile?.created_at && (
            <div className="flex items-center p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-blue-400" />
                <div>
                  <p className="text-white/50 text-xs">Membre depuis</p>
                  <p className="text-white font-medium">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sécurité */}
      <div className="card">
        <h3 className="text-white text-xl font-semibold mb-4">
          <FaKey className="inline mr-2" /> Sécurité
        </h3>

        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4">
          <p className="text-yellow-400 text-sm flex items-center gap-2">
            <span>⚠️</span> Gardez votre clé privée confidentielle. Ne la partagez avec personne.
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <FaKey className="text-blue-400" />
            <div>
              <p className="text-white/50 text-xs">Clé privée (6 chiffres)</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-lg tracking-wider">
                  {showPrivateKey ? profile?.private_key : '••••••'}
                </p>
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="text-white/40 hover:text-white"
                >
                  {showPrivateKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(profile?.private_key, 'Clé privée')}
            className="text-white/40 hover:text-white"
          >
            <FaCopy size={14} />
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-blue-300 text-sm flex items-center gap-2">
            <span>💡</span> En cas de perte de votre clé privée, contactez l'administrateur au <strong className="text-white">62 78 73 07</strong>
          </p>
        </div>

        <button
          onClick={() => {
            toast((t) => (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">🔐 Changer le mot de passe</p>
                <p className="text-sm">Cette fonctionnalité sera bientôt disponible</p>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
                >
                  OK
                </button>
              </div>
            ), { duration: 3000 })
          }}
          className="mt-4 w-full btn-secondary text-sm"
        >
          Changer mon mot de passe
        </button>
      </div>

      {/* MODAL KYC */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaIdCard className="text-blue-400" />
                Vérification d'identité (KYC)
              </h3>
              <button
                onClick={() => setShowKycModal(false)}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-blue-500/20 rounded-xl p-4 mb-6">
                <p className="text-blue-300 text-sm flex items-start gap-2">
                  <FaShieldAlt className="mt-0.5 flex-shrink-0" />
                  <span>La vérification d'identité est obligatoire pour augmenter vos limites de transaction et sécuriser votre compte.</span>
                </p>
              </div>

              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom complet *</label>
                    <input
                      type="text"
                      name="fullname"
                      value={kycForm.fullname}
                      onChange={handleKycFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Numéro de téléphone *</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={kycForm.phoneNumber}
                      onChange={handleKycFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date de naissance *</label>
                    <input
                      type="date"
                      name="birthDate"
                      value={kycForm.birthDate}
                      onChange={handleKycFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Lieu de naissance *</label>
                    <input
                      type="text"
                      name="birthPlace"
                      value={kycForm.birthPlace}
                      onChange={handleKycFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nationalité *</label>
                    <select
                      name="nationality"
                      value={kycForm.nationality}
                      onChange={handleKycFormChange}
                      className="input-field"
                    >
                      <option value="Tchadienne">Tchadienne</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Profession</label>
                    <input
                      type="text"
                      name="occupation"
                      value={kycForm.occupation}
                      onChange={handleKycFormChange}
                      className="input-field"
                      placeholder="Ex: Commerçant, Étudiant..."
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type de pièce d'identité *</label>
                    <select
                      name="idType"
                      value={kycForm.idType}
                      onChange={handleKycFormChange}
                      className="input-field"
                    >
                      <option value="cni">Carte Nationale d'Identité (CNI)</option>
                      <option value="passeport">Passeport</option>
                      <option value="permis">Permis de conduire</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Numéro de pièce *</label>
                    <input
                      type="text"
                      name="idNumber"
                      value={kycForm.idNumber}
                      onChange={handleKycFormChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date de délivrance</label>
                    <input
                      type="date"
                      name="idIssueDate"
                      value={kycForm.idIssueDate}
                      onChange={handleKycFormChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Date d'expiration</label>
                    <input
                      type="date"
                      name="idExpiryDate"
                      value={kycForm.idExpiryDate}
                      onChange={handleKycFormChange}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Adresse *</label>
                  <textarea
                    name="address"
                    value={kycForm.address}
                    onChange={handleKycFormChange}
                    className="input-field"
                    rows="2"
                    required
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-white font-semibold mb-3">Documents à fournir</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Recto de la CNI/Passeport *</label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, 'idFront')}
                          className="hidden"
                          id="idFront"
                          required={kycStatus.status === 'none'}
                        />
                        <label htmlFor="idFront" className="cursor-pointer flex flex-col items-center gap-2">
                          <FaUpload className="text-blue-400 text-2xl" />
                          <span className="text-white/60 text-sm">
                            {selectedFiles.idFront ? selectedFiles.idFront.name : 'Cliquez pour télécharger'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="label">Verso de la CNI (optionnel)</label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, 'idBack')}
                          className="hidden"
                          id="idBack"
                        />
                        <label htmlFor="idBack" className="cursor-pointer flex flex-col items-center gap-2">
                          <FaUpload className="text-blue-400 text-2xl" />
                          <span className="text-white/60 text-sm">
                            {selectedFiles.idBack ? selectedFiles.idBack.name : 'Cliquez pour télécharger'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="label">Selfie avec la pièce *</label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'selfie')}
                          className="hidden"
                          id="selfie"
                          required={kycStatus.status === 'none'}
                        />
                        <label htmlFor="selfie" className="cursor-pointer flex flex-col items-center gap-2">
                          <FaUpload className="text-blue-400 text-2xl" />
                          <span className="text-white/60 text-sm">
                            {selectedFiles.selfie ? selectedFiles.selfie.name : 'Photo tenant la pièce'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="label">Justificatif de domicile *</label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                          className="hidden"
                          id="proofOfAddress"
                          required={kycStatus.status === 'none'}
                        />
                        <label htmlFor="proofOfAddress" className="cursor-pointer flex flex-col items-center gap-2">
                          <FaUpload className="text-blue-400 text-2xl" />
                          <span className="text-white/60 text-sm">
                            {selectedFiles.proofOfAddress ? selectedFiles.proofOfAddress.name : 'Facture d\'électricité, eau...'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 rounded-xl p-4">
                  <p className="text-yellow-400 text-xs flex items-start gap-2">
                    <span>ℹ️</span>
                    <span>Les documents doivent être clairs et lisibles. Le traitement peut prendre 24-48h.</span>
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowKycModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingKyc}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {uploadingKyc ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    {uploadingKyc ? 'Envoi...' : 'Soumettre ma demande'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Profile