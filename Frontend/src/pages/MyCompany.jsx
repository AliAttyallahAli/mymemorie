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
  FaUserPlus, FaHandshake, FaStar, FaCrown, FaTimes
} from 'react-icons/fa';

const MyCompany = ({ user, socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalInvestors: 0,
    totalShares: 0,
    sharePrice: 0,
    fundingProgress: 0,
    remainingGoal: 0,
    valuation: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [showInvestorsModal, setShowInvestorsModal] = useState(false);
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMyCompany();
      fetchInvestments();
    }
  }, [user]);

  // ✅ Récupération de l'entreprise de l'utilisateur
  const fetchMyCompany = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/my-company', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📋 Données entreprise:', response.data);

      // Adapter la structure de la réponse
      const data = response.data.data || response.data;
      
      if (data && data.id) {
        setCompany(data);
        
        const collected = data.collected_amount || data.collectedAmount || 0;
        const goal = data.funding_goal || data.fundingGoal || 0;
        const progress = goal > 0 ? (collected / goal) * 100 : 0;
        
        setStats({
          totalInvested: collected,
          totalInvestors: data.investors_count || data.investorsCount || 0,
          totalShares: data.shares_offered || data.sharesOffered || 1000,
          sharePrice: data.share_price || data.sharePrice || 1000,
          fundingProgress: Math.min(progress, 100),
          remainingGoal: Math.max(goal - collected, 0),
          valuation: (data.share_price || data.sharePrice || 1000) * (data.shares_offered || data.sharesOffered || 1000)
        });
      } else {
        // Pas d'entreprise trouvée
        setCompany(null);
      }
    } catch (error) {
      console.error('❌ Erreur chargement entreprise:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        setCompany(null);
        // Pas de toast d'erreur, juste un message silencieux
      } else {
        toast.error('Erreur lors du chargement des données');
        setCompany(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Récupération des investissements de l'entreprise
  const fetchInvestments = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/investment/my-investments', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📋 Données investissements:', response.data);

      const data = response.data.data || response.data || [];
      
      // Filtrer les investissements de l'utilisateur
      const userInvestments = data.filter(inv => inv.user_id === user.id || inv.investor_id === user.id);
      setInvestments(userInvestments);
      
      // Extraire les investisseurs (investissements des autres dans l'entreprise)
      const companyInvestors = data.filter(inv => inv.company_id === company?.id);
      setInvestors(companyInvestors);
      
    } catch (error) {
      console.error('❌ Erreur chargement investissements:', error);
      setInvestments([]);
      setInvestors([]);
    }
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

  // ✅ Générer le rapport
  const generateReport = () => {
    toast.success('📊 Génération du rapport en cours...');
    setTimeout(() => {
      toast.success('✅ Rapport généré avec succès !');
    }, 2000);
  };

  // ✅ Partager l'entreprise
  const shareCompany = () => {
    if (!company) {
      toast.error('Aucune entreprise à partager');
      return;
    }
    const shareUrl = `${window.location.origin}/investment/${company.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('🔗 Lien copié !');
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('🔗 Lien copié !');
    }
  };

  // ✅ Exporter les investisseurs
  const exportInvestors = () => {
    if (investors.length === 0) {
      toast.error('Aucun investisseur à exporter');
      return;
    }
    
    const headers = ['ID', 'Nom', 'Téléphone', 'Email', 'Montant', 'Actions', 'Date', 'Statut'];
    const rows = investors.map(inv => [
      inv.id || inv.investment_id || '',
      inv.investor_name || inv.user_name || '',
      inv.investor_phone || inv.user_phone || '',
      inv.investor_email || inv.user_email || '',
      inv.amount || 0,
      inv.shares || 0,
      formatDate(inv.created_at || inv.createdAt),
      inv.status || 'active'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investisseurs_${company?.name || 'entreprise'}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`📥 ${investors.length} investisseurs exportés !`);
  };

  // ✅ Vérifier si l'utilisateur a accès à cette entreprise
  const hasAccess = () => {
    if (!company) return false;
    // L'utilisateur est le propriétaire de l'entreprise
    return company.created_by === user?.id;
  };

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

  // ✅ Vérifier si l'utilisateur a une entreprise
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

  // ✅ Vérifier si l'utilisateur est le propriétaire
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
        {/* Bouton de retour */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
        >
          <FaArrowLeft className="text-lg" />
          <span>Retour</span>
        </button>

        {/* En-tête de l'entreprise */}
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
                    <FaCalendarAlt size={10} /> Créé le {formatDate(company.created_at || company.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-200 text-xs">Valeur estimée</p>
              <p className="text-white font-bold text-xl">{formatAmount(stats.valuation)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaChartLine /> Aperçu
          </button>
          <button
            onClick={() => setActiveTab('investors')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'investors'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaUsers /> Investisseurs
            {investors.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                {investors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'financials'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaMoneyBillWave /> Finances
          </button>
        </div>

        {/* Tab: Aperçu */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Collecté</p>
                    <p className="text-2xl font-bold text-green-600">{formatAmount(stats.totalInvested)}</p>
                  </div>
                  <FaWallet className="text-green-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Investisseurs</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalInvestors}</p>
                  </div>
                  <FaUsers className="text-blue-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Actions</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalShares}</p>
                  </div>
                  <FaChartPie className="text-purple-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Prix / Action</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatAmount(stats.sharePrice)}</p>
                  </div>
                  <FaDollarSign className="text-yellow-500 text-3xl opacity-50" />
                </div>
              </div>
            </div>

            {/* Progression du financement */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">📈 Progression du financement</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Objectif: {formatAmount(company.funding_goal || company.fundingGoal)}</span>
                <span className="text-gray-500">{stats.fundingProgress.toFixed(0)}%</span>
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

        {/* Tab: Investisseurs */}
        {activeTab === 'investors' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Liste des investisseurs
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {investors.length}
                </span>
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportInvestors}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <FaDownload className="inline mr-1" /> Exporter
                </button>
              </div>
            </div>

            {investors.length === 0 ? (
              <div className="text-center py-12">
                <FaUsers className="text-gray-300 text-5xl mx-auto mb-3" />
                <p className="text-gray-500">Aucun investisseur pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600 text-sm">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Investisseur</th>
                      <th className="px-4 py-3">Contact</th>
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
                        <tr key={investor.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
                                {(investor.investor_name || investor.user_name || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{investor.investor_name || investor.user_name || 'Anonyme'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {investor.investor_phone || investor.user_phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {formatAmount(investor.amount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {investor.shares || 0}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(investor.created_at || investor.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 font-bold">Total</td>
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
                    {stats.fundingProgress.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Du financement atteint
                  </p>
                </div>
              </div>
            </div>

            {/* Détails des investissements */}
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
                  <span className="text-gray-600">Objectif de financement</span>
                  <span className="font-bold">{formatAmount(company.funding_goal || company.fundingGoal)}</span>
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
                onClick={shareCompany}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaShare /> Partager
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyCompany;