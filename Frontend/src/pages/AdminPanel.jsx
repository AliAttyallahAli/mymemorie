import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUsers, FaUserTie, FaMoneyBillWave, FaChartLine, FaBell, 
  FaCog, FaKey, FaUserPlus, FaTimes, FaEye, FaEyeSlash,
  FaBuilding, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaShieldAlt,
  FaCopy, FaBan, FaCheck
} from 'react-icons/fa'
import Layout from '../components/Layout'

function AdminPanel({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  
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
  }, [activeTab])

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const [usersRes, agentsRes] = await Promise.all([
        axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/users?role=agent', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setUsers(usersRes.data.users)
      setAgents(agentsRes.data.users)
      
      // Stats simplifiées
      const totalBalance = usersRes.data.users.reduce((sum, u) => sum + (u.balance || 0), 0)
      setStats({
        totalUsers: usersRes.data.total,
        totalAgents: agentsRes.data.total,
        totalBalance,
        totalTransactions: 0 // À implémenter
      })
    } catch (error) {
      console.error('Erreur chargement admin:', error)
      toast.error('Erreur chargement des données')
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

  const handleAgentFormChange = (e) => {
    setAgentForm({ ...agentForm, [e.target.name]: e.target.value })
  }

  const handleCreateAgent = async (e) => {
    e.preventDefault()
    
    // Validations
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
      
      // Réinitialiser le formulaire
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
      
      // Rafraîchir les listes
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaChartLine },
    { id: 'users', label: 'Utilisateurs', icon: FaUsers },
    { id: 'agents', label: 'Agents', icon: FaUserTie },
    { id: 'wallet', label: 'Wallet Principal', icon: FaMoneyBillWave },
    { id: 'announce', label: 'Annonces', icon: FaBell }
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
              onClick={() => setActiveTab(tab.id)}
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
          <div>
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
                  {users.map(u => (
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
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div>
            {/* Bouton pour ouvrir le modal */}
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
          <div>
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
          </div>
        )}
      </div>

      {/* MODAL DE CRÉATION D'AGENT */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
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

            {/* Contenu modal */}
            <div className="p-6">
              {/* Affichage après création */}
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
                /* Formulaire de création */
                <form onSubmit={handleCreateAgent} className="space-y-5">
                  {/* Informations personnelles */}
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

                  {/* Sécurité */}
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

                  {/* Informations agence */}
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
                              className="w-4 h-4 text-blue-500"
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
                              className="w-4 h-4 text-blue-500"
                            />
                            <span className="text-white">Secondaire</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons formulaire */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={resetAgentModal}
                      className="btn-secondary flex-1"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creatingAgent}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
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