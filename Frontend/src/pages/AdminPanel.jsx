// src/pages/AdminPanel.jsx - Version complète finale
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUsers, FaUserTie, FaMoneyBillWave, FaChartLine, FaBell, 
  FaCog, FaKey, FaUserPlus, FaTimes, FaEye, FaEyeSlash, FaClock,
  FaBuilding, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaShieldAlt,
  FaCopy, FaBan, FaCheck, FaTrashAlt, FaEdit, FaPlus, FaNewspaper,
  FaSave, FaArrowLeft, FaImage, FaIdCard, FaTag, FaCalendarAlt,
  FaDownload, FaEnvelope, FaUserCheck, FaUserTimes, FaInfoCircle,
  FaFilePdf, FaFileAlt, FaUser, FaQuestionCircle, FaUserCog, FaUserShield, FaLandmark,
  FaSync, FaLock, FaUnlockAlt, FaTimesCircle, FaUndo, FaSearch, FaFilter
} from 'react-icons/fa'
import Layout from '../components/Layout'
import AgentApplicationsManager from '../components/AgentApplicationsManager'
import AdminPinManagement from '../components/AdminPinManagement'
import AdminTaxes from './AdminTaxes'

function AdminPanel({ user, socket }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  
  // États pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // États pour les modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showEditAgentModal, setShowEditAgentModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [passwordResetResult, setPasswordResetResult] = useState(null)
  
  // États pour la réinitialisation de clé
  const [showResetKeyModal, setShowResetKeyModal] = useState(false)
  const [selectedUserForReset, setSelectedUserForReset] = useState(null)
  const [resettingKey, setResettingKey] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  
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
  
  // États pour les formulaires
  const [creatingUser, setCreatingUser] = useState(false)
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const [createdAgent, setCreatedAgent] = useState(null)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
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
  
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    phone: '',
    fullname: '',
    email: '',
    province: '',
    city: '',
    address: '',
    role: '',
    is_active: true
  })
  
  const [editAgentForm, setEditAgentForm] = useState({
    id: '',
    phone: '',
    fullname: '',
    province: '',
    agency_name: '',
    agency_address: '',
    agency_phone: '',
    agency_type: '',
    is_active: true
  })
  
  const [provinces, setProvinces] = useState([])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData()
      fetchProvinces()
      fetchKycRequests()
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

  // ============================================
  // GESTION DES UTILISATEURS
  // ============================================
  
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
        phone: '', fullname: '', password: '', confirmPassword: '', email: '', 
        province: '', city: '', address: '', role: 'user'
      })
      
      fetchAdminData()
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setCreatingUser(false)
    }
  }

  const openEditUserModal = (user) => {
    setEditUserForm({
      id: user.id,
      phone: user.phone,
      fullname: user.fullname,
      email: user.email || '',
      province: user.province,
      city: user.city || '',
      address: user.address || '',
      role: user.role,
      is_active: user.is_active === 1
    })
    setShowEditUserModal(true)
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/users/${editUserForm.id}`, {
        fullname: editUserForm.fullname,
        email: editUserForm.email,
        province: editUserForm.province,
        city: editUserForm.city,
        address: editUserForm.address,
        role: editUserForm.role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Utilisateur modifié')
      setShowEditUserModal(false)
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification')
    }
  }

  const toggleUserStatus = async (userId, currentStatus, userName) => {
    const action = currentStatus ? 'bloquer' : 'débloquer'
    if (!window.confirm(`${action} l'utilisateur "${userName}" ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/users/${userId}/toggle-status`, {
        is_active: !currentStatus
      }, { headers: { Authorization: `Bearer ${token}` } })
      
      toast.success(`Utilisateur ${action === 'bloquer' ? 'bloqué' : 'débloqué'}`)
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du changement de statut')
    }
  }

  // Réinitialisation mot de passe
  const openResetPasswordModal = (user) => {
    setSelectedUser(user)
    setPasswordResetResult(null)
    setShowResetPasswordModal(true)
  }

  const confirmResetPassword = async () => {
    if (!selectedUser) return
    
    setResettingPassword(true)
    const token = localStorage.getItem('accessToken')
    
    try {
      const response = await axios.post(`/api/admin/users/${selectedUser.id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        const newPass = response.data.new_password
        
        setPasswordResetResult({
          new_password: newPass,
          user_name: selectedUser.fullname,
          user_phone: selectedUser.phone
        })
        
        toast.success(`🔐 Mot de passe réinitialisé pour ${selectedUser.fullname}`)
        fetchAdminData()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la réinitialisation')
      setShowResetPasswordModal(false)
      setSelectedUser(null)
    } finally {
      setResettingPassword(false)
    }
  }

  const closePasswordResetModal = () => {
    setShowResetPasswordModal(false)
    setSelectedUser(null)
    setPasswordResetResult(null)
  }

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Supprimer définitivement "${userName}" ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Utilisateur supprimé')
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  // ============================================
  // GESTION DES AGENTS
  // ============================================
  
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
        phone: '', fullname: '', password: '', confirmPassword: '', province: '',
        agency_name: '', agency_address: '', agency_phone: '', agency_type: 'secondaire'
      })
      
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setCreatingAgent(false)
    }
  }

  const openEditAgentModal = (agent) => {
    setEditAgentForm({
      id: agent.id,
      phone: agent.phone,
      fullname: agent.fullname,
      province: agent.province,
      agency_name: agent.agency_name || '',
      agency_address: agent.agency_address || '',
      agency_phone: agent.agency_phone || '',
      agency_type: agent.agency_type || 'secondaire',
      is_active: agent.is_active === 1
    })
    setShowEditAgentModal(true)
  }

  const handleEditAgent = async (e) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/agents/${editAgentForm.id}`, {
        fullname: editAgentForm.fullname,
        province: editAgentForm.province,
        agency_name: editAgentForm.agency_name,
        agency_address: editAgentForm.agency_address,
        agency_phone: editAgentForm.agency_phone,
        agency_type: editAgentForm.agency_type
      }, { headers: { Authorization: `Bearer ${token}` } })
      
      toast.success('Agent modifié')
      setShowEditAgentModal(false)
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification')
    }
  }

  const toggleAgentStatus = async (agentId, currentStatus, agentName) => {
    const action = currentStatus ? 'bloquer' : 'débloquer'
    if (!window.confirm(`${action} l'agent "${agentName}" ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/agents/${agentId}/toggle-status`, { is_active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success(`Agent ${action === 'bloquer' ? 'bloqué' : 'débloqué'}`)
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du changement de statut')
    }
  }

  const deleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`Supprimer définitivement l'agent "${agentName}" ?`)) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/admin/agents/${agentId}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Agent supprimé')
      fetchAdminData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  // ============================================
  // RÉINITIALISATION CLÉ PRIVÉE
  // ============================================
  const handleResetPrivateKey = (userId, userType, userName, userPhone) => {
    setSelectedUserForReset({ id: userId, type: userType, name: userName, phone: userPhone })
    setShowResetKeyModal(true)
  }

  const confirmResetKey = async () => {
    if (!selectedUserForReset) return
    
    setResettingKey(true)
    const token = localStorage.getItem('accessToken')
    
    try {
      const response = await axios.post(`/api/admin/users/${selectedUserForReset.id}/reset-key`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setResetResult({
          new_private_key: response.data.new_private_key,
          user_name: selectedUserForReset.name,
          user_phone: selectedUserForReset.phone
        })
        toast.success(`🔑 Clé privée réinitialisée pour ${selectedUserForReset.name}`)
        fetchAdminData()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la réinitialisation')
      setShowResetKeyModal(false)
      setSelectedUserForReset(null)
    } finally {
      setResettingKey(false)
    }
  }

  const closeResetModal = () => {
    setShowResetKeyModal(false)
    setSelectedUserForReset(null)
    setResetResult(null)
  }

  const copyNewKey = () => {
    if (resetResult?.new_private_key) {
      navigator.clipboard.writeText(resetResult.new_private_key)
      toast.success('Nouvelle clé copiée !')
    }
  }

  // ============================================
  // GESTION KYC
  // ============================================
  const handleViewKycDetail = (kyc) => {
    setSelectedKyc(kyc)
    setShowKycDetailModal(true)
  }

  const handleApproveKyc = async (kycId) => {
    if (!window.confirm('Approuver cette demande KYC ?')) return
    
    setProcessingKyc(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/kyc/verify/${kycId}`, 
        { action: 'approve', level: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Demande KYC approuvée')
      fetchKycRequests()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'approbation')
    } finally {
      setProcessingKyc(false)
    }
  }

  const handleRejectKyc = async (kycId) => {
    const reason = prompt('Motif du rejet:')
    if (!reason) return
    
    setProcessingKyc(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/kyc/verify/${kycId}`, 
        { action: 'reject', rejection_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Demande KYC rejetée')
      fetchKycRequests()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du rejet')
    } finally {
      setProcessingKyc(false)
    }
  }

  // ============================================
  // GESTION BLOG
  // ============================================
  const handleEditBlogPost = (post) => {
    setEditingPost(post)
    setBlogForm({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      category: post.category,
      tags: post.tags || '',
      image_url: post.image_url || '',
      status: post.status
    })
    setShowBlogForm(true)
  }

  const handleDeleteBlogPost = async (id, title) => {
    if (!window.confirm(`Supprimer l'article "${title}" ?`)) return
    const token = localStorage.getItem('accessToken')
    try {
      await axios.delete(`/api/blog/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Article supprimé')
      fetchBlogPosts()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleSaveBlogPost = async (e) => {
    e.preventDefault()
    setSavingPost(true)
    const token = localStorage.getItem('accessToken')
    
    try {
      if (editingPost) {
        await axios.put(`/api/blog/posts/${editingPost.id}`, blogForm, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Article modifié')
      } else {
        await axios.post('/api/blog/posts', blogForm, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Article créé')
      }
      setShowBlogForm(false)
      setEditingPost(null)
      setBlogForm({ title: '', excerpt: '', content: '', category: 'actualite', tags: '', image_url: '', status: 'published' })
      fetchBlogPosts()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingPost(false)
    }
  }

  // Filtrage des utilisateurs
  const getFilteredUsers = () => {
    let filtered = [...users]
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
      )
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter)
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => statusFilter === 'active' ? u.is_active : !u.is_active)
    }
    return filtered
  }

  const resetUserModal = () => {
    setShowUserModal(false)
    setCreatedUser(null)
    setUserForm({
      phone: '', fullname: '', password: '', confirmPassword: '', email: '', 
      province: '', city: '', address: '', role: 'user'
    })
    setShowUserPassword(false)
  }

  const resetAgentModal = () => {
    setShowAgentModal(false)
    setCreatedAgent(null)
    setAgentForm({
      phone: '', fullname: '', password: '', confirmPassword: '', province: '',
      agency_name: '', agency_address: '', agency_phone: '', agency_type: 'secondaire'
    })
    setShowPassword(false)
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié !`)
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'verified': return { color: 'bg-green-500/20 text-green-400', text: 'Vérifié', icon: FaCheckCircle }
      case 'pending': return { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente', icon: FaClock }
      case 'rejected': return { color: 'bg-red-500/20 text-red-400', text: 'Rejeté', icon: FaTimes }
      default: return { color: 'bg-gray-500/20 text-gray-400', text: 'Non soumis', icon: FaIdCard }
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
    { id: 'taxes', label: 'Gestion des Taxes', icon: FaLandmark },
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

  const filteredUsers = getFilteredUsers()

  return (
    <Layout user={user} socket={socket}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Administration CashPays</h2>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setShowBlogForm(false)
                setEditingPost(null)
                setShowKycDetailModal(false)
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <button onClick={() => setShowUserModal(true)} className="btn-primary mb-4 inline-flex items-center gap-2">
              <FaUserPlus /> Nouvel utilisateur
            </button>
            
            {/* Filtres */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-gray-700 text-white">
                  <option value="all">Tous les rôles</option>
                  <option value="user">Utilisateurs</option>
                  <option value="agent">Agents</option>
                  <option value="admin">Administrateurs</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-gray-700 text-white">
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
                <div className="text-right text-white/50 text-sm">{filteredUsers.length} utilisateur(s)</div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th><th className="pb-3">Téléphone</th><th className="pb-3">Rôle</th>
                    <th className="pb-3">Province</th><th className="pb-3">Solde</th><th className="pb-3">Statut</th><th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/10">
                      <td className="py-3 text-white">{u.fullname}</td>
                      <td className="py-3 text-white/80">{u.phone}</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{u.role === 'admin' ? 'Admin' : u.role === 'agent' ? 'Agent' : 'Utilisateur'}</span></td>
                      <td className="py-3 text-white/80">{u.province}</td>
                      <td className="py-3 text-white">{(u.balance || 0).toLocaleString()} FCFA</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Actif' : 'Inactif'}</span></td>
                      <td className="py-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <button onClick={() => openEditUserModal(u)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400" title="Modifier"><FaEdit size={14} /></button>
                          <button onClick={() => openResetPasswordModal(u)} className="p-1.5 rounded-lg bg-green-500/20 text-green-400" title="Réinitialiser mot de passe"><FaUndo size={14} /></button>
                          <button onClick={() => handleResetPrivateKey(u.id, u.role, u.fullname, u.phone)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400" title="Réinitialiser clé privée"><FaSync size={14} /></button>
                          <button onClick={() => toggleUserStatus(u.id, u.is_active, u.fullname)} className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400" title={u.is_active ? 'Bloquer' : 'Débloquer'}>{u.is_active ? <FaBan size={14} /> : <FaUnlockAlt size={14} />}</button>
                          <button onClick={() => deleteUser(u.id, u.fullname)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400" title="Supprimer"><FaTrashAlt size={14} /></button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div>
            <button onClick={() => setShowAgentModal(true)} className="btn-primary mb-4 inline-flex items-center gap-2">
              <FaUserPlus /> Nouvel agent
            </button>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th><th className="pb-3">Téléphone</th><th className="pb-3">Agence</th>
                    <th className="pb-3">Province</th><th className="pb-3">Statut</th><th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} className="border-b border-white/10">
                      <td className="py-3 text-white">{a.fullname}</td>
                      <td className="py-3 text-white/80">{a.phone}</td>
                      <td className="py-3 text-white/80">{a.agency_name || '-'}</td>
                      <td className="py-3 text-white/80">{a.province}</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{a.is_active ? 'Actif' : 'Inactif'}</span></td>
                      <td className="py-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <button onClick={() => openEditAgentModal(a)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400"><FaEdit size={14} /></button>
                          <button onClick={() => openResetPasswordModal({ ...a, role: 'agent' })} className="p-1.5 rounded-lg bg-green-500/20 text-green-400"><FaUndo size={14} /></button>
                          <button onClick={() => handleResetPrivateKey(a.id, a.role, a.fullname, a.phone)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400"><FaSync size={14} /></button>
                          <button onClick={() => toggleAgentStatus(a.id, a.is_active, a.fullname)} className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400">{a.is_active ? <FaBan size={14} /> : <FaUnlockAlt size={14} />}</button>
                          <button onClick={() => deleteAgent(a.id, a.fullname)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><FaTrashAlt size={14} /></button>
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
              <h2 className="text-5xl font-bold text-white my-4">{stats.totalBalance ? Math.floor(stats.totalBalance * 0.02).toLocaleString() : '0'} FCFA</h2>
              <p className="text-white/60 text-sm">Frais accumulés sur les transactions</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4"><p className="text-white/70 text-sm">💰 Les frais de 2% sur chaque transaction sont automatiquement reversés sur ce wallet.</p></div>
          </div>
        )}

        {/* Announce Tab */}
        {activeTab === 'announce' && (
          <form onSubmit={async (e) => {
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
            } catch (error) { toast.error('Erreur lors de la publication') }
          }} className="space-y-4">
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
              <button onClick={() => { setShowBlogForm(true); setEditingPost(null); setBlogForm({ title: '', excerpt: '', content: '', category: 'actualite', tags: '', image_url: '', status: 'published' }) }} className="btn-primary inline-flex items-center gap-2 text-sm"><FaPlus /> Nouvel article</button>
            </div>

            {showBlogForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                <div className="relative max-w-2xl w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-primary-500/30">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{editingPost ? 'Modifier' : 'Nouvel'} article</h3>
                    <button onClick={() => setShowBlogForm(false)} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
                  </div>
                  <form onSubmit={handleSaveBlogPost} className="p-6 space-y-4">
                    <div><label className="label">Titre *</label><input type="text" value={blogForm.title} onChange={(e) => setBlogForm({...blogForm, title: e.target.value})} className="input-field" required /></div>
                    <div><label className="label">Extrait</label><textarea value={blogForm.excerpt} onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})} className="input-field" rows="2" /></div>
                    <div><label className="label">Contenu *</label><textarea value={blogForm.content} onChange={(e) => setBlogForm({...blogForm, content: e.target.value})} className="input-field" rows="6" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="label">Catégorie</label><select value={blogForm.category} onChange={(e) => setBlogForm({...blogForm, category: e.target.value})} className="input-field"><option value="actualite">Actualité</option><option value="promotion">Promotion</option><option value="guide">Guide</option><option value="annonce">Annonce</option></select></div>
                      <div><label className="label">Tags</label><input type="text" value={blogForm.tags} onChange={(e) => setBlogForm({...blogForm, tags: e.target.value})} className="input-field" placeholder="tag1, tag2" /></div>
                    </div>
                    <div><label className="label">URL de l'image</label><input type="url" value={blogForm.image_url} onChange={(e) => setBlogForm({...blogForm, image_url: e.target.value})} className="input-field" placeholder="https://..." /></div>
                    <div><label className="label">Statut</label><select value={blogForm.status} onChange={(e) => setBlogForm({...blogForm, status: e.target.value})} className="input-field"><option value="draft">Brouillon</option><option value="published">Publié</option></select></div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowBlogForm(false)} className="flex-1 btn-secondary">Annuler</button>
                      <button type="submit" disabled={savingPost} className="flex-1 btn-primary">{savingPost ? 'Enregistrement...' : (editingPost ? 'Modifier' : 'Publier')}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {blogLoading ? (
              <div className="flex justify-center py-12"><div className="text-white/60">Chargement...</div></div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <FaNewspaper className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucun article. Créez le premier !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blogPosts.map(post => (
                  <div key={post.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div className="flex-1">
                      <p className="text-white font-medium">{post.title}</p>
                      <p className="text-white/50 text-sm">{new Date(post.created_at).toLocaleDateString('fr-FR')} • {post.category} • {post.status === 'published' ? '📢 Publié' : '📝 Brouillon'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditBlogPost(post)} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><FaEdit /></button>
                      <button onClick={() => handleDeleteBlogPost(post.id, post.title)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><FaTrashAlt /></button>
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
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setKycFilter('all'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/60'}`}>Toutes</button>
              <button onClick={() => { setKycFilter('pending'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/60'}`}>En attente</button>
              <button onClick={() => { setKycFilter('verified'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'verified' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'}`}>Vérifiés</button>
              <button onClick={() => { setKycFilter('rejected'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'}`}>Rejetés</button>
            </div>

            {kycLoading ? (
              <div className="flex justify-center py-12"><div className="text-white/60">Chargement...</div></div>
            ) : kycRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl"><FaIdCard className="text-white/20 text-5xl mx-auto mb-3" /><p className="text-white/50">Aucune demande KYC</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/20">
                    <tr className="text-left text-white/60">
                      <th className="pb-3">Utilisateur</th><th className="pb-3">Contact</th><th className="pb-3">Type</th><th className="pb-3">Date</th><th className="pb-3">Statut</th><th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycRequests.map(req => {
                      const status = getStatusBadge(req.status)
                      const StatusIcon = status.icon
                      return (
                        <tr key={req.id} className="border-b border-white/10">
                          <td className="py-3"><p className="text-white font-medium">{req.fullname}</p><p className="text-xs text-white/40">{req.id_type?.toUpperCase()}</p></td>
                          <td className="py-3 text-white/80">{req.user_phone}</td>
                          <td className="py-3 text-white/80">{req.id_type?.toUpperCase() || '-'}</td>
                          <td className="py-3 text-white/60 text-sm">{new Date(req.submitted_at).toLocaleDateString('fr-FR')}</td>
                          <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}><StatusIcon size={10} /> {status.text}</span></td>
                          <td className="py-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleViewKycDetail(req)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400" title="Voir détails"><FaEye size={14} /></button>
                              {req.status === 'pending' && (
                                <>
                                  <button onClick={() => handleApproveKyc(req.id)} disabled={processingKyc} className="p-1.5 rounded-lg bg-green-500/20 text-green-400"><FaCheckCircle size={14} /></button>
                                  <button onClick={() => handleRejectKyc(req.id)} disabled={processingKyc} className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><FaTimesCircle size={14} /></button>
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

        {/* Taxes Tab */}
        {activeTab === 'taxes' && <AdminTaxes user={user} />}

        {/* Agent Applications Tab */}
        {activeTab === 'agent-applications' && <AgentApplicationsManager />}

        {/* PIN Management Tab */}
        {activeTab === 'pin-management' && <AdminPinManagement />}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="text-center py-12"><FaCog className="text-white/20 text-5xl mx-auto mb-3" /><p className="text-white/50">Paramètres système en cours de développement</p></div>
        )}
      </div>

      {/* MODAL CRÉATION D'UTILISATEUR */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-blue-900/95 p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaUserPlus className="text-primary-500" /> Créer un utilisateur</h3>
              <button onClick={resetUserModal} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              {createdUser ? (
                <div className="text-center">
                  <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                  <h2 className="text-2xl font-bold text-white mb-4">Utilisateur créé !</h2>
                  <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdUser.fullname}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdUser.phone}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Rôle :</span><span className="text-white">{createdUser.role}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{userForm.password}</span><button onClick={() => copyToClipboard(userForm.password, 'Mot de passe')} className="text-primary-400"><FaCopy /></button></div>
                    <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdUser.private_key}</span><button onClick={() => copyToClipboard(createdUser.private_key, 'Clé privée')} className="text-primary-400"><FaCopy /></button></div>
                  </div>
                  <button onClick={resetUserModal} className="btn-primary w-full">Fermer</button>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div><label className="label">Nom complet *</label><input type="text" name="fullname" value={userForm.fullname} onChange={handleUserFormChange} className="input-field" required /></div>
                  <div><label className="label">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={userForm.phone} onChange={handleUserFormChange} className="input-field" maxLength="8" required /></div>
                  <div><label className="label">Email</label><input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="input-field" /></div>
                  <div><label className="label">Mot de passe *</label><div className="relative"><input type={showUserPassword ? 'text' : 'password'} name="password" value={userForm.password} onChange={handleUserFormChange} className="input-field pr-10" required /><button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-1/2 text-white/60"><FaEye /></button></div></div>
                  <div><label className="label">Confirmer *</label><input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="input-field" required /></div>
                  <div><label className="label">Province *</label><select name="province" value={userForm.province} onChange={handleUserFormChange} className="input-field" required><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                  <div><label className="label">Ville</label><input type="text" name="city" value={userForm.city} onChange={handleUserFormChange} className="input-field" /></div>
                  <div><label className="label">Adresse</label><textarea name="address" value={userForm.address} onChange={handleUserFormChange} className="input-field" rows="2" /></div>
                  <div><label className="label">Rôle</label><div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" name="role" value="user" checked={userForm.role === 'user'} onChange={handleUserFormChange} /><span>Utilisateur</span></label><label className="flex items-center gap-2"><input type="radio" name="role" value="admin" checked={userForm.role === 'admin'} onChange={handleUserFormChange} /><span>Administrateur</span></label></div></div>
                  <button type="submit" disabled={creatingUser} className="btn-primary w-full flex items-center justify-center gap-2">{creatingUser ? 'Création...' : <><FaCheckCircle /> Créer</>}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION D'AGENT */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-blue-900/95 p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaUserPlus className="text-primary-500" /> Créer un agent</h3>
              <button onClick={resetAgentModal} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {createdAgent ? (
                <div className="text-center">
                  <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
                  <h2 className="text-2xl font-bold text-white mb-4">Agent créé !</h2>
                  <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdAgent.fullname}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdAgent.phone}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Numéro agent :</span><span className="text-white font-mono">{createdAgent.agent_number}</span><button onClick={() => copyToClipboard(createdAgent.agent_number, 'Numéro agent')} className="text-primary-400"><FaCopy /></button></div>
                    <div className="flex justify-between"><span className="text-white/60">Agence :</span><span className="text-white">{agentForm.agency_name}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{agentForm.password}</span><button onClick={() => copyToClipboard(agentForm.password, 'Mot de passe')} className="text-primary-400"><FaCopy /></button></div>
                    <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdAgent.private_key}</span><button onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')} className="text-primary-400"><FaCopy /></button></div>
                  </div>
                  <div className="flex gap-3"><button onClick={resetAgentModal} className="flex-1 btn-primary">Fermer</button><button onClick={() => { resetAgentModal(); setShowAgentModal(false); }} className="flex-1 btn-secondary">Créer un autre agent</button></div>
                </div>
              ) : (
                <form onSubmit={handleCreateAgent} className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaUser className="text-primary-500" /> Informations personnelles</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2"><label className="label">Nom complet *</label><input type="text" name="fullname" value={agentForm.fullname} onChange={handleAgentFormChange} className="input-field" required /></div>
                      <div><label className="label">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="input-field" maxLength="8" required /></div>
                      <div><label className="label">Province *</label><select name="province" value={agentForm.province} onChange={handleAgentFormChange} className="input-field" required><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                      <div><label className="label">Mot de passe *</label><div className="relative"><input type={showPassword ? 'text' : 'password'} name="password" value={agentForm.password} onChange={handleAgentFormChange} className="input-field pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 text-white/60"><FaEye /></button></div></div>
                      <div><label className="label">Confirmer *</label><input type="password" name="confirmPassword" value={agentForm.confirmPassword} onChange={handleAgentFormChange} className="input-field" required /></div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaBuilding className="text-primary-500" /> Informations de l'agence</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2"><label className="label">Nom de l'agence *</label><input type="text" name="agency_name" value={agentForm.agency_name} onChange={handleAgentFormChange} className="input-field" required /></div>
                      <div className="col-span-2"><label className="label">Adresse de l'agence *</label><textarea name="agency_address" value={agentForm.agency_address} onChange={handleAgentFormChange} className="input-field" rows="2" required /></div>
                      <div><label className="label">Téléphone agence</label><input type="tel" name="agency_phone" value={agentForm.agency_phone} onChange={handleAgentFormChange} className="input-field" placeholder="Optionnel" /></div>
                      <div><label className="label">Type d'agence</label><select name="agency_type" value={agentForm.agency_type} onChange={handleAgentFormChange} className="input-field"><option value="principale">Principale</option><option value="secondaire">Secondaire</option></select></div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4"><button type="button" onClick={resetAgentModal} className="flex-1 btn-secondary">Annuler</button><button type="submit" disabled={creatingAgent} className="flex-1 btn-primary flex items-center justify-center gap-2">{creatingAgent ? 'Création...' : <><FaCheckCircle /> Créer l\'agent</>}</button></div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION D'UTILISATEUR */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-blue-500/30">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaEdit className="text-blue-500" /> Modifier l'utilisateur</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-white"><FaTimes size={18} /></button>
            </div>
            <form onSubmit={handleEditUser} className="p-5 space-y-4">
              <div><label className="block text-sm text-gray-300 mb-1">Nom complet</label><input type="text" value={editUserForm.fullname} onChange={(e) => setEditUserForm({...editUserForm, fullname: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Email</label><input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Province</label><select value={editUserForm.province} onChange={(e) => setEditUserForm({...editUserForm, province: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
              <div><label className="block text-sm text-gray-300 mb-1">Ville</label><input type="text" value={editUserForm.city} onChange={(e) => setEditUserForm({...editUserForm, city: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Adresse</label><textarea value={editUserForm.address} onChange={(e) => setEditUserForm({...editUserForm, address: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Rôle</label><select value={editUserForm.role} onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="user">Utilisateur</option><option value="agent">Agent</option><option value="admin">Administrateur</option></select></div>
              <div className="flex gap-3 pt-3"><button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white">Annuler</button><button type="submit" className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION D'AGENT */}
      {showEditAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-blue-500/30">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaEdit className="text-blue-500" /> Modifier l'agent</h3>
              <button onClick={() => setShowEditAgentModal(false)} className="text-gray-400 hover:text-white"><FaTimes size={18} /></button>
            </div>
            <form onSubmit={handleEditAgent} className="p-5 space-y-4">
              <div><label className="block text-sm text-gray-300 mb-1">Nom complet</label><input type="text" value={editAgentForm.fullname} onChange={(e) => setEditAgentForm({...editAgentForm, fullname: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Province</label><select value={editAgentForm.province} onChange={(e) => setEditAgentForm({...editAgentForm, province: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
              <div><label className="block text-sm text-gray-300 mb-1">Nom de l'agence</label><input type="text" value={editAgentForm.agency_name} onChange={(e) => setEditAgentForm({...editAgentForm, agency_name: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Adresse de l'agence</label><textarea value={editAgentForm.agency_address} onChange={(e) => setEditAgentForm({...editAgentForm, agency_address: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" required /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Téléphone agence</label><input type="tel" value={editAgentForm.agency_phone} onChange={(e) => setEditAgentForm({...editAgentForm, agency_phone: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Type d'agence</label><select value={editAgentForm.agency_type} onChange={(e) => setEditAgentForm({...editAgentForm, agency_type: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="principale">Principale</option><option value="secondaire">Secondaire</option></select></div>
              <div className="flex gap-3 pt-3"><button type="button" onClick={() => setShowEditAgentModal(false)} className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white">Annuler</button><button type="submit" className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÉINITIALISATION MOT DE PASSE */}
      {showResetPasswordModal && passwordResetResult === null && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-green-500/30">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaUndo className="text-green-500" /> Réinitialiser le mot de passe</h3>
              <button onClick={closePasswordResetModal} className="text-gray-400 hover:text-white"><FaTimes size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-gray-300 mb-4">Êtes-vous sûr de vouloir réinitialiser le mot de passe de <strong className="text-white">{selectedUser.fullname}</strong> ?</p>
              <p className="text-yellow-400 text-sm mb-6">⚠️ Un nouveau mot de passe à 6 chiffres sera généré automatiquement.</p>
              <div className="flex gap-3">
                <button onClick={closePasswordResetModal} className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white">Annuler</button>
                <button onClick={confirmResetPassword} disabled={resettingPassword} className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white flex items-center justify-center gap-2">{resettingPassword ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><FaUndo /> Réinitialiser</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉSULTAT RÉINITIALISATION MOT DE PASSE */}
      {showResetPasswordModal && passwordResetResult !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-green-500/30">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaCheckCircle className="text-green-500" /> Mot de passe réinitialisé</h3>
              <button onClick={closePasswordResetModal} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between"><span className="text-white/60">Utilisateur :</span><span className="text-white font-medium">{passwordResetResult.user_name}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{passwordResetResult.user_phone}</span></div>
                <div className="border-t border-white/10 my-2 pt-2">
                  <div className="flex justify-between items-center"><span className="text-white/60">Nouveau mot de passe :</span><div className="flex items-center gap-2"><code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{passwordResetResult.new_password}</code><button onClick={() => copyToClipboard(passwordResetResult.new_password, 'Mot de passe')} className="text-primary-400"><FaCopy /></button></div></div>
                </div>
              </div>
              <p className="text-yellow-400 text-xs mb-4">⚠️ Veuillez communiquer ce nouveau mot de passe à l'utilisateur.</p>
              <button onClick={closePasswordResetModal} className="btn-primary w-full">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉINITIALISATION CLÉ PRIVÉE - Confirmation */}
      {showResetKeyModal && resetResult === null && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-orange-500/30">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaKey className="text-orange-500" /> Réinitialiser la clé privée</h3>
              <button onClick={closeResetModal} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">Êtes-vous sûr de vouloir réinitialiser la clé privée de <strong className="text-white">{selectedUserForReset.name}</strong> ?</p>
              <p className="text-yellow-400 text-sm mb-6">⚠️ Cette action est irréversible. L'ancienne clé ne fonctionnera plus.</p>
              <div className="flex gap-3">
                <button onClick={closeResetModal} className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white">Annuler</button>
                <button onClick={confirmResetKey} disabled={resettingKey} className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white flex items-center justify-center gap-2">{resettingKey ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><FaSync /> Confirmer</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉSULTAT RÉINITIALISATION CLÉ PRIVÉE */}
      {showResetKeyModal && resetResult !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-green-500/30">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaCheckCircle className="text-green-500" /> Clé réinitialisée</h3>
              <button onClick={closeResetModal} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between"><span className="text-white/60">Utilisateur :</span><span className="text-white font-medium">{resetResult.user_name}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{resetResult.user_phone}</span></div>
                <div className="border-t border-white/10 my-2 pt-2">
                  <div className="flex justify-between items-center"><span className="text-white/60">Nouvelle clé privée :</span><div className="flex items-center gap-2"><code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{resetResult.new_private_key}</code><button onClick={copyNewKey} className="text-primary-400"><FaCopy /></button></div></div>
                </div>
              </div>
              <p className="text-yellow-400 text-xs mb-4">⚠️ Cette clé est indispensable pour se connecter en cas de perte de mot de passe.</p>
              <button onClick={closeResetModal} className="btn-primary w-full">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL KYC */}
      {showKycDetailModal && selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-blue-500/30">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaIdCard className="text-blue-500" /> Détails KYC</h3>
              <button onClick={() => setShowKycDetailModal(false)} className="text-white/60 hover:text-white"><FaTimes size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Nom complet</p><p className="text-white font-medium">{selectedKyc.fullname}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Téléphone</p><p className="text-white">{selectedKyc.user_phone}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Type de pièce</p><p className="text-white">{selectedKyc.id_type?.toUpperCase() || 'CNI'}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Numéro</p><p className="text-white font-mono">{selectedKyc.id_number}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Date de naissance</p><p className="text-white">{selectedKyc.birth_date || '-'}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Lieu de naissance</p><p className="text-white">{selectedKyc.birth_place || '-'}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Adresse</p><p className="text-white">{selectedKyc.address || '-'}</p></div>
                <div className="bg-white/5 rounded-lg p-3"><p className="text-white/60 text-sm">Soumis le</p><p className="text-white">{new Date(selectedKyc.submitted_at).toLocaleString('fr-FR')}</p></div>
              </div>
              {selectedKyc.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { handleApproveKyc(selectedKyc.id); setShowKycDetailModal(false); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Approuver</button>
                  <button onClick={() => { handleRejectKyc(selectedKyc.id); setShowKycDetailModal(false); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Rejeter</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminPanel