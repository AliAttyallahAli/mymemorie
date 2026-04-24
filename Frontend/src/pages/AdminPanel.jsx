// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUsers, FaUserTie, FaMoneyBillWave, FaChartLine, FaBell, 
  FaCog, FaKey, FaUserPlus, FaTimes, FaEye, FaEyeSlash, FaClock,
  FaBuilding, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaShieldAlt,
  FaCopy, FaBan, FaCheck, FaTrashAlt, FaEdit, FaPlus, FaNewspaper,
  FaSave, FaArrowLeft, FaImage, FaIdCard, FaTag, FaCalendarAlt, FaSpinner,
  FaDownload, FaEnvelope, FaUserCheck, FaUserTimes, FaInfoCircle
} from 'react-icons/fa'
import Layout from '../components/Layout'

function AdminPanel({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  
  // États pour le blog
  const [blogPosts, setBlogPosts] = useState([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [showBlogForm, setShowBlogForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [savingPost, setSavingPost] = useState(false)
  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'actualite',
    tags: '',
    image_url: '',
    status: 'published'
  })
  
  // États pour KYC
  const [kycRequests, setKycRequests] = useState([])
  const [kycLoading, setKycLoading] = useState(false)
  const [selectedKyc, setSelectedKyc] = useState(null)
  const [showKycDetailModal, setShowKycDetailModal] = useState(false)
  const [kycFilter, setKycFilter] = useState('all')
  const [processingKyc, setProcessingKyc] = useState(false)
  
  // États pour le modal de création d'agent
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [createdAgent, setCreatedAgent] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [provinces, setProvinces] = useState([])
  
  // Formulaire agent
  const [agentForm, setAgentForm] = useState({
    phone: '',
    fullname: '',
    password: '',
    confirmPassword: '',
    province: '',
    agency_name: '',
    agency_address: '',
    agency_phone: '',
    agency_type: 'secondaire'
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData()
      fetchProvinces()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'blog') {
      fetchBlogPosts()
    }
    if (activeTab === 'kyc') {
      fetchKycRequests()
    }
  }, [activeTab])

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const [usersRes, agentsRes] = await Promise.all([
        axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/users?role=agent', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setUsers(usersRes.data.users || [])
      setAgents(agentsRes.data.users || [])
      
      const totalBalance = (usersRes.data.users || []).reduce((sum, u) => sum + (u.balance || 0), 0)
      setStats({
        totalUsers: usersRes.data.total || 0,
        totalAgents: agentsRes.data.total || 0,
        totalBalance,
        totalTransactions: 0
      })
    } catch (error) {
      console.error('Erreur chargement admin:', error)
      toast.error('Erreur chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const fetchBlogPosts = async () => {
    setBlogLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/blog/posts?status=all', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const posts = Array.isArray(response.data.posts) ? response.data.posts : []
      setBlogPosts(posts)
    } catch (error) {
      console.error('Erreur chargement blog:', error)
      setBlogPosts([])
      toast.error('Erreur lors du chargement des articles')
    } finally {
      setBlogLoading(false)
    }
  }

  const fetchKycRequests = async () => {
    setKycLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/kyc/requests?status=${kycFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycRequests(response.data.requests || [])
    } catch (error) {
      console.error('Erreur chargement KYC:', error)
      setKycRequests([])
      toast.error('Erreur lors du chargement des demandes KYC')
    } finally {
      setKycLoading(false)
    }
  }

  const fetchProvinces = async () => {
    try {
      const response = await axios.get('/api/provinces')
      if (Array.isArray(response.data)) {
        setProvinces(response.data)
      } else {
        setProvinces([])
      }
    } catch (error) {
      console.error('Erreur chargement provinces:', error)
      setProvinces([])
    }
  }

  const handleAgentFormChange = (e) => {
    setAgentForm({ ...agentForm, [e.target.name]: e.target.value })
  }

  const handleCreateAgent = async (e) => {
    e.preventDefault()
    
    if (agentForm.password !== agentForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (agentForm.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }
    
    if (!/^\d{8}$/.test(agentForm.phone)) {
      toast.error('Le numéro de téléphone doit contenir 8 chiffres')
      return
    }
    
    if (!agentForm.fullname) {
      toast.error('Le nom complet est requis')
      return
    }
    
    if (!agentForm.province) {
      toast.error('La province est requise')
      return
    }
    
    if (!agentForm.agency_name) {
      toast.error('Le nom de l\'agence est requis')
      return
    }
    
    if (!agentForm.agency_address) {
      toast.error('L\'adresse de l\'agence est requise')
      return
    }
    
    setCreatingAgent(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/admin/agents', 
        {
          phone: agentForm.phone,
          fullname: agentForm.fullname,
          password: agentForm.password,
          province: agentForm.province,
          agency_name: agentForm.agency_name,
          agency_address: agentForm.agency_address,
          agency_phone: agentForm.agency_phone || agentForm.phone,
          agency_type: agentForm.agency_type
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setCreatedAgent(response.data.agent)
      toast.success('Agent créé avec succès !')
      
      setAgentForm({
        phone: '',
        fullname: '',
        password: '',
        confirmPassword: '',
        province: '',
        agency_name: '',
        agency_address: '',
        agency_phone: '',
        agency_type: 'secondaire'
      })
      
      fetchAdminData()
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création de l\'agent')
    } finally {
      setCreatingAgent(false)
    }
  }

  const resetAgentModal = () => {
    setShowAgentModal(false)
    setCreatedAgent(null)
    setAgentForm({
      phone: '',
      fullname: '',
      password: '',
      confirmPassword: '',
      province: '',
      agency_name: '',
      agency_address: '',
      agency_phone: '',
      agency_type: 'secondaire'
    })
    setShowPassword(false)
    setShowPrivateKey(false)
  }

  const handleBlogFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setBlogForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCreateBlogPost = async (e) => {
    e.preventDefault()
    setSavingPost(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const data = {
        title: blogForm.title,
        content: blogForm.content,
        excerpt: blogForm.excerpt,
        category: blogForm.category,
        tags: blogForm.tags,
        image_url: blogForm.image_url,
        status: blogForm.status
      }
      
      if (editingPost) {
        await axios.put(`/api/blog/posts/${editingPost.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('Article modifié avec succès')
      } else {
        await axios.post('/api/blog/posts', data, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('Article créé avec succès')
      }
      
      setShowBlogForm(false)
      setEditingPost(null)
      setBlogForm({
        title: '',
        excerpt: '',
        content: '',
        category: 'actualite',
        tags: '',
        image_url: '',
        status: 'published'
      })
      fetchBlogPosts()
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de l\'enregistrement')
    } finally {
      setSavingPost(false)
    }
  }

  const handleDeleteBlogPost = async (postId, postTitle) => {
    if (!window.confirm(`Supprimer l'article "${postTitle}" ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/blog/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Article supprimé')
      fetchBlogPosts()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleEditBlogPost = (post) => {
    setEditingPost(post)
    setBlogForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || 'actualite',
      tags: post.tags || '',
      image_url: post.image_url || '',
      status: post.status || 'published'
    })
    setShowBlogForm(true)
  }

  const handleKycAction = async (requestId, action, rejectionReason = '') => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${action === 'approve' ? 'approuver' : 'rejeter'} cette demande KYC ?`)) return
    
    setProcessingKyc(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/kyc/verify/${requestId}`, {
        action,
        rejectionReason: rejectionReason || null,
        level: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success(`Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`)
      fetchKycRequests()
      setShowKycDetailModal(false)
      setSelectedKyc(null)
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du traitement')
    } finally {
      setProcessingKyc(false)
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

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/users/${userId}/toggle-status`, 
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'}`)
      fetchAdminData()
    } catch (error) {
      toast.error('Erreur lors du changement de statut')
    }
  }

  const recoverUserKey = async (userId, userName) => {
    if (!window.confirm(`Générer une nouvelle clé pour ${userName} ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/users/${userId}/key`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(`Nouvelle clé: ${response.data.private_key}`, { duration: 10000 })
    } catch (error) {
      toast.error('Erreur lors de la récupération de la clé')
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié !`)
  }

  const getStatusBadge = (status) => {
    switch(status) {
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
    { id: 'users', label: 'Utilisateurs', icon: FaUsers },
    { id: 'agents', label: 'Agents', icon: FaUserTie },
    { id: 'wallet', label: 'Wallet Principal', icon: FaMoneyBillWave },
    { id: 'announce', label: 'Annonces', icon: FaBell },
    { id: 'blog', label: 'Blog', icon: FaNewspaper },
    { id: 'kyc', label: 'KYC', icon: FaIdCard },
    { id: 'settings', label: 'Paramètres', icon: FaCog }
  ]

  if (user?.role !== 'admin') {
    return (
      <Layout user={user}>
        <div className="card text-center">
          <p className="text-red-400">Accès non autorisé. Zone administrateur.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">
          Administration CashPays
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setShowBlogForm(false)
                setEditingPost(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4">
              <p className="text-white/70 text-sm">Utilisateurs</p>
              <p className="text-white text-3xl font-bold">{stats.totalUsers || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4">
              <p className="text-white/70 text-sm">Agents</p>
              <p className="text-white text-3xl font-bold">{stats.totalAgents || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-4">
              <p className="text-white/70 text-sm">Volume total</p>
              <p className="text-white text-2xl font-bold">{stats.totalBalance?.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4">
              <p className="text-white/70 text-sm">Transactions</p>
              <p className="text-white text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead className="border-b border-white/20">
                <tr className="text-left text-white/60">
                  <th className="pb-3">Nom</th>
                  <th className="pb-3">Téléphone</th>
                  <th className="pb-3">Province</th>
                  <th className="pb-3">Solde</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role === 'user').map(u => (
                  <tr key={u.id} className="border-b border-white/10">
                    <td className="py-3">{u.fullname}</td>
                    <td className="py-3">{u.phone}</td>
                    <td className="py-3">{u.province}</td>
                    <td className="py-3">{(u.balance || 0).toLocaleString()} FCFA</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                            u.is_active ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {u.is_active ? <FaBan size={10} /> : <FaCheck size={10} />}
                          {u.is_active ? 'Bloquer' : 'Débloquer'}
                        </button>
                        <button
                          onClick={() => recoverUserKey(u.id, u.fullname)}
                          className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1"
                        >
                          <FaKey size={10} /> Clé
                        </button>
                      </div>
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div>
            <button
              onClick={() => setShowAgentModal(true)}
              className="btn-primary mb-4 inline-flex items-center gap-2"
            >
              <FaUserPlus /> Nouvel agent
            </button>
            
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Agence</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} className="border-b border-white/10">
                      <td className="py-3">{a.fullname}</td>
                      <td className="py-3">{a.phone}</td>
                      <td className="py-3">{a.agency_name || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {a.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleUserStatus(a.id, a.is_active)}
                            className={`px-2 py-1 rounded text-xs ${
                              a.is_active ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {a.is_active ? 'Bloquer' : 'Débloquer'}
                          </button>
                          <button
                            onClick={() => recoverUserKey(a.id, a.fullname)}
                            className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400"
                          >
                            <FaKey className="inline mr-1" size={10} /> Clé
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wallet Principal Tab */}
        {activeTab === 'wallet' && (
          <div className="text-center">
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl p-8 mb-6">
              <p className="text-white/80 text-sm">Wallet Principal (Frais 2%)</p>
              <h2 className="text-5xl font-bold text-white my-4">
                {stats.totalBalance ? (stats.totalBalance * 0.02).toLocaleString() : '0'} FCFA
              </h2>
              <p className="text-white/60 text-sm">Frais accumulés sur les transactions</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm">
                💰 Les frais de 2% sur chaque transaction sont automatiquement reversés sur ce wallet.
              </p>
            </div>
          </div>
        )}

        {/* Announce Tab */}
        {activeTab === 'announce' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              try {
                const token = localStorage.getItem('accessToken')
                await axios.post('/api/admin/announce', {
                  title: formData.get('title'),
                  content: formData.get('content'),
                  facebook_link: formData.get('facebook'),
                  whatsapp_link: formData.get('whatsapp'),
                  telegram_link: formData.get('telegram'),
                  website_link: formData.get('website')
                }, { headers: { Authorization: `Bearer ${token}` } })
                toast.success('Annonce publiée')
                e.target.reset()
              } catch (error) {
                toast.error('Erreur lors de la publication')
              }
            }}
            className="space-y-4"
          >
            <input name="title" className="input-field" placeholder="Titre de l'annonce" required />
            <textarea name="content" className="input-field" rows="4" placeholder="Contenu de l'annonce" required />
            <input name="facebook" className="input-field" placeholder="Lien Facebook" />
            <input name="whatsapp" className="input-field" placeholder="Lien WhatsApp" />
            <input name="telegram" className="input-field" placeholder="Lien Telegram" />
            <input name="website" className="input-field" placeholder="Lien Site web" />
            <button type="submit" className="btn-primary w-full">Publier l'annonce</button>
          </form>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div>
            {!showBlogForm ? (
              <>
                <button
                  onClick={() => {
                    setEditingPost(null)
                    setBlogForm({
                      title: '',
                      excerpt: '',
                      content: '',
                      category: 'actualite',
                      tags: '',
                      image_url: '',
                      status: 'published'
                    })
                    setShowBlogForm(true)
                  }}
                  className="btn-primary mb-4 inline-flex items-center gap-2"
                >
                  <FaPlus /> Nouvel article
                </button>

                {blogLoading ? (
                  <div className="flex justify-center py-12">
                    <FaSpinner className="text-white text-4xl animate-spin" />
                  </div>
                ) : blogPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-xl">
                    <FaNewspaper className="text-white/20 text-5xl mx-auto mb-3" />
                    <p className="text-white/50">Aucun article de blog</p>
                    <button
                      onClick={() => {
                        setEditingPost(null)
                        setBlogForm({
                          title: '',
                          excerpt: '',
                          content: '',
                          category: 'actualite',
                          tags: '',
                          image_url: '',
                          status: 'published'
                        })
                        setShowBlogForm(true)
                      }}
                      className="text-blue-400 text-sm mt-2 hover:underline"
                    >
                      Créer le premier article
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead className="border-b border-white/20">
                        <tr className="text-left text-white/60">
                          <th className="pb-3">Titre</th>
                          <th className="pb-3">Catégorie</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Statut</th>
                          <th className="pb-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blogPosts.map((post) => (
                          <tr key={post.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="py-3 max-w-xs">
                              <p className="truncate">{post.title}</p>
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                                {post.category || 'actualite'}
                              </span>
                            </td>
                            <td className="py-3 text-white/60 text-sm">
                              {post.created_at ? new Date(post.created_at).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                post.status === 'published'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {post.status === 'published' ? 'Publié' : 'Brouillon'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditBlogPost(post)}
                                  className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1 hover:bg-blue-500/30"
                                >
                                  <FaEdit size={10} /> Modifier
                                </button>
                                <button
                                  onClick={() => handleDeleteBlogPost(post.id, post.title)}
                                  className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1 hover:bg-red-500/30"
                                >
                                  <FaTrashAlt size={10} /> Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div>
                <button
                  onClick={() => {
                    setShowBlogForm(false)
                    setEditingPost(null)
                  }}
                  className="btn-secondary mb-4 inline-flex items-center gap-2"
                >
                  <FaArrowLeft /> Retour à la liste
                </button>

                <form onSubmit={handleCreateBlogPost} className="space-y-4">
                  <h3 className="text-white text-xl font-semibold mb-4">
                    {editingPost ? 'Modifier l\'article' : 'Nouvel article'}
                  </h3>

                  <div>
                    <label className="label">Titre *</label>
                    <input
                      type="text"
                      name="title"
                      value={blogForm.title}
                      onChange={handleBlogFormChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Extrait *</label>
                    <textarea
                      name="excerpt"
                      value={blogForm.excerpt}
                      onChange={handleBlogFormChange}
                      className="input-field"
                      rows="2"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Contenu *</label>
                    <textarea
                      name="content"
                      value={blogForm.content}
                      onChange={handleBlogFormChange}
                      className="input-field"
                      rows="8"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Catégorie</label>
                      <select
                        name="category"
                        value={blogForm.category}
                        onChange={handleBlogFormChange}
                        className="input-field"
                      >
                        <option value="tutoriel">Tutoriel</option>
                        <option value="actualite">Actualité</option>
                        <option value="securite">Sécurité</option>
                        <option value="promotion">Promotion</option>
                        <option value="opportunite">Opportunité</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Tags (séparés par des virgules)</label>
                      <input
                        type="text"
                        name="tags"
                        value={blogForm.tags}
                        onChange={handleBlogFormChange}
                        className="input-field"
                        placeholder="ex: transfert, argent, tchad"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">URL de l'image</label>
                      <input
                        type="text"
                        name="image_url"
                        value={blogForm.image_url}
                        onChange={handleBlogFormChange}
                        className="input-field"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="label">Statut</label>
                      <select
                        name="status"
                        value={blogForm.status}
                        onChange={handleBlogFormChange}
                        className="input-field"
                      >
                        <option value="published">Publié</option>
                        <option value="draft">Brouillon</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPost}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {savingPost ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}
                    {editingPost ? 'Mettre à jour' : 'Publier'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setKycFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    kycFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setKycFilter('pending')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    kycFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setKycFilter('verified')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    kycFilter === 'verified' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Vérifiés
                </button>
                <button
                  onClick={() => setKycFilter('rejected')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    kycFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Rejetés
                </button>
              </div>
              <button
                onClick={fetchKycRequests}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                <FaSpinner className={`inline mr-1 ${kycLoading ? 'animate-spin' : ''}`} />
                Rafraîchir
              </button>
            </div>

            {kycLoading ? (
              <div className="flex justify-center py-12">
                <FaSpinner className="text-white text-4xl animate-spin" />
              </div>
            ) : kycRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <FaIdCard className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucune demande KYC</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead className="border-b border-white/20">
                    <tr className="text-left text-white/60">
                      <th className="pb-3">Utilisateur</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycRequests.map(req => {
                      const status = getStatusBadge(req.status)
                      const StatusIcon = status.icon
                      return (
                        <tr key={req.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3">
                            <p className="font-medium">{req.fullname}</p>
                            <p className="text-xs text-white/40">{req.id_type?.toUpperCase()} - {req.id_number}</p>
                           </td>
                          <td className="py-3">
                            <p className="text-sm">{req.user_phone}</p>
                            {req.user_email && <p className="text-xs text-white/40">{req.user_email}</p>}
                           </td>
                          <td className="py-3 text-sm">
                            {new Date(req.submitted_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                           </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}>
                              <StatusIcon size={10} /> {status.text}
                            </span>
                           </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedKyc(req)
                                  setShowKycDetailModal(true)
                                }}
                                className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1 hover:bg-blue-500/30"
                              >
                                <FaEye size={10} /> Détails
                              </button>
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleKycAction(req.id, 'approve')}
                                    disabled={processingKyc}
                                    className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1 hover:bg-green-500/30"
                                  >
                                    <FaCheck size={10} /> Valider
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Raison du rejet:')
                                      if (reason) handleKycAction(req.id, 'reject', reason)
                                    }}
                                    disabled={processingKyc}
                                    className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1 hover:bg-red-500/30"
                                  >
                                    <FaTimes size={10} /> Rejeter
                                  </button>
                                </>
                              )}
                            </div>
                           </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <FaCog className="text-white/20 text-5xl mx-auto mb-3 animate-spin-slow" />
            <p className="text-white/50">Paramètres système en cours de développement</p>
          </div>
        )}
      </div>

      {/* MODAL DÉTAILS KYC */}
      {showKycDetailModal && selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaIdCard className="text-blue-400" />
                Détails de la demande KYC
              </h3>
              <button
                onClick={() => {
                  setShowKycDetailModal(false)
                  setSelectedKyc(null)
                }}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Nom complet</p>
                  <p className="text-white font-medium">{selectedKyc.fullname}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Téléphone</p>
                  <p className="text-white font-medium">{selectedKyc.user_phone}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Date de naissance</p>
                  <p className="text-white">{selectedKyc.birth_date || '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Lieu de naissance</p>
                  <p className="text-white">{selectedKyc.birth_place || '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Nationalité</p>
                  <p className="text-white">{selectedKyc.nationality || 'Tchadienne'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Profession</p>
                  <p className="text-white">{selectedKyc.occupation || '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Type de pièce</p>
                  <p className="text-white">{selectedKyc.id_type?.toUpperCase() || 'CNI'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Numéro de pièce</p>
                  <p className="text-white font-mono">{selectedKyc.id_number}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Date de délivrance</p>
                  <p className="text-white">{selectedKyc.id_issue_date || '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Date d'expiration</p>
                  <p className="text-white">{selectedKyc.id_expiry_date || '-'}</p>
                </div>
                <div className="col-span-2 bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Adresse</p>
                  <p className="text-white">{selectedKyc.address}</p>
                </div>
                {selectedKyc.rejection_reason && (
                  <div className="col-span-2 bg-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-xs">Raison du rejet</p>
                    <p className="text-red-300">{selectedKyc.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-white font-semibold mb-3">Documents soumis</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedKyc.documents && selectedKyc.documents.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => downloadKycDocument(doc.id, doc.filename)}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <FaFilePdf className="text-red-400" />
                      <span className="text-white/70 text-sm flex-1 text-left">{doc.document_type}</span>
                      <FaDownload className="text-white/40 text-xs" />
                    </button>
                  ))}
                </div>
              </div>

              {selectedKyc.status === 'pending' && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleKycAction(selectedKyc.id, 'approve')}
                    disabled={processingKyc}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    {processingKyc ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleKycAction(selectedKyc.id, 'reject', reason)
                    }}
                    disabled={processingKyc}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    {processingKyc ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRÉATION D'AGENT (existant) */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaUserPlus className="text-blue-400" />
                Créer un nouvel agent
              </h3>
              <button
                onClick={resetAgentModal}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6">
              {createdAgent ? (
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                      <FaCheckCircle className="text-green-400 text-4xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Agent créé avec succès !</h2>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
                    <p className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <FaShieldAlt /> Informations confidentielles
                    </p>
                    <p className="text-yellow-400/70 text-sm">
                      Ces informations doivent être transmises de manière sécurisée à l'agent.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white/50 text-sm">Nom complet</p>
                        <p className="text-white font-medium">{createdAgent.fullname}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAgent.fullname, 'Nom')} className="text-white/40 hover:text-white">
                        <FaCopy />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white/50 text-sm">Téléphone</p>
                        <p className="text-white font-medium">{createdAgent.phone}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAgent.phone, 'Téléphone')} className="text-white/40 hover:text-white">
                        <FaCopy />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white/50 text-sm">Numéro d'agence</p>
                        <p className="text-white font-mono">{createdAgent.agency_number}</p>
                      </div>
                      <button onClick={() => copyToClipboard(createdAgent.agency_number, 'Numéro d\'agence')} className="text-white/40 hover:text-white">
                        <FaCopy />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white/50 text-sm">Mot de passe</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono text-lg tracking-wider">
                            {showPassword ? agentForm.password : '••••••••'}
                          </p>
                          <button onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white">
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(agentForm.password, 'Mot de passe')} className="text-white/40 hover:text-white">
                        <FaCopy />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <p className="text-white/50 text-sm">Clé privée (6 chiffres)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-mono text-lg tracking-wider">
                            {showPrivateKey ? createdAgent.private_key : '••••••'}
                          </p>
                          <button onClick={() => setShowPrivateKey(!showPrivateKey)} className="text-white/40 hover:text-white">
                            {showPrivateKey ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')} className="text-white/40 hover:text-white">
                        <FaCopy />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button onClick={resetAgentModal} className="btn-primary flex-1">
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateAgent} className="space-y-5">
                  {/* Formulaire agent - identique à avant */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaUserTie className="text-blue-400" /> Informations personnelles
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Nom complet <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          name="fullname"
                          value={agentForm.fullname}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="Ex: Jean NDOUMBE"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Téléphone <span className="text-red-400">*</span></label>
                        <input
                          type="tel"
                          name="phone"
                          value={agentForm.phone}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="8 chiffres (Ex: 66234567)"
                          maxLength="8"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Province <span className="text-red-400">*</span></label>
                        <select
                          name="province"
                          value={agentForm.province}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          required
                        >
                          <option value="">Sélectionnez une province</option>
                          {provinces.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaKey className="text-blue-400" /> Sécurité
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Mot de passe <span className="text-red-400">*</span></label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={agentForm.password}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="Au moins 4 caractères"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Confirmer le mot de passe <span className="text-red-400">*</span></label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={agentForm.confirmPassword}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="Répétez le mot de passe"
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-blue-400 text-sm flex items-center gap-1"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                        {showPassword ? 'Masquer' : 'Afficher'} le mot de passe
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FaBuilding className="text-blue-400" /> Informations de l'agence
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Nom de l'agence <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          name="agency_name"
                          value={agentForm.agency_name}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="Ex: Agence CashPays Moursal"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Adresse de l'agence <span className="text-red-400">*</span></label>
                        <textarea
                          name="agency_address"
                          value={agentForm.agency_address}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          rows="2"
                          placeholder="Adresse complète"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Téléphone de l'agence (optionnel)</label>
                        <input
                          type="tel"
                          name="agency_phone"
                          value={agentForm.agency_phone}
                          onChange={handleAgentFormChange}
                          className="input-field"
                          placeholder="Numéro de l'agence"
                          maxLength="8"
                        />
                      </div>

                      <div>
                        <label className="label">Type d'agence</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="agency_type"
                              value="principale"
                              checked={agentForm.agency_type === 'principale'}
                              onChange={handleAgentFormChange}
                              className="w-4 h-4"
                            />
                            <span className="text-white">Principale</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="agency_type"
                              value="secondaire"
                              checked={agentForm.agency_type === 'secondaire'}
                              onChange={handleAgentFormChange}
                              className="w-4 h-4"
                            />
                            <span className="text-white">Secondaire</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={resetAgentModal} className="btn-secondary flex-1">
                      Annuler
                    </button>
                    <button type="submit" disabled={creatingAgent} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {creatingAgent ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FaCheckCircle /> Créer l'agent
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminPanel