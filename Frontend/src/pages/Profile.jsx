// src/pages/Profile.jsx - Version corrigée
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUser, FaPhone, FaMapMarkerAlt, FaCity, FaKey, 
  FaCopy, FaEye, FaEyeSlash, FaWallet, FaEnvelope,
  FaEdit, FaSave, FaTimes, FaCalendarAlt,
  FaIdCard, FaUpload, FaCheckCircle, FaFilePdf,
  FaDownload, FaShieldAlt, FaUserCheck, FaClock,
  FaShare, FaWhatsapp, FaTelegram, FaEnvelope as FaMail,
  FaFacebook, FaGift, FaUsers, FaChartLine, FaQrcode,
  FaLink, FaStar, FaRegStar, FaStarHalfAlt
} from 'react-icons/fa'
import Layout from '../components/Layout'

// Composant Spinner personnalisé
const Spinner = ({ size = 'w-5 h-5' }) => (
  <div className={`${size} border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
)

function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(0)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [provinces, setProvinces] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // États pour le parrainage
  const [referralCode, setReferralCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [referralQrUrl, setReferralQrUrl] = useState('')
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalBonus: 0,
    pendingBonus: 0,
    referrals: []
  })
  const [referralCopied, setReferralCopied] = useState(false)
  const [showReferralQR, setShowReferralQR] = useState(false)
  
  // États pour KYC
  const [kycStatus, setKycStatus] = useState({
    status: 'none',
    level: 1,
    submittedAt: null,
    verifiedAt: null,
    documents: []
  })
  const [showKycModal, setShowKycModal] = useState(false)
  const [kycForm, setKycForm] = useState({
    fullname: '',
    birth_date: '',
    birth_place: '',
    nationality: 'Tchadienne',
    id_type: 'cni',
    id_number: '',
    id_issue_date: '',
    id_expiry_date: '',
    address: '',
    occupation: '',
    phone_number: ''
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
    fetchReferralInfo()
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
      const generatedCode = generateReferralCode(userData.phone)
      
      setProfile({
        id: userData.id,
        fullname: userData.fullname,
        phone: userData.phone,
        email: userData.email || '',
        province: userData.province || 'N\'Djaména',
        city: userData.city || '',
        address: userData.address || '',
        private_key: userData.private_key || '********',
        created_at: userData.created_at,
        referral_code: userData.referral_code || generatedCode
      })
      
      setFormData({
        fullname: userData.fullname || '',
        email: userData.email || '',
        city: userData.city || '',
        address: userData.address || '',
        province: userData.province || 'N\'Djaména'
      })
      
      setBalance(balanceRes.data.balance)
      
      const code = userData.referral_code || generatedCode
      setReferralCode(code)
      const link = `${window.location.origin}/register?ref=${code}`
      setReferralLink(link)
      setReferralQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`)
      
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      const generatedCode = generateReferralCode(user?.phone)
      setProfile({
        fullname: user?.fullname || 'Utilisateur',
        phone: user?.phone || 'Non renseigné',
        email: '',
        province: 'N\'Djaména',
        city: '',
        address: '',
        private_key: '********',
        referral_code: generatedCode
      })
      setBalance(0)
      setReferralCode(generatedCode)
      setReferralLink(`${window.location.origin}/register?ref=${generatedCode}`)
      setReferralQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/register?ref=${generatedCode}`)}`)
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }

  const generateReferralCode = (phone) => {
    if (!phone) return 'CASH' + Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CASH${phone.slice(-6)}`
  }

  const fetchReferralInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/referral/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReferralStats(response.data)
    } catch (error) {
      console.error('Erreur chargement stats parrainage:', error)
      setReferralStats({
        totalReferrals: 0,
        totalBonus: 0,
        pendingBonus: 0,
        referrals: []
      })
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
      
      if (response.data.userData) {
        setKycForm(prev => ({
          ...prev,
          fullname: response.data.userData.fullname || profile?.fullname || '',
          address: response.data.userData.address || profile?.address || '',
          phone_number: response.data.userData.phone || profile?.phone || ''
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
    
    // Validation des champs requis
    if (!kycForm.fullname) {
      toast.error('Le nom complet est requis')
      return
    }
    if (!kycForm.id_type) {
      toast.error('Le type de pièce d\'identité est requis')
      return
    }
    if (!kycForm.id_number) {
      toast.error('Le numéro de pièce d\'identité est requis')
      return
    }
    
    setUploadingKyc(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      
      // Envoyer les données JSON (pas de fichiers pour le test)
      const kycData = {
        fullname: kycForm.fullname,
        birth_date: kycForm.birth_date || null,
        birth_place: kycForm.birth_place || null,
        id_type: kycForm.id_type,
        id_number: kycForm.id_number,
        id_issue_date: kycForm.id_issue_date || null,
        id_expiry_date: kycForm.id_expiry_date || null,
        address: kycForm.address || null,
        occupation: kycForm.occupation || null,
        phone_number: kycForm.phone_number || profile?.phone
      }
      
      console.log('Envoi KYC:', kycData)
      
      const response = await axios.post('/api/kyc/submit', kycData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.success) {
        toast.success('Demande KYC soumise avec succès')
        setShowKycModal(false)
        fetchKycStatus()
        fetchKycHistory()
        
        setKycForm({
          fullname: '',
          birth_date: '',
          birth_place: '',
          nationality: 'Tchadienne',
          id_type: 'cni',
          id_number: '',
          id_issue_date: '',
          id_expiry_date: '',
          address: '',
          occupation: '',
          phone_number: ''
        })
      }
    } catch (error) {
      console.error('Erreur KYC:', error.response?.data)
      toast.error(error.response?.data?.error || 'Erreur lors de la soumission KYC')
    } finally {
      setUploadingKyc(false)
    }
  }

  const copyToClipboard = (text, label) => {
    if (!text) {
      toast.error('Aucune information à copier')
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copié !`)
    }).catch(() => {
      toast.error(`Impossible de copier ${label}`)
    })
  }

  const copyReferralLink = () => {
    if (!referralLink) return
    copyToClipboard(referralLink, 'Lien de parrainage')
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 3000)
  }

  const copyReferralCode = () => {
    if (!referralCode) return
    copyToClipboard(referralCode, 'Code de parrainage')
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 3000)
  }

  const shareReferral = (platform) => {
    const message = `🌟 Rejoignez CashPays ! Utilisez mon code de parrainage : ${referralCode}\n\nInscrivez-vous ici : ${referralLink}\n\nChaque parrainage vous rapporte 500 FCFA ! 💰`
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Rejoignez CashPays !')}`,
      email: `mailto:?subject=${encodeURIComponent('Rejoignez CashPays')}&body=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent('Rejoignez CashPays !')}`
    }
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank')
    }
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
          <Spinner size="w-12 h-12" />
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

      {/* Section Parrainage */}
      <div className="card mb-6 bg-gradient-to-r from-purple-600 to-purple-700">
        <div className="text-center mb-4">
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-3">
            <FaGift className="text-white text-2xl" />
          </div>
          <h3 className="text-white text-xl font-bold">Programme de parrainage</h3>
          <p className="text-purple-100 text-sm">Parrainez vos amis et gagnez 500 FCFA par inscription !</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <FaUsers className="text-purple-200 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{referralStats.totalReferrals}</p>
            <p className="text-white/60 text-xs">Parrainages</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <FaChartLine className="text-purple-200 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{referralStats.totalBonus.toLocaleString()} FCFA</p>
            <p className="text-white/60 text-xs">Gagnés</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <FaClock className="text-purple-200 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{referralStats.pendingBonus.toLocaleString()} FCFA</p>
            <p className="text-white/60 text-xs">En attente</p>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <p className="text-white/60 text-xs mb-1">Votre code de parrainage</p>
          <div className="flex items-center gap-2">
            <code className="bg-white/20 rounded-lg px-3 py-2 text-white font-mono text-lg flex-1 text-center">
              {referralCode}
            </code>
            <button
              onClick={copyReferralCode}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all"
              title="Copier le code"
            >
              {referralCopied ? <FaCheckCircle /> : <FaCopy />}
            </button>
            <button
              onClick={() => setShowReferralQR(!showReferralQR)}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all"
              title="Afficher QR code"
            >
              <FaQrcode />
            </button>
          </div>
        </div>
        
        {showReferralQR && (
          <div className="bg-white/10 rounded-xl p-4 mb-3 text-center">
            <p className="text-white/60 text-xs mb-2">Scannez ce QR code pour partager</p>
            <img
              src={referralQrUrl}
              alt="QR Code de parrainage"
              className="w-32 h-32 mx-auto bg-white p-2 rounded-lg"
            />
          </div>
        )}
        
        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <p className="text-white/60 text-xs mb-1">Votre lien de parrainage</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="bg-white/20 rounded-lg px-3 py-2 text-white text-sm flex-1 font-mono truncate"
            />
            <button
              onClick={copyReferralLink}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all"
            >
              <FaLink />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => shareReferral('whatsapp')} className="bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"><FaWhatsapp size={14} /> WhatsApp</button>
          <button onClick={() => shareReferral('telegram')} className="bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"><FaTelegram size={14} /> Telegram</button>
          <button onClick={() => shareReferral('email')} className="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"><FaMail size={14} /> Email</button>
          <button onClick={() => shareReferral('facebook')} className="bg-[#1877f2]/20 hover:bg-[#1877f2]/30 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"><FaFacebook size={14} /> Facebook</button>
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-white/40 text-xs">💡 Chaque ami qui s'inscrit avec votre code vous rapporte 500 FCFA</p>
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
              <p className={`font-semibold ${kycBadge.color.split(' ')[1]}`}>{kycBadge.text}</p>
              {kycStatus.level > 0 && <p className="text-white/40 text-xs">Niveau {kycStatus.level}</p>}
            </div>
          </div>
          {kycStatus.status !== 'verified' && (
            <button onClick={() => setShowKycModal(true)} className="btn-primary text-sm flex items-center gap-2">
              <FaIdCard /> {kycStatus.status === 'pending' ? 'Voir le statut' : 'Vérifier mon identité'}
            </button>
          )}
        </div>
        {kycStatus.status === 'verified' && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/50 text-xs"><FaShieldAlt className="inline mr-1" size={10} /> Votre compte est vérifié. Vous bénéficiez de limites de transaction plus élevées.</p>
          </div>
        )}
        {kycStatus.status === 'pending' && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-yellow-400/70 text-xs"><FaClock className="inline mr-1" size={10} /> Votre dossier est en cours de vérification. Vous serez notifié sous 24-48h.</p>
          </div>
        )}
      </div>

      {/* Informations personnelles */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-xl font-semibold"><FaUser className="inline mr-2" /> Informations personnelles</h3>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"><FaEdit size={14} /> Modifier</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="text-white/50 hover:text-white"><FaTimes size={16} /></button>
              <button onClick={handleSaveProfile} disabled={saving} className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm">
                {saving ? <Spinner size="w-4 h-4" /> : <FaSave size={14} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaUser className="text-blue-400" /><div className="flex-1"><p className="text-white/50 text-xs">Nom complet</p>{editMode ? <input type="text" name="fullname" value={formData.fullname} onChange={handleEditChange} className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1" /> : <p className="text-white font-medium">{profile?.fullname}</p>}</div></div>
            {!editMode && <button onClick={() => copyToClipboard(profile?.fullname, 'Nom')} className="text-white/40 hover:text-white"><FaCopy size={14} /></button>}
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaEnvelope className="text-blue-400" /><div className="flex-1"><p className="text-white/50 text-xs">Email</p>{editMode ? <input type="email" name="email" value={formData.email} onChange={handleEditChange} className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1" placeholder="votre@email.com" /> : <p className="text-white font-medium">{profile?.email || 'Non renseigné'}</p>}</div></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaPhone className="text-blue-400" /><div><p className="text-white/50 text-xs">Adresse wallet / Téléphone</p><p className="text-white font-medium">{profile?.phone}</p></div></div>
            <button onClick={() => copyToClipboard(profile?.phone, 'Numéro')} className="text-white/40 hover:text-white"><FaCopy size={14} /></button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaMapMarkerAlt className="text-blue-400" /><div className="flex-1"><p className="text-white/50 text-xs">Province</p>{editMode ? <select name="province" value={formData.province} onChange={handleEditChange} className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1"><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select> : <p className="text-white font-medium">{profile?.province}</p>}</div></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaCity className="text-blue-400" /><div className="flex-1"><p className="text-white/50 text-xs">Ville</p>{editMode ? <input type="text" name="city" value={formData.city} onChange={handleEditChange} className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1" placeholder="Votre ville" /> : <p className="text-white font-medium">{profile?.city || 'Non renseignée'}</p>}</div></div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3"><FaMapMarkerAlt className="text-blue-400" /><div className="flex-1"><p className="text-white/50 text-xs">Adresse</p>{editMode ? <textarea name="address" value={formData.address} onChange={handleEditChange} className="bg-white/10 rounded-lg px-2 py-1 text-white w-full mt-1" rows="2" placeholder="Votre adresse complète" /> : <p className="text-white font-medium">{profile?.address || 'Non renseignée'}</p>}</div></div>
          </div>

          {profile?.created_at && (
            <div className="flex items-center p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3"><FaCalendarAlt className="text-blue-400" /><div><p className="text-white/50 text-xs">Membre depuis</p><p className="text-white font-medium">{formatDate(profile.created_at)}</p></div></div>
            </div>
          )}
        </div>
      </div>

      {/* Sécurité */}
      <div className="card">
        <h3 className="text-white text-xl font-semibold mb-4"><FaKey className="inline mr-2" /> Sécurité</h3>
        <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4"><p className="text-yellow-400 text-sm flex items-center gap-2"><span>⚠️</span> Gardez votre clé privée confidentielle. Ne la partagez avec personne.</p></div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3"><FaKey className="text-blue-400" /><div><p className="text-white/50 text-xs">Clé privée (6 chiffres)</p><div className="flex items-center gap-2"><p className="text-white font-mono text-lg tracking-wider">{showPrivateKey ? profile?.private_key : '••••••'}</p><button onClick={() => setShowPrivateKey(!showPrivateKey)} className="text-white/40 hover:text-white">{showPrivateKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}</button></div></div></div>
          <button onClick={() => copyToClipboard(profile?.private_key, 'Clé privée')} className="text-white/40 hover:text-white"><FaCopy size={14} /></button>
        </div>
        <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20"><p className="text-blue-300 text-sm flex items-center gap-2"><span>💡</span> En cas de perte de votre clé privée, contactez l'administrateur au <strong className="text-white">62 78 73 07</strong></p></div>
        <button onClick={() => toast('Changement de mot de passe bientôt disponible', { duration: 3000, icon: '🔐' })} className="mt-4 w-full btn-secondary text-sm">Changer mon mot de passe</button>
      </div>

      {/* MODAL KYC */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaIdCard className="text-blue-400" /> Vérification d'identité (KYC)</h3>
              <button onClick={() => setShowKycModal(false)} className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              <div className="bg-blue-500/20 rounded-xl p-4 mb-6"><p className="text-blue-300 text-sm flex items-start gap-2"><FaShieldAlt className="mt-0.5 flex-shrink-0" /> La vérification d'identité est obligatoire pour augmenter vos limites de transaction et sécuriser votre compte.</p></div>
              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="label">Nom complet *</label><input type="text" name="fullname" value={kycForm.fullname} onChange={handleKycFormChange} className="input-field" required /></div>
                  <div><label className="label">Téléphone *</label><input type="tel" name="phone_number" value={kycForm.phone_number} onChange={handleKycFormChange} className="input-field" required /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="label">Date de naissance</label><input type="date" name="birth_date" value={kycForm.birth_date} onChange={handleKycFormChange} className="input-field" /></div>
                  <div><label className="label">Lieu de naissance</label><input type="text" name="birth_place" value={kycForm.birth_place} onChange={handleKycFormChange} className="input-field" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="label">Type de pièce *</label><select name="id_type" value={kycForm.id_type} onChange={handleKycFormChange} className="input-field" required><option value="cni">CNI</option><option value="passeport">Passeport</option><option value="permis">Permis de conduire</option></select></div>
                  <div><label className="label">Numéro *</label><input type="text" name="id_number" value={kycForm.id_number} onChange={handleKycFormChange} className="input-field" required /></div>
                </div>
                <div><label className="label">Adresse *</label><textarea name="address" value={kycForm.address} onChange={handleKycFormChange} className="input-field" rows="2" required /></div>
                <div><label className="label">Profession</label><input type="text" name="occupation" value={kycForm.occupation} onChange={handleKycFormChange} className="input-field" /></div>
                <div className="bg-yellow-500/10 rounded-xl p-4"><p className="text-yellow-400 text-xs">ℹ️ Les documents doivent être clairs et lisibles. Le traitement peut prendre 24-48h.</p></div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowKycModal(false)} className="btn-secondary flex-1">Annuler</button>
                  <button type="submit" disabled={uploadingKyc} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {uploadingKyc ? <Spinner size="w-5 h-5" /> : <FaCheckCircle />}
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