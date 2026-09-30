// src/pages/MyCompany.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  FaBuilding, FaUsers, FaMoneyBillWave, FaChartLine, FaArrowLeft,
  FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaShare, FaDownload,
  FaEye, FaPrint, FaFilePdf, FaDollarSign, FaPercent, FaTrophy,
  FaMedal, FaAward, FaRocket, FaShieldAlt, FaCheckCircle,
  FaClock, FaInfoCircle, FaCopy, FaWallet, FaChartPie,
  FaUserPlus, FaHandshake, FaStar, FaCrown, FaTimes,
  FaEdit, FaSave, FaTrash, FaPlus, FaChartBar, FaBell,
  FaHistory, FaBullhorn, FaGift, FaLink, FaQrcode, FaSpinner
} from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const MyCompany = ({ user, socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalInvestors: 0,
    totalShares: 0,
    sharePrice: 0,
    fundingProgress: 0,
    remainingGoal: 0,
    valuation: 0,
    averageInvestment: 0,
    maxInvestment: 0,
    minInvestment: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // ✅ Récupérer toutes les données
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await fetchMyCompany();
      await fetchInvestors();
      await fetchHistory();
      await fetchStatistics();
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Récupération de l'entreprise
  const fetchMyCompany = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/my-company', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📋 Données entreprise:', response.data);

      const data = response.data.data || response.data;
      
      if (data && data.id) {
        setCompany(data);
        setEditForm({
          name: data.name || '',
          fullName: data.fullName || '',
          description: data.description || '',
          sector: data.sector || '',
          location: data.location || '',
          website: data.website || '',
          email: data.email || '',
          phone: data.phone || '',
          pitch: data.pitch || '',
          team: data.team || ''
        });

        const collected = data.collected_amount || data.collectedAmount || 0;
        const goal = data.funding_goal || data.fundingGoal || 0;
        const progress = goal > 0 ? (collected / goal) * 100 : 0;
        
        setStats(prev => ({
          ...prev,
          totalInvested: collected,
          totalInvestors: data.investors_count || data.investorsCount || 0,
          totalShares: data.shares_offered || data.sharesOffered || 1000,
          sharePrice: data.share_price || data.sharePrice || 1000,
          fundingProgress: Math.min(progress, 100),
          remainingGoal: Math.max(goal - collected, 0),
          valuation: (data.share_price || data.sharePrice || 1000) * (data.shares_offered || data.sharesOffered || 1000)
        }));

        const shareUrl = `${window.location.origin}/investment/${data.id}`;
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`);
      } else {
        setCompany(null);
      }
    } catch (error) {
      console.error('❌ Erreur chargement entreprise:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        setCompany(null);
      } else {
        toast.error('Erreur lors du chargement des données');
        setCompany(null);
      }
    }
  };

  // ✅ Récupération des investisseurs
  const fetchInvestors = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/investors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data || [];
      setInvestors(data);
      console.log('✅ Investisseurs:', data);
    } catch (error) {
      console.error('❌ Erreur investisseurs:', error);
      setInvestors([]);
    }
  };

  // ✅ Récupération de l'historique
  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data || [];
      setHistory(data);
      console.log('✅ Historique:', data);
    } catch (error) {
      console.error('❌ Erreur historique:', error);
      setHistory([]);
    }
  };

  // ✅ Récupération des statistiques
  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/company-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data) {
        const { stats: apiStats, daily_stats, distribution: dist } = response.data.data;
        
        setStats(prev => ({
          ...prev,
          totalInvested: apiStats.total_amount || prev.totalInvested,
          totalInvestors: apiStats.total_investors || prev.totalInvestors,
          totalShares: apiStats.total_shares || prev.totalShares,
          averageInvestment: apiStats.average_investment || 0,
          maxInvestment: apiStats.max_investment || 0,
          minInvestment: apiStats.min_investment || 0
        }));

        // Formatter les données du graphique
        if (daily_stats && daily_stats.length > 0) {
          const formattedData = daily_stats.map(item => ({
            date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            investissements: item.count,
            montant: item.amount
          }));
          setChartData(formattedData);
        }

        if (dist && dist.length > 0) {
          setDistribution(dist);
        }
      }
    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
    }
  };

  // ✅ Mettre à jour l'entreprise
  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put('/api/investment/company', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('✅ Entreprise mise à jour avec succès !');
        setShowEditModal(false);
        fetchMyCompany();
      } else {
        toast.error(response.data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Supprimer l'entreprise
  const handleDeleteCompany = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre entreprise ? Cette action est irréversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.delete('/api/investment/company', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Entreprise supprimée avec succès');
        navigate('/investments');
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // ✅ Envoyer une notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (!notificationForm.title || !notificationForm.message) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/investment/notify-investors', notificationForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(`✅ Notification envoyée à ${investors.length} investisseurs`);
        setShowNotificationModal(false);
        setNotificationForm({ title: '', message: '', type: 'info' });
        fetchHistory();
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
      toast.error('Erreur lors de l\'envoi');
    }
  };

  // ✅ Générer le rapport
  const generateReport = () => {
    toast.success('📊 Génération du rapport en cours...');
    
    const reportContent = `
========================================
RAPPORT D'ENTREPRISE
========================================

INFORMATIONS GÉNÉRALES
----------------------
Nom: ${company.name}
Secteur: ${company.sector}
Localisation: ${company.location || 'Non spécifiée'}
Date de création: ${formatDate(company.created_at)}
Statut: ${company.status || 'Actif'}

STATISTIQUES FINANCIÈRES
------------------------
Objectif de financement: ${formatAmount(company.funding_goal)}
Montant collecté: ${formatAmount(stats.totalInvested)}
Progression: ${stats.fundingProgress.toFixed(1)}%
Montant restant: ${formatAmount(stats.remainingGoal)}
Valorisation: ${formatAmount(stats.valuation)}

INVESTISSEURS
-------------
Nombre total: ${investors.length}
Investissement moyen: ${formatAmount(stats.averageInvestment)}
Investissement max: ${formatAmount(stats.maxInvestment)}
Investissement min: ${formatAmount(stats.minInvestment)}

DÉTAIL DES INVESTISSEURS
------------------------
${investors.map((inv, i) => `
${i+1}. ${inv.investor_name || 'Anonyme'}
   Téléphone: ${inv.investor_phone || 'N/A'}
   Montant: ${formatAmount(inv.amount)}
   Actions: ${inv.shares || 0}
   Date: ${formatDate(inv.created_at)}
`).join('\n')}

========================================
Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
========================================
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_${company.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('✅ Rapport téléchargé !');
  };

  // ✅ Partager
  const shareCompany = (platform = 'copy') => {
    const shareUrl = `${window.location.origin}/investment/${company.id}`;
    const message = `🚀 Découvrez mon entreprise "${company.name}" sur AlkherPay ! 
    
Investissez dès maintenant et participez à notre croissance : ${shareUrl}

Objectif: ${formatAmount(company.funding_goal)}
Déjà collecté: ${formatAmount(stats.totalInvested)} (${stats.fundingProgress.toFixed(0)}%)`;
    
    switch(platform) {
      case 'copy':
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl);
          toast.success('🔗 Lien copié !');
        }
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent('Découvrez mon entreprise ' + company.name)}&body=${encodeURIComponent(message)}`, '_blank');
        break;
      default:
        break;
    }
  };

  // ✅ Exporter les investisseurs en CSV
  const exportInvestors = () => {
    if (investors.length === 0) {
      toast.error('Aucun investisseur à exporter');
      return;
    }
    
    const headers = ['ID', 'Nom', 'Téléphone', 'Email', 'KYC', 'Montant', 'Actions', 'Prix/Action', 'Date', 'Statut'];
    const rows = investors.map(inv => [
      inv.id || '',
      inv.investor_name || '',
      inv.investor_phone || '',
      inv.investor_email || '',
      inv.kyc_level || 0,
      inv.amount || 0,
      inv.shares || 0,
      inv.share_price || 0,
      formatDate(inv.created_at),
      inv.status || 'active'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investisseurs_${company?.name?.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`📥 ${investors.length} investisseurs exportés !`);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA';
    return amount.toLocaleString() + ' FCFA';
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
      case 'active':
      case 'verified':
        return { color: 'bg-green-100 text-green-700', label: '✅ Actif' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-700', label: '⏳ En attente' };
      case 'cancelled':
      case 'rejected':
        return { color: 'bg-red-100 text-red-700', label: '❌ Annulé' };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: '📋 Inconnu' };
    }
  };

  const hasAccess = () => {
    if (!company) return false;
    return company.created_by === user?.id;
  };

  // Données pour le graphique circulaire
  const pieData = [
    { name: 'Collecté', value: stats.totalInvested, color: '#10B981' },
    { name: 'Restant', value: stats.remainingGoal, color: '#E5E7EB' }
  ];

  // Couleurs pour les graphiques
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <Layout user={user} socket={socket}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!company) {
    return (
      <Layout user={user} socket={socket}>
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
          >
            <FaArrowLeft className="text-lg" />
            <span>Retour</span>
          </button>
          
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <FaBuilding className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-gray-500 text-lg">Vous n'avez pas encore d'entreprise</p>
            <button 
              onClick={() => navigate('/investments')}
              className="mt-4 bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400"
            >
              Créer votre entreprise →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess()) {
    return (
      <Layout user={user} socket={socket}>
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
          >
            <FaArrowLeft className="text-lg" />
            <span>Retour</span>
          </button>
          
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <FaShieldAlt className="text-red-400 text-5xl mx-auto mb-3" />
            <p className="text-gray-500 text-lg">Accès non autorisé</p>
            <p className="text-gray-400 text-sm">Vous n'êtes pas le propriétaire de cette entreprise</p>
            <button 
              onClick={() => navigate('/investments')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Voir les investissements
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusInfo = getStatusBadge(company.status || 'active');

  return (
    <Layout user={user} socket={socket}>
      <div className="container mx-auto px-4 py-8">
        {/* Bouton de retour et actions */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
          >
            <FaArrowLeft className="text-lg" />
            <span>Retour</span>
          </button>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaBell /> Notifier
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaEdit /> Modifier
            </button>
          </div>
        </div>

        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                <FaBuilding className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                <p className="text-blue-200">{company.sector || 'Non spécifié'}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-blue-200 text-xs flex items-center gap-1">
                    <FaCalendarAlt size={10} /> Créé le {formatDate(company.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-blue-200 text-xs">Valeur estimée</p>
                <p className="text-white font-bold text-xl">{formatAmount(stats.valuation)}</p>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2 text-white transition-colors"
              >
                <FaShare size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          {[
            { id: 'overview', label: 'Aperçu', icon: FaChartLine },
            { id: 'analytics', label: 'Analytique', icon: FaChartBar },
            { id: 'investors', label: 'Investisseurs', icon: FaUsers, count: investors.length },
            { id: 'history', label: 'Historique', icon: FaHistory, count: history.length },
            { id: 'financials', label: 'Finances', icon: FaMoneyBillWave }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon /> {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Aperçu */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Collecté</p>
                    <p className="text-2xl font-bold text-green-600">{formatAmount(stats.totalInvested)}</p>
                  </div>
                  <FaWallet className="text-green-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Investisseurs</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalInvestors}</p>
                  </div>
                  <FaUsers className="text-blue-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Actions</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalShares}</p>
                  </div>
                  <FaChartPie className="text-purple-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Prix / Action</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatAmount(stats.sharePrice)}</p>
                  </div>
                  <FaDollarSign className="text-yellow-500 text-3xl opacity-50" />
                </div>
              </div>
            </div>

            {/* Progression */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">📈 Progression du financement</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Objectif: {formatAmount(company.funding_goal)}</span>
                <span className="text-gray-500 font-bold">{stats.fundingProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(stats.fundingProgress)}`}
                  style={{ width: `${Math.min(stats.fundingProgress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-green-600 font-medium">{formatAmount(stats.totalInvested)} collecté</span>
                <span className="text-gray-400">Restant: {formatAmount(stats.remainingGoal)}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">📝 Description</h3>
              <p className="text-gray-700">{company.description || 'Aucune description'}</p>
            </div>

            {/* Pitch */}
            {company.pitch && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">🎯 Pitch</h3>
                <p className="text-gray-700">{company.pitch}</p>
              </div>
            )}

            {/* Équipe */}
            {company.team && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">👥 Équipe</h3>
                <p className="text-gray-700">{company.team}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Analytique */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graphique de progression */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">📈 Évolution des investissements</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'montant') return [formatAmount(value), 'Montant'];
                          return [value, 'Investissements'];
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="investissements" 
                        stroke="#3B82F9" 
                        strokeWidth={2}
                        name="Investissements"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="montant" 
                        stroke="#10C981" 
                        strokeWidth={2}
                        name="Montant"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <FaChartLine className="text-5xl mx-auto mb-3" />
                    <p>Aucune donnée disponible</p>
                  </div>
                )}
              </div>

              {/* Graphique circulaire */}
              <div className="bg-amber-900 rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-black mb-4">💰 Répartition du financement</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatAmount(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FaTrophy className="text-yellow-500 text-2xl" />
                  <h3 className="font-bold text-gray-800">Investissement max</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{formatAmount(stats.maxInvestment)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FaChartLine className="text-blue-500 text-2xl" />
                  <h3 className="font-bold text-gray-800">Investissement moyen</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatAmount(stats.averageInvestment)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FaMedal className="text-gray-500 text-2xl" />
                  <h3 className="font-bold text-gray-800">Investissement min</h3>
                </div>
                <p className="text-2xl font-bold text-gray-600">{formatAmount(stats.minInvestment)}</p>
              </div>
            </div>

            {/* Distribution par montant */}
            {distribution.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">📊 Distribution par montant</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatAmount(value)} />
                    <Legend />
                    <Bar dataKey="total" fill="#3B82F6" name="Montant total" />
                    <Bar dataKey="count" fill="#10B981" name="Nombre d'investissements" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Tab: Investisseurs */}
        {activeTab === 'investors' && (
          <div className="bg-blue-900 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-blue flex justify-between items-center flex-wrap gap-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Détails des investisseurs
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {investors.length}
                </span>
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportInvestors}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <FaDownload /> CSV
                </button>
                <button 
                  onClick={fetchInvestors}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  🔄 Actualiser
                </button>
              </div>
            </div>

            {/* Statistiques rapides */}
            {investors.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{investors.length}</p>
                  <p className="text-xs text-gray-600">Investisseurs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatAmount(investors.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
                  </p>
                  <p className="text-xs text-gray-600">Total investi</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {investors.reduce((sum, inv) => sum + (inv.shares || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-600">Actions vendues</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatAmount(Math.round(investors.reduce((sum, inv) => sum + (inv.amount || 0), 0) / (investors.length || 1)))}
                  </p>
                  <p className="text-xs text-gray-600">Moyenne</p>
                </div>
              </div>
            )}

            {investors.length === 0 ? (
              <div className="text-center py-12">
                <FaUsers className="text-gray-300 text-5xl mx-auto mb-3" />
                <p className="text-gray-500">Aucun investisseur pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-500">
                    <tr className="text-left text-white text-sm">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Investisseur</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">KYC</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {investors.map((investor, index) => {
                      const status = getStatusBadge(investor.status || 'active');
                      return (
                        <tr 
                          key={investor.id || index} 
                          className="hover:bg-gray-500 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedInvestor(investor);
                            setShowInvestorModal(true);
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
                                {(investor.investor_name || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{investor.investor_name || 'Anonyme'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <p>{investor.investor_phone || '-'}</p>
                            {investor.investor_email && (
                              <p className="text-xs text-gray-400">{investor.investor_email}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              investor.kyc_level >= 2 ? 'bg-purple-100 text-purple-700' :
                              investor.kyc_level >= 1 ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              Niveau {investor.kyc_level || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {formatAmount(investor.amount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">{investor.shares || 0}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(investor.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-blue-900 border-t">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 font-bold">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        {formatAmount(investors.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {investors.reduce((sum, inv) => sum + (inv.shares || 0), 0)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Historique */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FaHistory className="text-blue-500" />
                Historique des activités
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {history.length}
                </span>
              </h3>
              <button
                onClick={fetchHistory}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
              >
                🔄 Actualiser
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12">
                <FaHistory className="text-gray-300 text-5xl mx-auto mb-3" />
                <p className="text-gray-500">Aucune activité pour le moment</p>
              </div>
            ) : (
              <div className="relative">
                {/* Ligne verticale */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={item.id || index} className="relative flex items-start gap-4 pl-12">
                      {/* Point sur la ligne */}
                      <div className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white ${
                        item.color === 'blue' ? 'bg-blue-500' :
                        item.color === 'green' ? 'bg-green-500' :
                        item.color === 'yellow' ? 'bg-yellow-500' :
                        item.color === 'red' ? 'bg-red-500' :
                        item.color === 'purple' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}></div>

                      <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.icon || '📋'}</span>
                            <div>
                              <p className="font-medium text-gray-800">{item.action}</p>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
                            {item.amount > 0 && (
                              <p className="text-sm font-bold text-green-600">
                                {formatAmount(item.amount)}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.investor_name && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                              {item.investor_name.charAt(0)}
                            </div>
                            <span className="text-xs text-gray-500">
                              {item.investor_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Finances */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Répartition des actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">📊 Répartition des actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600">Actions totales</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.totalShares}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600">Actions vendues</p>
                  <p className="text-2xl font-bold text-green-700">
                    {investors.reduce((sum, inv) => sum + (inv.shares || 0), 0)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-600">Actions disponibles</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {Math.max(stats.totalShares - investors.reduce((sum, inv) => sum + (inv.shares || 0), 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Valorisation */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">💰 Valorisation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Valorisation actuelle</p>
                  <p className="text-3xl font-bold text-blue-600">{formatAmount(stats.valuation)}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Basée sur {stats.totalShares} actions à {formatAmount(stats.sharePrice)}/part
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progression</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.fundingProgress.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Du financement atteint
                  </p>
                </div>
              </div>
            </div>

            {/* Détails */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">📈 Détails des investissements</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Nombre total d'investisseurs</span>
                  <span className="font-bold">{stats.totalInvestors}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Montant total investi</span>
                  <span className="font-bold text-green-600">{formatAmount(stats.totalInvested)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Investissement moyen</span>
                  <span className="font-bold text-blue-600">{formatAmount(stats.averageInvestment)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Objectif de financement</span>
                  <span className="font-bold">{formatAmount(company.funding_goal)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Objectif restant</span>
                  <span className="font-bold text-yellow-600">{formatAmount(stats.remainingGoal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-bold">Prix par action</span>
                  <span className="font-bold">{formatAmount(stats.sharePrice)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={generateReport}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaFilePdf /> Générer le rapport
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaShare /> Partager
              </button>
              <button 
                onClick={handleDeleteCompany}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FaTrash /> Supprimer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Détails investisseur */}
      {showInvestorModal && selectedInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">👤 Détails de l'investisseur</h3>
              <button onClick={() => setShowInvestorModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {(selectedInvestor.investor_name || '?').charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">
                    {selectedInvestor.investor_name || 'Anonyme'}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedInvestor.kyc_level >= 2 ? 'bg-purple-100 text-purple-700' :
                    selectedInvestor.kyc_level >= 1 ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    KYC Niveau {selectedInvestor.kyc_level || 0}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="font-medium">{selectedInvestor.investor_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{selectedInvestor.investor_email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-500">Montant investi</span>
                  <span className="font-bold text-green-600">{formatAmount(selectedInvestor.amount)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-500">Nombre d'actions</span>
                  <span className="font-bold">{selectedInvestor.shares}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-500">Prix par action</span>
                  <span className="font-medium">{formatAmount(selectedInvestor.share_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Date d'investissement</span>
                  <span className="font-medium">{formatDate(selectedInvestor.created_at)}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowInvestorModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    if (selectedInvestor.investor_phone) {
                      window.open(`tel:${selectedInvestor.investor_phone}`, '_blank');
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <FaPhone /> Appeler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modifier */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-blue-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">✏️ Modifier l'entreprise</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-70 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-70 mb-1">Secteur</label>
                  <input
                    type="text"
                    value={editForm.sector || ''}
                    onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-70 mb-1">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-70 mb-1">Pitch</label>
                <textarea
                  value={editForm.pitch || ''}
                  onChange={(e) => setEditForm({ ...editForm, pitch: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-70 mb-1">Localisation</label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-70 mb-1">Site web</label>
                  <input
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-red-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <><FaSave /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Partager */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">🔗 Partager l'entreprise</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 text-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mx-auto mb-4 border rounded-lg p-2" />
              )}
              <p className="text-sm text-gray-500 mb-4">Scannez ce QR code ou partagez le lien</p>
              
              <div className="flex justify-center gap-3 mb-4 flex-wrap">
                <button
                  onClick={() => shareCompany('whatsapp')}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                  title="WhatsApp"
                >
                  <FaPhone />
                </button>
                <button
                  onClick={() => shareCompany('facebook')}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  title="Facebook"
                >
                  <FaShare />
                </button>
                <button
                  onClick={() => shareCompany('twitter')}
                  className="p-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors"
                  title="Twitter"
                >
                  <FaShare />
                </button>
                <button
                  onClick={() => shareCompany('linkedin')}
                  className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
                  title="LinkedIn"
                >
                  <FaShare />
                </button>
                <button
                  onClick={() => shareCompany('email')}
                  className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                  title="Email"
                >
                  <FaEnvelope />
                </button>
                <button
                  onClick={() => shareCompany('copy')}
                  className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                  title="Copier le lien"
                >
                  <FaCopy />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 break-all">
                  {`${window.location.origin}/investment/${company.id}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notification */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">📢 Notifier les investisseurs</h3>
              <button onClick={() => setShowNotificationModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-700">
                  Cette notification sera envoyée à <strong>{investors.length} investisseurs</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Mise à jour importante"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Écrivez votre message..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="info">ℹ️ Information</option>
                  <option value="success">✅ Succès</option>
                  <option value="warning">⚠️ Avertissement</option>
                  <option value="error">❌ Important</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <FaBell /> Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MyCompany;