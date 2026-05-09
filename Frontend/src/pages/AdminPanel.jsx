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
  FaDownload, FaEnvelope, FaUserCheck, FaUserTimes, FaInfoCircle,
  FaFilePdf, FaFileAlt, FaQuestionCircle, FaUserCog, FaUserShield
} from 'react-icons/fa'
import Layout from '../components/Layout'
import AgentApplicationsManager from '../components/AgentApplicationsManager'
import AdminPinManagement from '../components/AdminPinManagement'

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
  const [showKycApprovalModal, setShowKycApprovalModal] = useState(false)
  const [kycAction, setKycAction] = useState(null)
  const [kycRejectionReason, setKycRejectionReason] = useState('')
  const [kycFilter, setKycFilter] = useState('all')
  const [processingKyc, setProcessingKyc] = useState(false)
  
  // États pour le modal de création d'utilisateur
  const [showUserModal, setShowUserModal] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [userForm, setUserForm] = useState({
    phone: '',
    fullname: '',
    password: '',
    confirmPassword: '',
    email: '',
    province: '',
    city: '',
    address: '',
    role: 'user'
  })
  
  // États pour le modal de création d'agent
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [createdAgent, setCreatedAgent] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
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
  const [provinces, setProvinces] = useState([])

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

  // Gestion des utilisateurs
  const handleUserFormChange = (e) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value })
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (userForm.password !== userForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (userForm.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }
    
    if (!/^\d{8}$/.test(userForm.phone)) {
      toast.error('Le numéro de téléphone doit contenir 8 chiffres')
      return
    }
    
    if (!userForm.fullname) {
      toast.error('Le nom complet est requis')
      return
    }
    
    if (!userForm.province) {
      toast.error('La province est requise')
      return
    }
    
    setCreatingUser(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/admin/users', {
        phone: userForm.phone,
        fullname: userForm.fullname,
        password: userForm.password,
        email: userForm.email,
        province: userForm.province,
        city: userForm.city,
        address: userForm.address,
        role: userForm.role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setCreatedUser(response.data.user)
      toast.success('Utilisateur créé avec succès !')
      
      setUserForm({
        phone: '',
        fullname: '',
        password: '',
        confirmPassword: '',
        email: '',
        province: '',
        city: '',
        address: '',
        role: 'user'
      })
      
      fetchAdminData()
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création de l\'utilisateur')
    } finally {
      setCreatingUser(false)
    }
  }

  const resetUserModal = () => {
    setShowUserModal(false)
    setCreatedUser(null)
    setUserForm({
      phone: '',
      fullname: '',
      password: '',
      confirmPassword: '',
      email: '',
      province: '',
      city: '',
      address: '',
      role: 'user'
    })
    setShowUserPassword(false)
  }

  // Gestion des agents
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
    { id: 'agent-applications', label: 'Candidatures Agents', icon: FaUserCheck },
    { id: 'pin-management', label: 'Gestion PIN', icon: FaKey },
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
                  ? 'bg-primary-500 text-white'
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

        {/* Users Tab - Ajout d'utilisateurs */}
        {activeTab === 'users' && (
          <div>
            <button
              onClick={() => setShowUserModal(true)}
              className="btn-primary mb-4 inline-flex items-center gap-2"
            >
              <FaUserPlus /> Nouvel utilisateur
            </button>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Rôle</th>
                    <th className="pb-3">Province</th>
                    <th className="pb-3">Solde</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/10">
                      <td className="py-3 text-white">{u.fullname}</td>
                      <td className="py-3 text-white/80">{u.phone}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          u.role === 'agent' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'agent' ? 'Agent' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="py-3 text-white/80">{u.province}</td>
                      <td className="py-3 text-white">{(u.balance || 0).toLocaleString()} FCFA</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agents Tab - Ajout d'agents */}
        {activeTab === 'agents' && (
          <div>
            <button
              onClick={() => setShowAgentModal(true)}
              className="btn-primary mb-4 inline-flex items-center gap-2"
            >
              <FaUserPlus /> Nouvel agent
            </button>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Agence</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} className="border-b border-white/10">
                      <td className="py-3 text-white">{a.fullname}</td>
                      <td className="py-3 text-white/80">{a.phone}</td>
                      <td className="py-3 text-white/80">{a.agency_name || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {a.is_active ? 'Actif' : 'Inactif'}
                        </span>
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
                {stats.totalBalance ? Math.floor(stats.totalBalance * 0.02).toLocaleString() : '0'} FCFA
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg">Articles du blog</h3>
              <button
                onClick={() => { setShowBlogForm(true); setEditingPost(null); setBlogForm({ title: '', excerpt: '', content: '', category: 'actualite', tags: '', image_url: '', status: 'published' }) }}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                <FaPlus /> Nouvel article
              </button>
            </div>

            {blogLoading ? (
              <div className="flex justify-center py-12"><FaSpinner className="text-white text-4xl animate-spin" /></div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <FaNewspaper className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucun article. Créez le premier !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blogPosts.map(post => (
                  <div key={post.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{post.title}</p>
                      <p className="text-white/50 text-sm">{new Date(post.created_at).toLocaleDateString('fr-FR')} • {post.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditBlogPost(post)} className="text-blue-400 hover:text-blue-300"><FaEdit /></button>
                      <button onClick={() => handleDeleteBlogPost(post.id, post.title)} className="text-red-400 hover:text-red-300"><FaTrashAlt /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button onClick={() => { setKycFilter('all'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/60'}`}>Toutes</button>
                <button onClick={() => { setKycFilter('pending'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/60'}`}>En attente</button>
                <button onClick={() => { setKycFilter('verified'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'verified' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'}`}>Vérifiés</button>
                <button onClick={() => { setKycFilter('rejected'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'}`}>Rejetés</button>
              </div>
            </div>

            {kycLoading ? (
              <div className="flex justify-center py-12"><FaSpinner className="text-white text-4xl animate-spin" /></div>
            ) : kycRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl"><FaIdCard className="text-white/20 text-5xl mx-auto mb-3" /><p className="text-white/50">Aucune demande KYC</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/20">
                    <tr className="text-left text-white/60">
                      <th className="pb-3">Utilisateur</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycRequests.map(req => {
                      const status = getStatusBadge(req.status)
                      const StatusIcon = status.icon
                      return (
                        <tr key={req.id} className="border-b border-white/10">
                          <td className="py-3 text-white">
                            <p className="font-medium">{req.fullname}</p>
                            <p className="text-xs text-white/40">{req.id_type?.toUpperCase()} - {req.id_number}</p>
                          </td>
                          <td className="py-3 text-white/80"><p className="text-sm">{req.user_phone}</p></td>
                          <td className="py-3 text-white/60 text-sm">{new Date(req.submitted_at).toLocaleDateString('fr-FR')}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}>
                              <StatusIcon size={10} /> {status.text}
                            </span>
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

        {/* Agent Applications Tab */}
        {activeTab === 'agent-applications' && <AgentApplicationsManager />}

        {/* PIN Management Tab */}
        {activeTab === 'pin-management' && <AdminPinManagement />}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="text-center py-12"><FaCog className="text-white/20 text-5xl mx-auto mb-3 animate-spin-slow" /><p className="text-white/50">Paramètres système en cours de développement</p></div>
        )}
      </div>

      {/* MODAL CRÉATION D'UTILISATEUR */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto animate-fade-in">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaUserPlus className="text-primary-500" /> Créer un utilisateur
              </h3>
              <button onClick={resetUserModal} className="text-white/60 hover:text-white transition-all"><FaTimes size={20} /></button>
            </div>
            
            <div className="p-6">
              {createdUser ? (
                <div className="text-center">
                  <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                    <FaCheckCircle className="text-green-400 text-4xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Utilisateur créé !</h2>
                  <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdUser.fullname}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdUser.phone}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Rôle :</span><span className="text-white">{createdUser.role}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{userForm.password}</span><button onClick={() => copyToClipboard(userForm.password, 'Mot de passe')} className="text-primary-400 hover:text-primary-300"><FaCopy /></button></div>
                    <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdUser.private_key}</span><button onClick={() => copyToClipboard(createdUser.private_key, 'Clé privée')} className="text-primary-400 hover:text-primary-300"><FaCopy /></button></div>
                  </div>
                  <button onClick={resetUserModal} className="btn-primary w-full">Fermer</button>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="label">Nom complet *</label>
                    <input type="text" name="fullname" value={userForm.fullname} onChange={handleUserFormChange} className="input-field" required />
                  </div>
                  <div>
                    <label className="label">Téléphone (8 chiffres) *</label>
                    <input type="tel" name="phone" value={userForm.phone} onChange={handleUserFormChange} className="input-field" maxLength="8" required />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Mot de passe *</label>
                    <div className="relative">
                      <input type={showUserPassword ? 'text' : 'password'} name="password" value={userForm.password} onChange={handleUserFormChange} className="input-field pr-10" required />
                      <button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"><FaEye /></button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirmer le mot de passe *</label>
                    <input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="input-field" required />
                  </div>
                  <div>
                    <label className="label">Province *</label>
                    <select name="province" value={userForm.province} onChange={handleUserFormChange} className="input-field" required>
                      <option value="">Sélectionnez une province</option>
                      {provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Ville</label>
                    <input type="text" name="city" value={userForm.city} onChange={handleUserFormChange} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Adresse</label>
                    <textarea name="address" value={userForm.address} onChange={handleUserFormChange} className="input-field" rows="2" />
                  </div>
                  <div>
                    <label className="label">Rôle</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2"><input type="radio" name="role" value="user" checked={userForm.role === 'user'} onChange={handleUserFormChange} /><span>Utilisateur</span></label>
                      <label className="flex items-center gap-2"><input type="radio" name="role" value="admin" checked={userForm.role === 'admin'} onChange={handleUserFormChange} /><span>Administrateur</span></label>
                    </div>
                  </div>
                  <button type="submit" disabled={creatingUser} className="btn-primary w-full flex items-center justify-center gap-2">
                    {creatingUser ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />} {creatingUser ? 'Création...' : 'Créer l\'utilisateur'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION D'AGENT */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto animate-fade-in">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaUserTie className="text-primary-500" /> Créer un agent
              </h3>
              <button onClick={resetAgentModal} className="text-white/60 hover:text-white transition-all"><FaTimes size={20} /></button>
            </div>
            
            <div className="p-6">
              {createdAgent ? (
                <div className="text-center">
                  <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                    <FaCheckCircle className="text-green-400 text-4xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Agent créé !</h2>
                  <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdAgent.fullname}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdAgent.phone}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Numéro agent :</span><span className="text-white font-mono">{createdAgent.agent_number}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Agence :</span><span className="text-white">{agentForm.agency_name}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{agentForm.password}</span><button onClick={() => copyToClipboard(agentForm.password, 'Mot de passe')} className="text-primary-400 hover:text-primary-300"><FaCopy /></button></div>
                    <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdAgent.private_key}</span><button onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')} className="text-primary-400 hover:text-primary-300"><FaCopy /></button></div>
                  </div>
                  <button onClick={resetAgentModal} className="btn-primary w-full">Fermer</button>
                </div>
              ) : (
                <form onSubmit={handleCreateAgent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Nom complet *</label><input type="text" name="fullname" value={agentForm.fullname} onChange={handleAgentFormChange} className="input-field" required /></div>
                    <div><label className="label">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="input-field" maxLength="8" required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Mot de passe *</label><div className="relative"><input type={showPassword ? 'text' : 'password'} name="password" value={agentForm.password} onChange={handleAgentFormChange} className="input-field pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"><FaEye /></button></div></div>
                    <div><label className="label">Confirmer *</label><input type="password" name="confirmPassword" value={agentForm.confirmPassword} onChange={handleAgentFormChange} className="input-field" required /></div>
                  </div>
                  <div><label className="label">Province *</label><select name="province" value={agentForm.province} onChange={handleAgentFormChange} className="input-field" required><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                  <div className="border-t border-white/10 pt-3"><h4 className="text-white font-semibold mb-3">Informations de l'agence</h4></div>
                  <div><label className="label">Nom de l'agence *</label><input type="text" name="agency_name" value={agentForm.agency_name} onChange={handleAgentFormChange} className="input-field" required /></div>
                  <div><label className="label">Adresse de l'agence *</label><textarea name="agency_address" value={agentForm.agency_address} onChange={handleAgentFormChange} className="input-field" rows="2" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Téléphone agence</label><input type="tel" name="agency_phone" value={agentForm.agency_phone} onChange={handleAgentFormChange} className="input-field" placeholder="Optionnel" /></div>
                    <div><label className="label">Type d'agence</label><select name="agency_type" value={agentForm.agency_type} onChange={handleAgentFormChange} className="input-field"><option value="principale">Principale</option><option value="secondaire">Secondaire</option></select></div>
                  </div>
                  <button type="submit" disabled={creatingAgent} className="btn-primary w-full flex items-center justify-center gap-2">
                    {creatingAgent ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />} {creatingAgent ? 'Création...' : 'Créer l\'agent'}
                  </button>
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