// src/pages/AdminPanel.jsx - Version COMPLÈTE ET FINALE
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  FaSync, FaLock, FaUnlockAlt, FaTimesCircle, FaUndo, FaSearch, FaFilter,
  FaWater, FaBolt, FaTint, FaPlug, FaWallet,
  FaUserSecret, FaPlane, FaBus, FaTrain, FaShip, FaGlobe, FaTicketAlt,
  FaHotel, FaMapMarked, FaStar, FaStarHalfAlt, FaRegStar,
  FaSuitcase, FaUtensils, FaWifi, FaParking, FaSwimmingPool,
  FaDumbbell, FaSpa, FaConciergeBell, FaUserEdit, FaLockOpen,
  FaAddressCard, FaPhoneAlt, FaCalendarCheck, FaUserCircle,
  FaRegBuilding, FaArrowRight
} from 'react-icons/fa'
import Layout from '../components/Layout'
import AgentApplicationsManager from '../components/AgentApplicationsManager'
import AdminPinManagement from '../components/AdminPinManagement'
import AdminTaxes from './AdminTaxes'

// Composant Modal réutilisable
const Modal = ({ isOpen, onClose, title, children, maxWidth = '2xl' }) => {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`relative max-w-${maxWidth} w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-yellow-500/30`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

function AdminPanel({ user, socket }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

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

  const [companyFilters, setCompanyFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });

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

  // États pour les entreprises de services (EAU/ÉLECTRICITÉ)
  const [serviceCompanies, setServiceCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  // Dans votre composant, au début
  const [companyForm, setCompanyForm] = useState({
    name: '',
    type: 'water',
    fullName: '',
    description: '',
    logo: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    color: '',
    password: '',
    confirmPassword: '',
    agentPhone: ''  // ✅ AJOUTER CE CHAMP
  })
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [createdCompany, setCreatedCompany] = useState(null)
  const [showCompanyPassword, setShowCompanyPassword] = useState(false)
  const [showCompanyConfirmPassword, setShowCompanyConfirmPassword] = useState(false)

  // États pour les agences de voyage
  const [companies, setCompanies] = useState([]); // ✅ Ajouter ce state
  const [travelAgencies, setTravelAgencies] = useState([])
  const [travelAgenciesLoading, setTravelAgenciesLoading] = useState(false)
  const [showTravelAgencyModal, setShowTravelAgencyModal] = useState(false)
  const [editingTravelAgency, setEditingTravelAgency] = useState(null)
  const [creatingTravelAgency, setCreatingTravelAgency] = useState(false)
  const [createdTravelAgency, setCreatedTravelAgency] = useState(null)
  const [showTravelAgencyPassword, setShowTravelAgencyPassword] = useState(false)
  const [showTravelAgencyConfirmPassword, setShowTravelAgencyConfirmPassword] = useState(false)
  const [showTravelAgencyDetailModal, setShowTravelAgencyDetailModal] = useState(false)
  const [selectedTravelAgencyDetail, setSelectedTravelAgencyDetail] = useState(null)
  const [travelAgencyForm, setTravelAgencyForm] = useState({
    name: '',
    type: 'travel_agency',
    description: '',
    logo: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

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

  const [companyStats, setCompanyStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    water: 0,
    electricity: 0,
    totalRevenue: 0,
    totalPayments: 0
  });

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

  // Nettoyage au démontage
  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin' && mounted) {
      fetchAdminData()
      fetchProvinces()
      fetchKycRequests()
      fetchServiceCompanies()
      fetchTravelAgencies()
    }
  }, [user, mounted])

  useEffect(() => {
    if (activeTab === 'blog' && mounted) {
      fetchBlogPosts()
    }
    if (activeTab === 'kyc' && mounted) {
      fetchKycRequests()
    }
    if (activeTab === 'service-companies' && mounted) {
      fetchServiceCompanies()
    }
    if (activeTab === 'travel-agencies' && mounted) {
      fetchTravelAgencies()
    }
  }, [activeTab, mounted])

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

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
  }// AdminPanel.jsx - Version corrigée avec axios
  const fetchServiceCompanies = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      console.log('🔑 Token dans fetchServiceCompanies:', token ? 'Présent' : 'Absent');

      if (!token) {
        console.error('❌ Pas de token, redirection vers login');
        toast.error('Session expirée, veuillez vous reconnecter');
        navigate('/login');
        return;
      }

      // ✅ Utiliser axios comme les autres fonctions
      const response = await axios.get('/api/service-companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Entreprises chargées:', response.data);
      setCompanies(response.data || []);

    } catch (error) {
      console.error('❌ Erreur chargement entreprises:', error);

      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        toast.error('Session expirée');
        navigate('/login');
      } else if (error.response?.status === 500) {
        toast.error('Erreur serveur, veuillez réessayer plus tard');
      } else {
        toast.error('Erreur lors du chargement des entreprises');
      }

      setCompanies([]);
    }
  };

  const fetchTravelAgencies = async () => {
    setTravelAgenciesLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/admin/travel-agencies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTravelAgencies(response.data || []);
    } catch (error) {
      console.error('Erreur chargement agences de voyage:', error);
      setTravelAgencies([]);
    } finally {
      setTravelAgenciesLoading(false);
    }
  };

  const fetchProvinces = async () => {
    try {
      const response = await axios.get('/api/provinces');
      if (Array.isArray(response.data)) {
        setProvinces(response.data);
      } else {
        setProvinces([]);
      }
    } catch (error) {
      console.error('Erreur chargement provinces:', error);
      setProvinces([]);
    }
  };

  // ============================================
  // GESTION DES AGENCES DE VOYAGE
  // ============================================

  const handleTravelAgencyFormChange = (e) => {
    setTravelAgencyForm({ ...travelAgencyForm, [e.target.name]: e.target.value })
  }

  const handleCreateTravelAgency = async (e) => {
    e.preventDefault()

    if (!travelAgencyForm.password) {
      toast.error('Le mot de passe est requis')
      return
    }

    if (travelAgencyForm.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }

    if (travelAgencyForm.password !== travelAgencyForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (!travelAgencyForm.name) {
      toast.error('Le nom de l\'agence est requis')
      return
    }

    if (!travelAgencyForm.phone) {
      toast.error('Le téléphone est requis')
      return
    }

    setCreatingTravelAgency(true)

    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/admin/travel-agencies', {
        name: travelAgencyForm.name,
        type: travelAgencyForm.type,
        description: travelAgencyForm.description,
        logo: travelAgencyForm.logo,
        phone: travelAgencyForm.phone,
        email: travelAgencyForm.email,
        address: travelAgencyForm.address,
        password: travelAgencyForm.password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCreatedTravelAgency(response.data.agency)
      toast.success('Agence de voyage créée avec succès !')

      setTravelAgencyForm({
        name: '',
        type: 'travel_agency',
        description: '',
        logo: '',
        phone: '',
        email: '',
        address: '',
        password: '',
        confirmPassword: ''
      })

      fetchTravelAgencies()

    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setCreatingTravelAgency(false)
    }
  }

  const handleEditTravelAgency = (agency) => {
    setEditingTravelAgency(agency)
    setTravelAgencyForm({
      name: agency.name,
      type: agency.type || 'travel_agency',
      description: agency.description || '',
      logo: agency.logo || '',
      phone: agency.phone || '',
      email: agency.email || '',
      address: agency.address || '',
      password: '',
      confirmPassword: ''
    })
    setShowTravelAgencyModal(true)
  }

  const handleUpdateTravelAgency = async (e) => {
    e.preventDefault()

    setCreatingTravelAgency(true)

    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/travel-agencies/${editingTravelAgency.id}`, {
        name: travelAgencyForm.name,
        type: travelAgencyForm.type,
        description: travelAgencyForm.description,
        logo: travelAgencyForm.logo,
        phone: travelAgencyForm.phone,
        email: travelAgencyForm.email,
        address: travelAgencyForm.address
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Agence de voyage modifiée avec succès')
      setShowTravelAgencyModal(false)
      setEditingTravelAgency(null)
      setTravelAgencyForm({
        name: '',
        type: 'travel_agency',
        description: '',
        logo: '',
        phone: '',
        email: '',
        address: '',
        password: '',
        confirmPassword: ''
      })
      fetchTravelAgencies()

    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification')
    } finally {
      setCreatingTravelAgency(false)
    }
  }

  const handleDeleteTravelAgency = async (id, name) => {
    if (!window.confirm(`Supprimer l'agence de voyage "${name}" ?`)) return

    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/admin/travel-agencies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Agence de voyage supprimée')
      fetchTravelAgencies()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const resetTravelAgencyModal = () => {
    setShowTravelAgencyModal(false)
    setEditingTravelAgency(null)
    setCreatedTravelAgency(null)
    setTravelAgencyForm({
      name: '',
      type: 'travel_agency',
      description: '',
      logo: '',
      phone: '',
      email: '',
      address: '',
      password: '',
      confirmPassword: ''
    })
    setShowTravelAgencyPassword(false)
    setShowTravelAgencyConfirmPassword(false)
  }

  // ============================================
  // GESTION DES ENTREPRISES DE SERVICES
  // ============================================
  // ============================================
  // GESTION DES ENTREPRISES DE SERVICES - ADAPTÉ AVEC agentPhone
  // ============================================

  const handleCompanyFormChange = (e) => {
    setCompanyForm({ ...companyForm, [e.target.name]: e.target.value })
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()

    // Validation du numéro de téléphone de l'agent
    if (!companyForm.agentPhone) {
      toast.error('Le numéro de téléphone de l\'agent est requis')
      return
    }

    if (!/^\d{8}$/.test(companyForm.agentPhone)) {
      toast.error('Le numéro de téléphone doit contenir 8 chiffres')
      return
    }

    if (!companyForm.password) {
      toast.error('Le mot de passe est requis')
      return
    }

    if (companyForm.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères')
      return
    }

    if (companyForm.password !== companyForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (!companyForm.name) {
      toast.error('Le nom de l\'entreprise est requis')
      return
    }

    if (!companyForm.type) {
      toast.error('Le type de service est requis')
      return
    }

    setCreatingCompany(true)

    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post('/api/admin/service-companies', {
        name: companyForm.name,
        type: companyForm.type,
        fullName: companyForm.fullName || '',
        description: companyForm.description || '',
        logo: companyForm.logo || '',
        contactPhone: companyForm.contactPhone || '',
        contactEmail: companyForm.contactEmail || '',
        address: companyForm.address || '',
        color: companyForm.color || '',
        password: companyForm.password,
        agentPhone: companyForm.agentPhone  // ✅ Numéro fourni
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCreatedCompany(response.data.company)
      toast.success(`✅ ${response.data.company.name} créée avec succès !`)
      toast.info(`📱 Agent: ${response.data.company.agent.phone} | Mot de passe: ${response.data.company.agent.password}`)

      // Réinitialiser le formulaire
      setCompanyForm({
        name: '',
        type: 'water',
        fullName: '',
        description: '',
        logo: '',
        contactPhone: '',
        contactEmail: '',
        address: '',
        color: '',
        password: '',
        confirmPassword: '',
        agentPhone: ''  // ✅ Réinitialiser aussi
      })

      fetchServiceCompanies()
      setShowCompanyModal(false)

    } catch (error) {
      console.error('❌ Erreur création:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setCreatingCompany(false)
    }
  }

  const handleEditCompany = (company) => {
    setEditingCompany(company)
    setCompanyForm({
      name: company.name || '',
      type: company.type || 'water',
      fullName: company.fullName || '',
      description: company.description || '',
      logo: company.logo || '',
      contactPhone: company.contact_phone || '',
      contactEmail: company.contact_email || '',
      address: company.address || '',
      color: company.color || '',
      password: '',
      confirmPassword: '',
      agentPhone: company.agent_phone || ''  // ✅ Pour l'édition (si disponible)
    })
    setShowCompanyModal(true)
  }

  const handleUpdateCompany = async (e) => {
    e.preventDefault()

    setCreatingCompany(true)

    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/admin/service-companies/${editingCompany.id}`, {
        name: companyForm.name,
        type: companyForm.type,
        fullName: companyForm.fullName || '',
        description: companyForm.description || '',
        logo: companyForm.logo || '',
        contactPhone: companyForm.contactPhone || '',
        contactEmail: companyForm.contactEmail || '',
        address: companyForm.address || '',
        color: companyForm.color || '',
        is_active: companyForm.is_active !== undefined ? companyForm.is_active : 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('✅ Entreprise modifiée avec succès')
      setShowCompanyModal(false)
      setEditingCompany(null)
      resetCompanyModal()
      fetchServiceCompanies()

    } catch (error) {
      console.error('❌ Erreur modification:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la modification')
    } finally {
      setCreatingCompany(false)
    }
  }

  const handleDeleteCompany = async (id, name) => {
    if (!window.confirm(`Supprimer l'entreprise "${name}" ?`)) return

    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/admin/service-companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Entreprise supprimée')
      fetchServiceCompanies()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const resetCompanyModal = () => {
    setShowCompanyModal(false)
    setEditingCompany(null)
    setCreatedCompany(null)
    setCompanyForm({
      name: '',
      type: 'water',
      fullName: '',
      description: '',
      logo: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      color: '',
      password: '',
      confirmPassword: '',
      agentPhone: ''  // ✅ Réinitialiser
    })
    setShowCompanyPassword(false)
    setShowCompanyConfirmPassword(false)
  }
  // ============================================
  // GESTION DES UTILISATEURS (AVEC RÉINITIALISATIONS)
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

  // ============================================
  // RÉINITIALISATION MOT DE PASSE
  // ============================================
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
  // GESTION KYC AVEC DÉTAILS COMPLETS
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
      setShowKycDetailModal(false)
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
      setShowKycDetailModal(false)
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
    switch (status) {
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
    { id: 'service-companies', label: 'Fournisseurs Eau/Élec', icon: FaBuilding },
    { id: 'travel-agencies', label: 'Agences de Voyage', icon: FaPlane },
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

  if (!mounted) return null

  const filteredUsers = getFilteredUsers()

  return (
    <Layout user={user} socket={socket}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Administration AlkherPay</h2>

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
                setShowTravelAgencyDetailModal(false)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                ? 'bg-yellow-500 text-black'
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
              <p className="text-white text-3xl font-bold">{stats.totalTransactions || 0}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <button onClick={() => setShowUserModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
              <FaUserPlus /> Nouvel utilisateur
            </button>
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
                    <th className="pb-3">Nom</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Rôle</th>
                    <th className="pb-3">Province</th>
                    <th className="pb-3">Solde</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3 text-center">Actions</th>
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
                          <button onClick={() => openEditUserModal(u)} className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" title="Modifier"><FaEdit size={14} /></button>
                          <button onClick={() => openResetPasswordModal(u)} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Réinitialiser mot de passe"><FaUndo size={14} /></button>
                          <button onClick={() => handleResetPrivateKey(u.id, u.role, u.fullname, u.phone)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" title="Réinitialiser clé privée"><FaSync size={14} /></button>
                          <button onClick={() => toggleUserStatus(u.id, u.is_active, u.fullname)} className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" title={u.is_active ? 'Bloquer' : 'Débloquer'}>{u.is_active ? <FaBan size={14} /> : <FaUnlockAlt size={14} />}</button>
                          <button onClick={() => deleteUser(u.id, u.fullname)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Supprimer"><FaTrashAlt size={14} /></button>
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
            <button onClick={() => setShowAgentModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
              <FaUserPlus /> Nouvel agent
            </button>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/20">
                  <tr className="text-left text-white/60">
                    <th className="pb-3">Nom</th>
                    <th className="pb-3">Téléphone</th>
                    <th className="pb-3">Agence</th>
                    <th className="pb-3">Province</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} className="border-b border-white/10">
                      <td className="py-3 text-white">{a.fullname}</td>
                      <td className="py-3 text-white/80">{a.phone}</td>
                      <td className="py-3 text-white/80">{a.agency_name || '-'}</td>
                      <td className="py-3 text-white/80">{a.province}</td>
                      <td className="py-3 text-white">{(a.balance || 0).toLocaleString()} FCFA</td>
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

        {/* MODAL RÉINITIALISATION MOT DE PASSE - Confirmation */}
        <Modal isOpen={showResetPasswordModal && !passwordResetResult} onClose={closePasswordResetModal} title="Réinitialiser le mot de passe" maxWidth="md">
          {selectedUser && (
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaKey className="text-yellow-400 text-3xl" />
              </div>
              <p className="text-gray-300 mb-4">
                Êtes-vous sûr de vouloir réinitialiser le mot de passe de <br />
                <strong className="text-white text-lg">{selectedUser.fullname}</strong> ?
              </p>
              <p className="text-yellow-400 text-sm mb-6 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                ⚠️ Un nouveau mot de passe à 6 chiffres sera généré automatiquement.
              </p>
              <div className="flex gap-3">
                <button onClick={closePasswordResetModal} className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                  Annuler
                </button>
                <button
                  onClick={confirmResetPassword}
                  disabled={resettingPassword}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {resettingPassword ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <><FaUndo /> Réinitialiser</>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL RÉSULTAT RÉINITIALISATION MOT DE PASSE */}
        <Modal isOpen={!!passwordResetResult} onClose={closePasswordResetModal} title="Mot de passe réinitialisé" maxWidth="md">
          {passwordResetResult && (
            <div className="text-center">
              <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                <FaCheckCircle className="text-green-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
              <p className="text-gray-400 text-sm mb-6">Le nouveau mot de passe a été généré avec succès</p>
              <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60">Utilisateur</span>
                  <span className="text-white font-medium">{passwordResetResult.user_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60">Téléphone</span>
                  <span className="text-white">{passwordResetResult.user_phone}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-white/60">Nouveau mot de passe</span>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 bg-black/30 px-3 py-1 rounded font-mono text-lg font-bold">
                      {passwordResetResult.new_password}
                    </code>
                    <button
                      onClick={() => copyToClipboard(passwordResetResult.new_password, 'Mot de passe')}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      title="Copier"
                    >
                      <FaCopy size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-yellow-400 text-xs mb-4">
                ⚠️ Veuillez communiquer ce nouveau mot de passe à l'utilisateur.
              </p>
              <button onClick={closePasswordResetModal} className="w-full bg-yellow-500 text-black py-3 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
            </div>
          )}
        </Modal>

        {/* MODAL RÉINITIALISATION CLÉ PRIVÉE - Confirmation */}
        <Modal isOpen={showResetKeyModal && !resetResult} onClose={closeResetModal} title="Réinitialiser la clé privée" maxWidth="md">
          {selectedUserForReset && (
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaKey className="text-orange-400 text-3xl" />
              </div>
              <p className="text-gray-300 mb-4">
                Êtes-vous sûr de vouloir réinitialiser la clé privée de <br />
                <strong className="text-white text-lg">{selectedUserForReset.name}</strong> ?
              </p>
              <p className="text-yellow-400 text-sm mb-6 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                ⚠️ Cette action est irréversible. L'ancienne clé ne fonctionnera plus.
              </p>
              <div className="flex gap-3">
                <button onClick={closeResetModal} className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                  Annuler
                </button>
                <button
                  onClick={confirmResetKey}
                  disabled={resettingKey}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {resettingKey ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <><FaSync /> Confirmer</>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL RÉSULTAT RÉINITIALISATION CLÉ PRIVÉE */}
        <Modal isOpen={!!resetResult} onClose={closeResetModal} title="Clé privée réinitialisée" maxWidth="md">
          {resetResult && (
            <div className="text-center">
              <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                <FaCheckCircle className="text-green-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Clé privée réinitialisée !</h2>
              <p className="text-gray-400 text-sm mb-6">Une nouvelle clé privée a été générée avec succès</p>
              <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60">Utilisateur</span>
                  <span className="text-white font-medium">{resetResult.user_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60">Téléphone</span>
                  <span className="text-white">{resetResult.user_phone}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-white/60">Nouvelle clé privée</span>
                  <div className="flex items-center gap-2">
                    <code className="text-orange-400 bg-black/30 px-3 py-1 rounded font-mono text-lg font-bold">
                      {resetResult.new_private_key}
                    </code>
                    <button
                      onClick={copyNewKey}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      title="Copier"
                    >
                      <FaCopy size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-yellow-400 text-xs mb-4">
                ⚠️ Cette clé est indispensable pour se connecter en cas de perte de mot de passe.
              </p>
              <button onClick={closeResetModal} className="w-full bg-yellow-500 text-black py-3 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
            </div>
          )}
        </Modal>

        {/* KYC Tab avec détails complets */}
        {activeTab === 'kyc' && (
          <div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setKycFilter('all'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'all' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60'}`}>Toutes</button>
              <button onClick={() => { setKycFilter('pending'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'pending' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60'}`}>En attente</button>
              <button onClick={() => { setKycFilter('verified'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'verified' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60'}`}>Vérifiés</button>
              <button onClick={() => { setKycFilter('rejected'); fetchKycRequests() }} className={`px-3 py-1 rounded-lg text-sm ${kycFilter === 'rejected' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60'}`}>Rejetés</button>
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
                      <th className="pb-3">Utilisateur</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycRequests.map(req => {
                      const status = getStatusBadge(req.status)
                      const StatusIcon = status.icon
                      return (
                        <tr key={req.id} className="border-b border-white/10">
                          <td className="py-3">
                            <p className="text-white font-medium">{req.fullname}</p>
                            <p className="text-xs text-white/40">{req.id_type?.toUpperCase()}</p>
                          </td>
                          <td className="py-3 text-white/80">{req.user_phone}</td>
                          <td className="py-3 text-white/80">{req.id_type?.toUpperCase() || '-'}</td>
                          <td className="py-3 text-white/60 text-sm">{new Date(req.submitted_at).toLocaleDateString('fr-FR')}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}>
                              <StatusIcon size={10} /> {status.text}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleViewKycDetail(req)}
                                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                title="Voir détails complets"
                              >
                                <FaEye size={14} />
                              </button>
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveKyc(req.id)}
                                    disabled={processingKyc}
                                    className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                    title="Approuver"
                                  >
                                    <FaCheckCircle size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectKyc(req.id)}
                                    disabled={processingKyc}
                                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    title="Rejeter"
                                  >
                                    <FaTimesCircle size={14} />
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

        {/* MODAL DÉTAIL KYC COMPLET */}
        <Modal isOpen={showKycDetailModal} onClose={() => setShowKycDetailModal(false)} title="Détails complets KYC" maxWidth="2xl">
          {selectedKyc && (
            <div className="space-y-5">
              {/* En-tête avec photo */}
              <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center text-3xl">
                  <FaUserCircle className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedKyc.fullname}</h2>
                  <p className="text-white/50">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedKyc.status === 'verified' ? 'bg-green-500/20 text-green-400' : selectedKyc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {selectedKyc.status === 'verified' ? '✅ Vérifié' : selectedKyc.status === 'pending' ? '⏳ En attente' : '❌ Rejeté'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Informations personnelles */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="text-blue-400" /> Informations personnelles
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Nom complet</span>
                    <span className="text-white font-medium">{selectedKyc.fullname}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Date de naissance</span>
                    <span className="text-white">{selectedKyc.birth_date || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Lieu de naissance</span>
                    <span className="text-white">{selectedKyc.birth_place || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Nationalité</span>
                    <span className="text-white">{selectedKyc.nationality || 'Tchadienne'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Profession</span>
                    <span className="text-white">{selectedKyc.occupation || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Téléphone</span>
                    <span className="text-white">{selectedKyc.phone_number || selectedKyc.user_phone}</span>
                  </div>
                </div>
              </div>

              {/* Informations de la pièce d'identité */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaIdCard className="text-yellow-400" /> Pièce d'identité
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Type</span>
                    <span className="text-white font-medium uppercase">{selectedKyc.id_type}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Numéro</span>
                    <span className="text-white font-mono">{selectedKyc.id_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Date d'émission</span>
                    <span className="text-white">{selectedKyc.id_issue_date || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Date d'expiration</span>
                    <span className="text-white">{selectedKyc.id_expiry_date || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-green-400" /> Adresse
                </h3>
                <p className="text-white/80 text-sm">{selectedKyc.address || 'Adresse non renseignée'}</p>
              </div>

              {/* Documents */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaFilePdf className="text-red-400" /> Documents
                </h3>
                <p className="text-white/60 text-sm">Aucun document joint</p>
              </div>

              {/* Métadonnées */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaClock className="text-purple-400" /> Métadonnées
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Soumis le</span>
                    <span className="text-white">{new Date(selectedKyc.submitted_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Niveau</span>
                    <span className="text-white font-bold text-yellow-400">Niveau {selectedKyc.level || 1}</span>
                  </div>
                  {selectedKyc.verified_at && (
                    <div className="flex justify-between border-b border-white/10 pb-2 col-span-2">
                      <span className="text-white/60">Vérifié le</span>
                      <span className="text-white">{new Date(selectedKyc.verified_at).toLocaleString('fr-FR')}</span>
                    </div>
                  )}
                  {selectedKyc.rejection_reason && (
                    <div className="flex justify-between border-b border-white/10 pb-2 col-span-2">
                      <span className="text-white/60">Motif du rejet</span>
                      <span className="text-red-400">{selectedKyc.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedKyc.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApproveKyc(selectedKyc.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle /> Approuver
                  </button>
                  <button
                    onClick={() => handleRejectKyc(selectedKyc.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaTimesCircle /> Rejeter
                  </button>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={() => setShowKycDetailModal(false)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  Fermer
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Wallet Principal Tab */}
        {activeTab === 'wallet' && (
          <div className="text-center">
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-2xl p-8 mb-6">
              <p className="text-white/80 text-sm">Wallet Principal (Frais 1.5% sur factures)</p>
              <h2 className="text-5xl font-bold text-white my-4">{stats.totalBalance ? Math.floor(stats.totalBalance * 0.015).toLocaleString() : '0'} FCFA</h2>
              <p className="text-white/60 text-sm">Frais accumulés sur les transactions et paiements de factures</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm">💰 Les frais de 1.5% sur chaque paiement de facture sont automatiquement reversés sur ce wallet.</p>
            </div>
          </div>
        )}
        {/* Service Companies Tab */}
        {activeTab === 'service-companies' && (
          <div>
            <button
              onClick={() => setShowCompanyModal(true)}
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors"
            >
              <FaPlus /> Nouveau fournisseur
            </button>

            {/* Filtres et recherche */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={companyFilters.status}
                onChange={(e) => setCompanyFilters({ ...companyFilters, status: e.target.value })}
                className="bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>

              <select
                value={companyFilters.type}
                onChange={(e) => setCompanyFilters({ ...companyFilters, type: e.target.value })}
                className="bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20"
              >
                <option value="all">Tous les types</option>
                <option value="water">💧 Eau</option>
                <option value="electricity">⚡ Électricité</option>
              </select>

              <input
                type="text"
                placeholder="Rechercher un fournisseur..."
                value={companyFilters.search}
                onChange={(e) => setCompanyFilters({ ...companyFilters, search: e.target.value })}
                className="flex-1 min-w-[200px] bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 placeholder-white/40"
              />

              <button
                onClick={() => {
                  setCompanyFilters({ status: 'all', type: 'all', search: '' });
                  fetchServiceCompanies();
                }}
                className="bg-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <FaSync className={companiesLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{companyStats.total || 0}</p>
                <p className="text-xs text-white/50">Total fournisseurs</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{companyStats.active || 0}</p>
                <p className="text-xs text-white/50">Actifs</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{companyStats.water || 0}</p>
                <p className="text-xs text-white/50">💧 Eau</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{companyStats.electricity || 0}</p>
                <p className="text-xs text-white/50">⚡ Électricité</p>
              </div>
            </div>

            {/* Liste des fournisseurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companiesLoading ? (
                <div className="col-span-2 text-center py-8 text-white/60 flex items-center justify-center gap-3">
                  <FaSpinner className="animate-spin" />
                  <span>Chargement des fournisseurs...</span>
                </div>
              ) : serviceCompanies.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white/5 rounded-xl">
                  <FaBuilding className="text-white/20 text-5xl mx-auto mb-3" />
                  <p className="text-white/50">Aucun fournisseur enregistré</p>
                  <button
                    onClick={() => setShowCompanyModal(true)}
                    className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm"
                  >
                    + Ajouter un fournisseur
                  </button>
                </div>
              ) : (
                serviceCompanies.map(company => (
                  <div
                    key={company.id}
                    className={`bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors border ${company.is_active === 1 ? 'border-green-500/20' : 'border-red-500/20'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-4xl">
                          {company.logo || (company.type === 'water' ? '💧' : '⚡')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-lg truncate">{company.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${company.is_active === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {company.is_active === 1 ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <p className="text-white/50 text-sm">
                            {company.type === 'water' ? 'Fournisseur d\'eau' : 'Fournisseur d\'électricité'}
                          </p>
                          {company.description && (
                            <p className="text-white/40 text-xs mt-1 line-clamp-2">{company.description}</p>
                          )}
                          {company.total_payments !== undefined && (
                            <div className="flex flex-wrap gap-3 mt-1">
                              <p className="text-green-400 text-xs flex items-center gap-1">
                                <FaWallet size={10} /> Revenu: {company.total_revenue?.toLocaleString() || 0} FCFA
                              </p>
                              <p className="text-blue-400 text-xs flex items-center gap-1">
                                <FaReceipt size={10} /> Paiements: {company.total_payments || 0}
                              </p>
                              {company.agent_balance !== undefined && (
                                <p className="text-yellow-400 text-xs flex items-center gap-1">
                                  <FaWallet size={10} /> Solde agent: {company.agent_balance?.toLocaleString() || 0} FCFA
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Modifier"
                        >
                          <FaEdit size={14} />
                        </button>
                        {company.is_active === 1 ? (
                          <button
                            onClick={() => handleToggleCompanyStatus(company.id, company.name, false)}
                            className="p-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                            title="Désactiver"
                          >
                            <FaBan size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleCompanyStatus(company.id, company.name, true)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                            title="Activer"
                          >
                            <FaCheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Supprimer"
                        >
                          <FaTrashAlt size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 text-sm space-y-1">
                      {company.contact_phone && (
                        <div className="flex items-center gap-2 text-white/60">
                          <FaPhone size={10} /> <span>{company.contact_phone}</span>
                        </div>
                      )}
                      {company.contact_email && (
                        <div className="flex items-center gap-2 text-white/60">
                          <FaEnvelope size={10} /> <span className="truncate">{company.contact_email}</span>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-center gap-2 text-white/60">
                          <FaMapMarkerAlt size={10} /> <span className="truncate">{company.address}</span>
                        </div>
                      )}
                      {company.agent_phone && (
                        <div className="flex items-center gap-2 text-green-400/60 text-xs">
                          <FaUserTie size={10} /> Agent: {company.agent_phone} ({company.agent_name || 'Sans nom'})
                        </div>
                      )}
                      {company.created_at && (
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                          <FaClock size={10} /> Créé le: {new Date(company.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {companyStats.total > 10 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-white/40">
                  {serviceCompanies.length} sur {companyStats.total} fournisseurs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCompanyPage(Math.max(1, companyPage - 1))}
                    disabled={companyPage === 1}
                    className="px-3 py-1 bg-white/10 text-white rounded-lg disabled:opacity-30 hover:bg-white/20 transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="px-3 py-1 text-white/60">
                    Page {companyPage} / {Math.ceil(companyStats.total / 10)}
                  </span>
                  <button
                    onClick={() => setCompanyPage(companyPage + 1)}
                    disabled={companyPage >= Math.ceil(companyStats.total / 10)}
                    className="px-3 py-1 bg-white/10 text-white rounded-lg disabled:opacity-30 hover:bg-white/20 transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Travel Agencies Tab */}
        {activeTab === 'travel-agencies' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">Agences de Voyage</h3>
              <button onClick={() => setShowTravelAgencyModal(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors">
                <FaPlus /> Nouvelle agence
              </button>
            </div>

            {travelAgenciesLoading ? (
              <div className="col-span-2 text-center py-8 text-white/60">Chargement...</div>
            ) : travelAgencies.length === 0 ? (
              <div className="col-span-2 text-center py-8 bg-white/5 rounded-xl">
                <FaPlane className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucune agence de voyage enregistrée</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {travelAgencies.map(agency => (
                  <div key={agency.id} className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-4 hover:shadow-lg transition-all border border-purple-500/30">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">
                          {agency.logo || '✈️'}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">{agency.name}</h3>
                          <p className="text-white/50 text-sm">
                            {agency.type === 'travel_agency' ? 'Agence de voyage' : 'Tour opérateur'}
                          </p>
                          {agency.rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="text-yellow-400 text-sm">
                                  {i < Math.floor(agency.rating) ? '★' : i < agency.rating ? '☆' : '☆'}
                                </span>
                              ))}
                              <span className="text-white/40 text-xs ml-1">({agency.total_reviews || 0})</span>
                            </div>
                          )}
                          {agency.wallet_balance !== undefined && (
                            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                              <FaWallet size={10} /> Solde: {agency.wallet_balance.toLocaleString()} FCFA
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTravelAgencyDetail(agency)
                            setShowTravelAgencyDetailModal(true)
                          }}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          title="Voir détails"
                        >
                          <FaEye size={14} />
                        </button>
                        <button onClick={() => handleEditTravelAgency(agency)} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                          <FaEdit size={14} />
                        </button>
                        <button onClick={() => handleDeleteTravelAgency(agency.id, agency.name)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                          <FaTrashAlt size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 text-sm space-y-1">
                      {agency.phone && (
                        <div className="flex items-center gap-2 text-white/60"><FaPhone size={10} /> <span>{agency.phone}</span></div>
                      )}
                      {agency.email && (
                        <div className="flex items-center gap-2 text-white/60"><FaEnvelope size={10} /> <span>{agency.email}</span></div>
                      )}
                      {agency.address && (
                        <div className="flex items-center gap-2 text-white/60"><FaMapMarkerAlt size={10} /> <span>{agency.address}</span></div>
                      )}
                      {agency.agent_phone && (
                        <div className="flex items-center gap-2 text-green-500/60 text-xs"><FaUserTie size={10} /> Agent: {agency.agent_phone}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Taxes Tab */}
        {activeTab === 'taxes' && <AdminTaxes user={user} />}

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
            <input name="title" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Titre de l'annonce" required />
            <textarea name="content" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="4" placeholder="Contenu de l'annonce" required />
            <input name="facebook" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Facebook" />
            <input name="whatsapp" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien WhatsApp" />
            <input name="telegram" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Telegram" />
            <input name="website" className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Lien Site web" />
            <button type="submit" className="w-full bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors">Publier</button>
          </form>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div>
            <button onClick={() => setShowBlogForm(true)} className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors"><FaPlus /> Nouvel article</button>
            {blogLoading ? (
              <div className="text-center py-12 text-white/60">Chargement...</div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <FaNewspaper className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucun article</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blogPosts.map(post => (
                  <div key={post.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                    <div><p className="text-white font-medium">{post.title}</p><p className="text-white/40 text-sm">{new Date(post.created_at).toLocaleDateString()}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditBlogPost(post)} className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"><FaEdit /></button>
                      <button onClick={() => handleDeleteBlogPost(post.id, post.title)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"><FaTrashAlt /></button>
                    </div>
                  </div>
                ))}
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
          <div className="text-center py-12"><FaCog className="text-white/20 text-5xl mx-auto mb-3" /><p className="text-white/50">Paramètres en développement</p></div>
        )}
      </div>

      {/* MODAL CRÉATION D'UTILISATEUR */}
      <Modal isOpen={showUserModal} onClose={resetUserModal} title="Créer un utilisateur" maxWidth="2xl">
        {createdUser ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
            <h2 className="text-2xl font-bold text-white mb-4">Utilisateur créé !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdUser.fullname}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdUser.phone}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Rôle :</span><span className="text-white">{createdUser.role}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{userForm.password}</span><button onClick={() => copyToClipboard(userForm.password, 'Mot de passe')} className="text-yellow-400"><FaCopy /></button></div>
              <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdUser.private_key}</span><button onClick={() => copyToClipboard(createdUser.private_key, 'Clé privée')} className="text-yellow-400"><FaCopy /></button></div>
            </div>
            <button onClick={resetUserModal} className="w-full bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div><label className="block text-sm text-gray-300 mb-1">Nom complet *</label><input type="text" name="fullname" value={userForm.fullname} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={userForm.phone} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" maxLength="8" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Email</label><input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Mot de passe *</label><div className="relative"><input type={showUserPassword ? 'text' : 'password'} name="password" value={userForm.password} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required /><button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"><FaEye /></button></div></div>
            <div><label className="block text-sm text-gray-300 mb-1">Confirmer *</label><input type="password" name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Province *</label><select name="province" value={userForm.province} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
            <div><label className="block text-sm text-gray-300 mb-1">Ville</label><input type="text" name="city" value={userForm.city} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Adresse</label><textarea name="address" value={userForm.address} onChange={handleUserFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Rôle</label><div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" name="role" value="user" checked={userForm.role === 'user'} onChange={handleUserFormChange} /><span>Utilisateur</span></label><label className="flex items-center gap-2"><input type="radio" name="role" value="admin" checked={userForm.role === 'admin'} onChange={handleUserFormChange} /><span>Administrateur</span></label></div></div>
            <button type="submit" disabled={creatingUser} className="w-full bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2">{creatingUser ? 'Création...' : <><FaCheckCircle /> Créer</>}</button>
          </form>
        )}
      </Modal>

      {/* MODAL CRÉATION D'AGENT */}
      <Modal isOpen={showAgentModal} onClose={resetAgentModal} title="Créer un agent" maxWidth="2xl">
        {createdAgent ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4"><FaCheckCircle className="text-green-400 text-4xl" /></div>
            <h2 className="text-2xl font-bold text-white mb-4">Agent créé !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{createdAgent.fullname}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{createdAgent.phone}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Numéro agent :</span><span className="text-white font-mono">{createdAgent.agent_number}</span><button onClick={() => copyToClipboard(createdAgent.agent_number, 'Numéro agent')} className="text-yellow-400"><FaCopy /></button></div>
              <div className="flex justify-between"><span className="text-white/60">Agence :</span><span className="text-white">{agentForm.agency_name}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Mot de passe :</span><span className="text-white font-mono">{agentForm.password}</span><button onClick={() => copyToClipboard(agentForm.password, 'Mot de passe')} className="text-yellow-400"><FaCopy /></button></div>
              <div className="flex justify-between"><span className="text-white/60">Clé privée :</span><span className="text-white font-mono">{createdAgent.private_key}</span><button onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')} className="text-yellow-400"><FaCopy /></button></div>
            </div>
            <div className="flex gap-3"><button onClick={resetAgentModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400">Fermer</button><button onClick={() => { resetAgentModal(); setShowAgentModal(false); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600">Créer un autre agent</button></div>
          </div>
        ) : (
          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaUser className="text-yellow-500" /> Informations personnelles</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm text-gray-300 mb-1">Nom complet *</label><input type="text" name="fullname" value={agentForm.fullname} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Téléphone (8 chiffres) *</label><input type="tel" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" maxLength="8" required /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Province *</label><select name="province" value={agentForm.province} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required><option value="">Sélectionnez</option>{provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                <div><label className="block text-sm text-gray-300 mb-1">Mot de passe *</label><div className="relative"><input type={showPassword ? 'text' : 'password'} name="password" value={agentForm.password} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"><FaEye /></button></div></div>
                <div><label className="block text-sm text-gray-300 mb-1">Confirmer *</label><input type="password" name="confirmPassword" value={agentForm.confirmPassword} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4"><h4 className="text-white font-semibold mb-3 flex items-center gap-2"><FaBuilding className="text-yellow-500" /> Informations de l'agence</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm text-gray-300 mb-1">Nom de l'agence *</label><input type="text" name="agency_name" value={agentForm.agency_name} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required /></div>
                <div className="col-span-2"><label className="block text-sm text-gray-300 mb-1">Adresse de l'agence *</label><textarea name="agency_address" value={agentForm.agency_address} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" required /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Téléphone agence</label><input type="tel" name="agency_phone" value={agentForm.agency_phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Optionnel" /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Type d'agence</label><select name="agency_type" value={agentForm.agency_type} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"><option value="principale">Principale</option><option value="secondaire">Secondaire</option></select></div>
              </div>
            </div>
            <div className="flex gap-3 pt-4"><button type="button" onClick={resetAgentModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600">Annuler</button><button type="submit" disabled={creatingAgent} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2">{creatingAgent ? 'Création...' : <><FaCheckCircle /> Créer l'agent</>}</button></div>
          </form>
        )}
      </Modal>
      <Modal isOpen={showTravelAgencyModal} onClose={resetTravelAgencyModal} title={editingTravelAgency ? "Modifier l'agence de voyage" : "Ajouter une agence de voyage"} maxWidth="2xl">
        {createdTravelAgency ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Agence de voyage créée !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Agence :</span>
                <span className="text-white font-bold">{createdTravelAgency.name}</span>
              </div>
              <div className="border-t border-white/10 my-2"></div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS DE CONNEXION</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Téléphone :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdTravelAgency.agent?.phone}</code>
                      <button onClick={() => copyToClipboard(createdTravelAgency.agent?.phone, 'Téléphone')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Mot de passe :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{travelAgencyForm.password}</code>
                      <button onClick={() => copyToClipboard(travelAgencyForm.password, 'Mot de passe')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Clé privée :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdTravelAgency.agent?.private_key}</code>
                      <button onClick={() => copyToClipboard(createdTravelAgency.agent?.private_key, 'Clé privée')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                <FaInfoCircle size={12} /> Ces informations permettent à l'agence de se connecter à AlkherPay
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetTravelAgencyModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
              <button onClick={() => { resetTravelAgencyModal(); setShowTravelAgencyModal(false); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                Ajouter une autre
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={editingTravelAgency ? handleUpdateTravelAgency : handleCreateTravelAgency} className="space-y-5">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaPlane className="text-yellow-500" /> Informations de l'agence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom de l'agence *</label>
                  <input
                    type="text"
                    name="name"
                    value={travelAgencyForm.name}
                    onChange={handleTravelAgencyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Voyages du Monde"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={travelAgencyForm.phone}
                    onChange={handleTravelAgencyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={travelAgencyForm.email}
                    onChange={handleTravelAgencyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                  <textarea
                    name="address"
                    value={travelAgencyForm.address}
                    onChange={handleTravelAgencyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    rows="2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={travelAgencyForm.description}
                    onChange={handleTravelAgencyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaKey className="text-yellow-500" /> Informations de connexion
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showTravelAgencyPassword ? 'text' : 'password'}
                      name="password"
                      value={travelAgencyForm.password}
                      onChange={handleTravelAgencyFormChange}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-10"
                      placeholder="Minimum 4 caractères"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowTravelAgencyPassword(!showTravelAgencyPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      {showTravelAgencyPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showTravelAgencyConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={travelAgencyForm.confirmPassword}
                      onChange={handleTravelAgencyFormChange}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-10"
                      placeholder="Confirmez le mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowTravelAgencyConfirmPassword(!showTravelAgencyConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      {showTravelAgencyConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                <FaInfoCircle size={10} /> Un compte agent sera automatiquement créé avec ces identifiants.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={resetTravelAgencyModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                Annuler
              </button>
              <button type="submit" disabled={creatingTravelAgency} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingTravelAgency ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  editingTravelAgency ? <><FaSave /> Modifier</> : <><FaCheckCircle /> Créer l'agence</>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================ */}
      {/* MODAL DÉTAIL AGENCE DE VOYAGE */}
      {/* ============================================ */}
      <Modal isOpen={showTravelAgencyDetailModal} onClose={() => setShowTravelAgencyDetailModal(false)} title="Détails de l'agence de voyage" maxWidth="2xl">
        {selectedTravelAgencyDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="text-6xl">
                {selectedTravelAgencyDetail.logo || '✈️'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTravelAgencyDetail.name}</h2>
                <p className="text-white/50">{selectedTravelAgencyDetail.type === 'travel_agency' ? 'Agence de voyage' : 'Tour opérateur'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📋 Informations générales</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/60">Nom :</span><span className="text-white">{selectedTravelAgencyDetail.name}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Type :</span><span className="text-white">{selectedTravelAgencyDetail.type || 'travel_agency'}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Statut :</span><span className={selectedTravelAgencyDetail.is_active ? 'text-green-400' : 'text-red-400'}>{selectedTravelAgencyDetail.is_active ? 'Actif' : 'Inactif'}</span></div>
                  {selectedTravelAgencyDetail.rating > 0 && (
                    <div className="flex justify-between"><span className="text-white/60">Évaluation :</span><span className="text-yellow-400">{selectedTravelAgencyDetail.rating} ⭐ ({selectedTravelAgencyDetail.total_reviews || 0} avis)</span></div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📍 Coordonnées</h3>
                <div className="space-y-2 text-sm">
                  {selectedTravelAgencyDetail.phone && <div className="flex justify-between"><span className="text-white/60">Téléphone :</span><span className="text-white">{selectedTravelAgencyDetail.phone}</span></div>}
                  {selectedTravelAgencyDetail.email && <div className="flex justify-between"><span className="text-white/60">Email :</span><span className="text-white">{selectedTravelAgencyDetail.email}</span></div>}
                  {selectedTravelAgencyDetail.address && <div className="flex justify-between"><span className="text-white/60">Adresse :</span><span className="text-white/80">{selectedTravelAgencyDetail.address}</span></div>}
                </div>
              </div>
            </div>

            {selectedTravelAgencyDetail.description && (
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📝 Description</h3>
                <p className="text-white/80 text-sm">{selectedTravelAgencyDetail.description}</p>
              </div>
            )}

            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
              <h3 className="text-white font-semibold mb-3">👤 Compte agent associé</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Téléphone agent :</span>
                  <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{selectedTravelAgencyDetail.agent_phone || 'Non assigné'}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Solde du wallet :</span>
                  <span className="text-yellow-400 font-bold">{(selectedTravelAgencyDetail.wallet_balance || 0).toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={() => setShowTravelAgencyDetailModal(false)} className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* ============================================ */}
      {/* MODAL CRÉATION/MODIFICATION D'ENTREPRISE DE SERVICE */}
      {/* ============================================ */}
      <Modal isOpen={showCompanyModal} onClose={resetCompanyModal} title={editingCompany ? "Modifier le fournisseur" : "Ajouter un fournisseur"} maxWidth="2xl">
        {createdCompany ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Fournisseur créé !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Entreprise :</span>
                <span className="text-white font-bold">{createdCompany.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Type :</span>
                <span className="text-white">{createdCompany.type === 'water' ? '💧 EAU' : '⚡ ÉLECTRICITÉ'}</span>
              </div>
              <div className="border-t border-white/10 my-2"></div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS DE CONNEXION</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Téléphone :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.phone}</code>
                      <button onClick={() => copyToClipboard(createdCompany.agent?.phone, 'Téléphone')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Mot de passe :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{companyForm.password}</code>
                      <button onClick={() => copyToClipboard(companyForm.password, 'Mot de passe')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Clé privée :</span>
                    <div className="flex items-center gap-2">
                      <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.private_key}</code>
                      <button onClick={() => copyToClipboard(createdCompany.agent?.private_key, 'Clé privée')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                <FaInfoCircle size={12} /> Ces informations permettent à l'entreprise de se connecter à AlkherPay
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetCompanyModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
              <button onClick={() => { resetCompanyModal(); setShowCompanyModal(false); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                Ajouter un autre
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-5">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaBuilding className="text-yellow-500" /> Informations de l'entreprise
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    name="name"
                    value={companyForm.name}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: STE, ZIZ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Type de service *</label>
                  <select
                    name="type"
                    value={companyForm.type}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="water">💧 Eau</option>
                    <option value="electricity">⚡ Électricité</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Couleur</label>
                  <input
                    type="color"
                    name="color"
                    value={companyForm.color || '#2196F3'}
                    onChange={handleCompanyFormChange}
                    className="w-full h-10 rounded-lg bg-gray-700 border border-gray-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone de contact</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={companyForm.contactPhone}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Email de contact</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={companyForm.contactEmail}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                  <textarea
                    name="address"
                    value={companyForm.address}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    rows="2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={companyForm.description}
                    onChange={handleCompanyFormChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            {/* ✅ SECTION COMPTE AGENT - UNIQUEMENT POUR LA CRÉATION */}
            {!editingCompany && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="text-yellow-500" /> Compte agent
                </h4>
                <p className="text-xs text-yellow-400/70 mb-4 flex items-center gap-1">
                  <FaInfoCircle size={10} /> Un compte agent sera automatiquement créé avec ces informations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ CHAMP NUMÉRO DE TÉLÉPHONE */}
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-300 mb-1">
                      Numéro de téléphone de l'agent <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="agentPhone"
                      value={companyForm.agentPhone || ''}
                      onChange={handleCompanyFormChange}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                      placeholder="Ex: 62787301"
                      required
                      maxLength="8"
                      pattern="[0-9]{8}"
                    />
                    <p className="text-xs text-gray-400 mt-1">8 chiffres sans espace ni préfixe</p>
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCompanyPassword ? 'text' : 'password'}
                        name="password"
                        value={companyForm.password}
                        onChange={handleCompanyFormChange}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-10"
                        placeholder="Minimum 4 caractères"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCompanyPassword(!showCompanyPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showCompanyPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation mot de passe */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      Confirmer le mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCompanyConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={companyForm.confirmPassword}
                        onChange={handleCompanyFormChange}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all pr-10"
                        placeholder="Confirmez le mot de passe"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCompanyConfirmPassword(!showCompanyConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showCompanyConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ SECTION MODIFICATION - AFFICHAGE DES INFOS DE L'AGENT */}
            {editingCompany && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="text-blue-400" /> Agent associé
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Nom</label>
                    <input
                      type="text"
                      value={editingCompany.agent_name || editingCompany.name}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white cursor-not-allowed opacity-70"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={editingCompany.agent_phone || editingCompany.phone || ''}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white cursor-not-allowed opacity-70"
                      disabled
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-400/70 mt-3 flex items-center gap-1">
                  <FaInfoCircle size={10} /> Le numéro de téléphone de l'agent ne peut pas être modifié.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={resetCompanyModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                Annuler
              </button>
              <button type="submit" disabled={creatingCompany} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingCompany ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  editingCompany ? <><FaSave /> Modifier</> : <><FaCheckCircle /> Créer le fournisseur</>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* ============================================ */}
      {/* MODAL BLOG FORM */}
      {/* ============================================ */}
      <Modal isOpen={showBlogForm} onClose={() => { setShowBlogForm(false); setEditingPost(null); }} title={editingPost ? "Modifier l'article" : "Nouvel article"} maxWidth="2xl">
        <form onSubmit={handleSaveBlogPost} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              value={blogForm.title}
              onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Extrait</label>
            <textarea
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Contenu *</label>
            <textarea
              value={blogForm.content}
              onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              rows="6"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Catégorie</label>
              <select
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              >
                <option value="actualite">Actualité</option>
                <option value="promotion">Promotion</option>
                <option value="guide">Guide</option>
                <option value="annonce">Annonce</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tags</label>
              <input
                type="text"
                value={blogForm.tags}
                onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                placeholder="tag1, tag2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">URL de l'image</label>
            <input
              type="url"
              value={blogForm.image_url}
              onChange={(e) => setBlogForm({ ...blogForm, image_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Statut</label>
            <select
              value={blogForm.status}
              onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setShowBlogForm(false); setEditingPost(null); }}
              className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingPost}
              className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPost ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                editingPost ? 'Modifier' : 'Publier'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================ */}
      {/* MODAL MODIFICATION D'UTILISATEUR */}
      {/* ============================================ */}
      <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title="Modifier l'utilisateur" maxWidth="md">
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom complet</label>
            <input
              type="text"
              value={editUserForm.fullname}
              onChange={(e) => setEditUserForm({ ...editUserForm, fullname: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={editUserForm.email}
              onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Province</label>
            <select
              value={editUserForm.province}
              onChange={(e) => setEditUserForm({ ...editUserForm, province: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Sélectionnez</option>
              {provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Ville</label>
            <input
              type="text"
              value={editUserForm.city}
              onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Adresse</label>
            <textarea
              value={editUserForm.address}
              onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rôle</label>
            <select
              value={editUserForm.role}
              onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
            >
              <option value="user">Utilisateur</option>
              <option value="agent">Agent</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
              Annuler
            </button>
            <button type="submit" className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
      {/* MODAL CRÉATION D'AGENT */}
      <Modal isOpen={showAgentModal} onClose={resetAgentModal} title="Créer un agent" maxWidth="2xl">
        {createdAgent ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Agent créé avec succès !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Nom</span>
                <span className="text-white font-medium">{createdAgent.fullname}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Téléphone</span>
                <span className="text-white">{createdAgent.phone}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Numéro agent</span>
                <div className="flex items-center gap-2">
                  <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">
                    {createdAgent.agent_number}
                  </code>
                  <button onClick={() => copyToClipboard(createdAgent.agent_number, 'Numéro agent')} className="text-yellow-400 hover:text-yellow-300">
                    <FaCopy size={14} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Agence</span>
                <span className="text-white">{agentForm.agency_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Mot de passe</span>
                <div className="flex items-center gap-2">
                  <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">
                    {agentForm.password}
                  </code>
                  <button onClick={() => copyToClipboard(agentForm.password, 'Mot de passe')} className="text-yellow-400 hover:text-yellow-300">
                    <FaCopy size={14} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-white/60">Clé privée</span>
                <div className="flex items-center gap-2">
                  <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">
                    {createdAgent.private_key}
                  </code>
                  <button onClick={() => copyToClipboard(createdAgent.private_key, 'Clé privée')} className="text-yellow-400 hover:text-yellow-300">
                    <FaCopy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetAgentModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                Fermer
              </button>
              <button onClick={() => { resetAgentModal(); setShowAgentModal(true); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                Créer un autre agent
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaUser className="text-yellow-500" /> Informations personnelles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom complet *</label>
                  <input type="text" name="fullname" value={agentForm.fullname} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone (8 chiffres) *</label>
                  <input type="tel" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" maxLength="8" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Province *</label>
                  <select name="province" value={agentForm.province} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required>
                    <option value="">Sélectionnez</option>
                    {provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={agentForm.password} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Confirmer *</label>
                  <input type="password" name="confirmPassword" value={agentForm.confirmPassword} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaBuilding className="text-yellow-500" /> Informations de l'agence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom de l'agence *</label>
                  <input type="text" name="agency_name" value={agentForm.agency_name} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Adresse de l'agence *</label>
                  <textarea name="agency_address" value={agentForm.agency_address} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone agence</label>
                  <input type="tel" name="agency_phone" value={agentForm.agency_phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="Optionnel" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Type d'agence</label>
                  <select name="agency_type" value={agentForm.agency_type} onChange={handleAgentFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
                    <option value="principale">Principale</option>
                    <option value="secondaire">Secondaire</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={resetAgentModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={creatingAgent} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium">
                {creatingAgent ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><FaCheckCircle /> Créer l'agent</>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* MODAL CRÉATION/MODIFICATION D'ENTREPRISE DE SERVICE */}
      <Modal isOpen={showCompanyModal} onClose={resetCompanyModal} title={editingCompany ? "Modifier le fournisseur" : "Ajouter un fournisseur"} maxWidth="2xl">
        {createdCompany ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Fournisseur créé avec succès !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Entreprise</span>
                <span className="text-white font-bold">{createdCompany.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Type</span>
                <span className="text-white">{createdCompany.type === 'water' ? '💧 EAU' : '⚡ ÉLECTRICITÉ'}</span>
              </div>
              <div className="border-t border-white/10 my-2 pt-2">
                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS DE CONNEXION</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Téléphone</span>
                    <div className="flex items-center gap-2">
                      <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.phone}</code>
                      <button onClick={() => copyToClipboard(createdCompany.agent?.phone, 'Téléphone')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Mot de passe</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{companyForm.password}</code>
                      <button onClick={() => copyToClipboard(companyForm.password, 'Mot de passe')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Clé privée</span>
                    <div className="flex items-center gap-2">
                      <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdCompany.agent?.private_key}</code>
                      <button onClick={() => copyToClipboard(createdCompany.agent?.private_key, 'Clé privée')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                <FaInfoCircle size={12} /> Ces informations permettent à l'entreprise de se connecter à AlkherPay
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetCompanyModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Fermer
              </button>
              <button onClick={() => { resetCompanyModal(); setShowCompanyModal(true); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Ajouter un autre
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-5">
            {/* SECTION 1 : Informations de l'entreprise */}
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaBuilding className="text-yellow-500" /> Informations de l'entreprise
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom de l'entreprise *</label>
                  <input type="text" name="name" value={companyForm.name} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Type de service *</label>
                  <select name="type" value={companyForm.type} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required>
                    <option value="water">💧 Eau</option>
                    <option value="electricity">⚡ Électricité</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone de contact</label>
                  <input type="tel" name="contactPhone" value={companyForm.contactPhone} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Email de contact</label>
                  <input type="email" name="contactEmail" value={companyForm.contactEmail} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                  <textarea name="address" value={companyForm.address} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Description</label>
                  <textarea name="description" value={companyForm.description} onChange={handleCompanyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                </div>
              </div>
            </div>

            {/* ✅ SECTION 2 : COMPTE AGENT - UNIQUEMENT POUR LA CRÉATION */}
            {!editingCompany && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="text-yellow-500" /> Compte agent
                </h4>
                <p className="text-xs text-yellow-400/70 mb-4 flex items-center gap-1">
                  <FaInfoCircle size={10} /> Un compte agent sera automatiquement créé avec ces informations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ NOUVEAU CHAMP : Numéro de téléphone de l'agent */}
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-300 mb-1">
                      Numéro de téléphone de l'agent <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="agentPhone"
                      value={companyForm.agentPhone || ''}
                      onChange={handleCompanyFormChange}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                      placeholder="Ex: 62787301"
                      required
                      maxLength="8"
                      pattern="[0-9]{8}"
                    />
                    <p className="text-xs text-gray-400 mt-1">8 chiffres sans espace ni préfixe</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                    <div className="relative">
                      <input
                        type={showCompanyPassword ? 'text' : 'password'}
                        name="password"
                        value={companyForm.password}
                        onChange={handleCompanyFormChange}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10"
                        required
                        minLength="4"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCompanyPassword(!showCompanyPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        {showCompanyPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Confirmer le mot de passe *</label>
                    <div className="relative">
                      <input
                        type={showCompanyConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={companyForm.confirmPassword}
                        onChange={handleCompanyFormChange}
                        className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10"
                        required
                        minLength="4"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCompanyConfirmPassword(!showCompanyConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        {showCompanyConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-3 flex items-center gap-1">
                  <FaInfoCircle size={10} /> Le numéro de téléphone servira d'identifiant pour l'agent
                </p>
              </div>
            )}

            {/* ✅ SECTION 3 : MODIFICATION - INFOS DE L'AGENT EXISTANT */}
            {editingCompany && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="text-blue-400" /> Agent associé
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Nom de l'agent</label>
                    <input
                      type="text"
                      value={editingCompany.agent_name || editingCompany.name || ''}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white cursor-not-allowed opacity-70"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={editingCompany.agent_phone || editingCompany.phone || ''}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white cursor-not-allowed opacity-70"
                      disabled
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-400/70 mt-3 flex items-center gap-1">
                  <FaInfoCircle size={10} /> Le numéro de téléphone de l'agent ne peut pas être modifié.
                </p>
              </div>
            )}

            {/* BOUTONS D'ACTION */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetCompanyModal}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creatingCompany}
                className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {creatingCompany ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  editingCompany ? <><FaSave /> Modifier</> : <><FaCheckCircle /> Créer</>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* MODAL CRÉATION/MODIFICATION D'AGENCE DE VOYAGE */}
      <Modal isOpen={showTravelAgencyModal} onClose={resetTravelAgencyModal} title={editingTravelAgency ? "Modifier l'agence de voyage" : "Ajouter une agence de voyage"} maxWidth="2xl">
        {createdTravelAgency ? (
          <div className="text-center">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
              <FaCheckCircle className="text-green-400 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Agence de voyage créée avec succès !</h2>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">Agence</span>
                <span className="text-white font-bold">{createdTravelAgency.name}</span>
              </div>
              <div className="border-t border-white/10 my-2 pt-2">
                <p className="text-yellow-400 text-sm font-semibold mb-2">🔐 INFORMATIONS DE CONNEXION</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Téléphone</span>
                    <div className="flex items-center gap-2">
                      <code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdTravelAgency.agent?.phone}</code>
                      <button onClick={() => copyToClipboard(createdTravelAgency.agent?.phone, 'Téléphone')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Mot de passe</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{travelAgencyForm.password}</code>
                      <button onClick={() => copyToClipboard(travelAgencyForm.password, 'Mot de passe')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Clé privée</span>
                    <div className="flex items-center gap-2">
                      <code className="text-orange-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{createdTravelAgency.agent?.private_key}</code>
                      <button onClick={() => copyToClipboard(createdTravelAgency.agent?.private_key, 'Clé privée')} className="text-yellow-400 hover:text-yellow-300">
                        <FaCopy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-yellow-400/70 mt-2 flex items-center gap-1">
                <FaInfoCircle size={12} /> Ces informations permettent à l'agence de se connecter à AlkherPay
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetTravelAgencyModal} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Fermer
              </button>
              <button onClick={() => { resetTravelAgencyModal(); setShowTravelAgencyModal(true); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Ajouter une autre
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={editingTravelAgency ? handleUpdateTravelAgency : handleCreateTravelAgency} className="space-y-5">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaPlane className="text-yellow-500" /> Informations de l'agence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nom de l'agence *</label>
                  <input type="text" name="name" value={travelAgencyForm.name} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Téléphone *</label>
                  <input type="tel" name="phone" value={travelAgencyForm.phone} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input type="email" name="email" value={travelAgencyForm.email} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Adresse</label>
                  <textarea name="address" value={travelAgencyForm.address} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Description</label>
                  <textarea name="description" value={travelAgencyForm.description} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaKey className="text-yellow-500" /> Informations de connexion
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input type={showTravelAgencyPassword ? 'text' : 'password'} name="password" value={travelAgencyForm.password} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required />
                    <button type="button" onClick={() => setShowTravelAgencyPassword(!showTravelAgencyPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                      {showTravelAgencyPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input type={showTravelAgencyConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={travelAgencyForm.confirmPassword} onChange={handleTravelAgencyFormChange} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white pr-10" required />
                    <button type="button" onClick={() => setShowTravelAgencyConfirmPassword(!showTravelAgencyConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                      {showTravelAgencyConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-2">
                ⚠️ Un compte agent sera automatiquement créé avec ces identifiants.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={resetTravelAgencyModal} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={creatingTravelAgency} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium">
                {creatingTravelAgency ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  editingTravelAgency ? <><FaSave /> Modifier</> : <><FaCheckCircle /> Créer</>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL DÉTAIL AGENCE DE VOYAGE */}
      <Modal isOpen={showTravelAgencyDetailModal} onClose={() => setShowTravelAgencyDetailModal(false)} title="Détails de l'agence de voyage" maxWidth="2xl">
        {selectedTravelAgencyDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="text-6xl">
                {selectedTravelAgencyDetail.logo || '✈️'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTravelAgencyDetail.name}</h2>
                <p className="text-white/50">{selectedTravelAgencyDetail.type === 'travel_agency' ? 'Agence de voyage' : 'Tour opérateur'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📋 Informations générales</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/60">Nom</span><span className="text-white">{selectedTravelAgencyDetail.name}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Type</span><span className="text-white">{selectedTravelAgencyDetail.type || 'travel_agency'}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Statut</span><span className={selectedTravelAgencyDetail.is_active ? 'text-green-400' : 'text-red-400'}>{selectedTravelAgencyDetail.is_active ? 'Actif' : 'Inactif'}</span></div>
                  {selectedTravelAgencyDetail.rating > 0 && (
                    <div className="flex justify-between"><span className="text-white/60">Évaluation</span><span className="text-yellow-400">{selectedTravelAgencyDetail.rating} ⭐ ({selectedTravelAgencyDetail.total_reviews || 0} avis)</span></div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📍 Coordonnées</h3>
                <div className="space-y-2 text-sm">
                  {selectedTravelAgencyDetail.phone && <div className="flex justify-between"><span className="text-white/60">Téléphone</span><span className="text-white">{selectedTravelAgencyDetail.phone}</span></div>}
                  {selectedTravelAgencyDetail.email && <div className="flex justify-between"><span className="text-white/60">Email</span><span className="text-white">{selectedTravelAgencyDetail.email}</span></div>}
                  {selectedTravelAgencyDetail.address && <div className="flex justify-between"><span className="text-white/60">Adresse</span><span className="text-white/80">{selectedTravelAgencyDetail.address}</span></div>}
                </div>
              </div>
            </div>

            {selectedTravelAgencyDetail.description && (
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">📝 Description</h3>
                <p className="text-white/80 text-sm">{selectedTravelAgencyDetail.description}</p>
              </div>
            )}

            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
              <h3 className="text-white font-semibold mb-3">👤 Compte agent associé</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="text-white/60">Téléphone agent</span><code className="text-green-400 bg-black/30 px-2 py-1 rounded font-mono text-sm">{selectedTravelAgencyDetail.agent_phone || 'Non assigné'}</code></div>
                <div className="flex justify-between items-center"><span className="text-white/60">Solde du wallet</span><span className="text-yellow-400 font-bold">{(selectedTravelAgencyDetail.wallet_balance || 0).toLocaleString()} FCFA</span></div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={() => setShowTravelAgencyDetailModal(false)} className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL BLOG FORM */}
      <Modal isOpen={showBlogForm} onClose={() => { setShowBlogForm(false); setEditingPost(null); }} title={editingPost ? "Modifier l'article" : "Nouvel article"} maxWidth="2xl">
        <form onSubmit={handleSaveBlogPost} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Titre *</label>
            <input type="text" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Extrait</label>
            <textarea value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Contenu *</label>
            <textarea value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="6" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Catégorie</label>
              <select value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
                <option value="actualite">Actualité</option>
                <option value="promotion">Promotion</option>
                <option value="guide">Guide</option>
                <option value="annonce">Annonce</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tags</label>
              <input type="text" value={blogForm.tags} onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="tag1, tag2" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">URL de l'image</label>
            <input type="url" value={blogForm.image_url} onChange={(e) => setBlogForm({ ...blogForm, image_url: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Statut</label>
            <select value={blogForm.status} onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setShowBlogForm(false); setEditingPost(null); }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={savingPost} className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium">
              {savingPost ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                editingPost ? <><FaSave /> Modifier</> : <><FaCheckCircle /> Publier</>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFICATION D'UTILISATEUR */}
      <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title="Modifier l'utilisateur" maxWidth="md">
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom complet</label>
            <input type="text" value={editUserForm.fullname} onChange={(e) => setEditUserForm({ ...editUserForm, fullname: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Province</label>
            <select value={editUserForm.province} onChange={(e) => setEditUserForm({ ...editUserForm, province: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
              <option value="">Sélectionnez</option>
              {provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Ville</label>
            <input type="text" value={editUserForm.city} onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Adresse</label>
            <textarea value={editUserForm.address} onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rôle</label>
            <select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
              <option value="user">Utilisateur</option>
              <option value="agent">Agent</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFICATION D'AGENT */}
      <Modal isOpen={showEditAgentModal} onClose={() => setShowEditAgentModal(false)} title="Modifier l'agent" maxWidth="md">
        <form onSubmit={handleEditAgent} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom complet</label>
            <input type="text" value={editAgentForm.fullname} onChange={(e) => setEditAgentForm({ ...editAgentForm, fullname: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Province</label>
            <select value={editAgentForm.province} onChange={(e) => setEditAgentForm({ ...editAgentForm, province: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
              <option value="">Sélectionnez</option>
              {provinces.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom de l'agence</label>
            <input type="text" value={editAgentForm.agency_name} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Adresse de l'agence</label>
            <textarea value={editAgentForm.agency_address} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_address: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" rows="2" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Téléphone agence</label>
            <input type="tel" value={editAgentForm.agency_phone} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_phone: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Type d'agence</label>
            <select value={editAgentForm.agency_type} onChange={(e) => setEditAgentForm({ ...editAgentForm, agency_type: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white">
              <option value="principale">Principale</option>
              <option value="secondaire">Secondaire</option>
            </select>
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => setShowEditAgentModal(false)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 transition-colors font-medium">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

export default AdminPanel