// src/pages/InvestmentDetail.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  FaBuilding, FaUsers, FaMoneyBillWave, FaChartLine, FaArrowLeft,
  FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaShare, FaDownload,
  FaEye, FaPrint, FaDollarSign, FaPercent, FaRocket,
  FaShieldAlt, FaCheckCircle, FaClock, FaInfoCircle, FaCopy,
  FaWallet, FaChartPie, FaUserPlus, FaHandshake, FaStar,
  FaGlobe, FaMapMarkerAlt, FaBriefcase, FaAward, FaTrophy,
  FaTimes, FaFilePdf, FaHistory
  // FaTrendDown et FaTrendUp supprimés car ils n'existent pas
} from 'react-icons/fa';

const InvestmentDetail = ({ user, socket }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [investAmount, setInvestAmount] = useState('');
  const [shares, setShares] = useState(1);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showInvestorsModal, setShowInvestorsModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isInvested, setIsInvested] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCompanyDetail();
      fetchUserBalance();
    }
  }, [id, user]);

  const fetchCompanyDetail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`/api/investment/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompany(response.data);
      setInvestors(response.data.investors || []);
      
      if (user && response.data.user_id === user.id) {
        setIsOwner(true);
      }
      
      if (user && response.data.investors) {
        const hasInvested = response.data.investors.some(inv => inv.investor_id === user.id);
        setIsInvested(hasInvested);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Erreur solde:', error);
    }
  };

  const handleInvest = async () => {
    const amount = parseFloat(investAmount);
    const sharesCount = parseInt(shares);

    if (!amount || amount < (company.share_price || 1000)) {
      toast.error(`Montant minimum: ${(company.share_price || 1000).toLocaleString()} FCFA`);
      return;
    }

    if (amount > userBalance) {
      toast.error('Solde insuffisant');
      return;
    }

    if (sharesCount < 1) {
      toast.error('Veuillez choisir au moins 1 action');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/investment/invest', {
        company_id: company.id,
        amount: amount,
        shares: sharesCount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(`Investissement de ${amount.toLocaleString()} FCFA réussi !`);
        setShowInvestModal(false);
        setInvestAmount('');
        setShares(1);
        fetchCompanyDetail();
        fetchUserBalance();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'investissement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return amount?.toLocaleString() + ' FCFA' || '0 FCFA';
  };

  const formatDateFull = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <div className="text-center py-12">
          <p className="text-white/50">Entreprise non trouvée</p>
          <button 
            onClick={() => navigate('/investments')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retour aux investissements
          </button>
        </div>
      </Layout>
    );
  }

  const progress = company.funding_goal > 0 
    ? (company.collected_amount / company.funding_goal) * 100 
    : 0;
  const isFunded = progress >= 100;
  const remainingAmount = Math.max(company.funding_goal - company.collected_amount, 0);
  const sharePrice = company.share_price || 1000;
  const totalShares = company.shares_offered || 0;
  const soldShares = investors.reduce((sum, inv) => sum + (inv.shares || 0), 0);
  const availableShares = Math.max(totalShares - soldShares, 0);

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
                <p className="text-blue-200">{company.sector}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isFunded ? 'bg-green-500/30 text-green-300' : 'bg-blue-500/30 text-blue-300'
                  }`}>
                    {isFunded ? '✅ Financée' : '📈 En cours de financement'}
                  </span>
                  <span className="text-blue-200 text-xs flex items-center gap-1">
                    <FaCalendarAlt size={10} /> Créée le {formatDate(company.created_at)}
                  </span>
                  {isOwner && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/30 text-yellow-300 rounded-full">
                      👑 Propriétaire
                    </span>
                  )}
                  {isInvested && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/30 text-green-300 rounded-full">
                      💰 Investi
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-200 text-xs">Valeur estimée</p>
              <p className="text-white font-bold text-xl">
                {formatAmount(totalShares * sharePrice)}
              </p>
              <p className="text-blue-200 text-xs">{totalShares} actions disponibles</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">📝 Description</h3>
              <p className="text-gray-700 leading-relaxed">{company.description}</p>
            </div>

            {/* Pitch */}
            {company.pitch && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-4">🎯 Pitch</h3>
                <p className="text-gray-700 leading-relaxed">{company.pitch}</p>
              </div>
            )}

            {/* Équipe */}
            {company.team && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-4">👥 Équipe</h3>
                <p className="text-gray-700 leading-relaxed">{company.team}</p>
              </div>
            )}

            {/* Objectifs */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">🎯 Objectifs de financement</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Objectif</p>
                  <p className="text-xl font-bold text-blue-600">{formatAmount(company.funding_goal)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Collecté</p>
                  <p className="text-xl font-bold text-green-600">{formatAmount(company.collected_amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Restant</p>
                  <p className="text-xl font-bold text-yellow-600">{formatAmount(remainingAmount)}</p>
                </div>
              </div>
            </div>

            {/* Investisseurs */}
            <div className="bg rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FaUsers className="text-blue-500" />
                  Investisseurs ({investors.length})
                </h3>
                {investors.length > 0 && (
                  <button 
                    onClick={() => setShowInvestorsModal(true)}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200"
                  >
                    Voir tous
                  </button>
                )}
              </div>
              {investors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaUsers className="text-gray-300 text-4xl mx-auto mb-2" />
                  <p>Aucun investisseur pour le moment</p>
                </div>
              ) : (
                <div className="divide-y max-h-60 overflow-y-auto">
                  {investors.slice(0, 5).map((investor, index) => (
                    <div key={investor.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{investor.investor_name}</p>
                          <p className="text-sm text-gray-500">
                            {investor.shares || 0} actions • {formatDate(investor.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatAmount(investor.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {investors.length > 5 && (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      + {investors.length - 5} autres investisseurs
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Progression */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">📈 Progression</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">{progress.toFixed(0)}%</span>
                <span className="text-gray-500">{formatAmount(company.collected_amount)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${isFunded ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm mt-3">
                <span className="text-gray-400">Objectif: {formatAmount(company.funding_goal)}</span>
                <span className={`font-medium ${isFunded ? 'text-green-600' : 'text-blue-600'}`}>
                  {isFunded ? '✅ Objectif atteint' : `${formatAmount(remainingAmount)} restants`}
                </span>
              </div>
            </div>

            {/* Informations */}
            <div className="bg-blue-300 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">ℹ️ Informations</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Secteur</span>
                  <span className="font-medium">{company.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix / action</span>
                  <span className="font-bold text-yellow-600">{formatAmount(sharePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actions totales</span>
                  <span className="font-medium">{totalShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actions vendues</span>
                  <span className="font-medium text-green-600">{soldShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actions disponibles</span>
                  <span className="font-medium text-blue-600">{availableShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Investisseurs</span>
                  <span className="font-medium">{investors.length}</span>
                </div>
                {company.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Localisation</span>
                    <span className="font-medium">{company.location}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Site web</span>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Créé le</span>
                  <span>{formatDate(company.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Bouton Investir */}
            {!isFunded && !isOwner && (
              <button
                onClick={() => {
                  setInvestAmount('');
                  setShares(1);
                  setShowInvestModal(true);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <FaMoneyBillWave /> Investir maintenant
              </button>
            )}

            {isOwner && (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <p className="text-yellow-800 text-sm flex items-center gap-2">
                  <FaInfoCircle /> C'est votre entreprise
                </p>
                <button
                  onClick={() => navigate('/my-company')}
                  className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Gérer mon entreprise
                </button>
              </div>
            )}

            {isFunded && !isOwner && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <FaCheckCircle /> Cette entreprise a atteint son objectif
                </p>
              </div>
            )}

            {isInvested && !isOwner && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-blue-800 text-sm flex items-center gap-2">
                  <FaCheckCircle /> Vous avez déjà investi dans cette entreprise
                </p>
              </div>
            )}

            {/* Partager */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Partager cette entreprise</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/investment/${company.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Lien copié !');
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaCopy /> Copier le lien
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/investment/${company.id}`;
                    window.open(`https://wa.me/?text=Investissez dans ${company.name} - ${url}`, '_blank');
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaShare /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Investir */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-blue-500 rounded-2xl shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" />
                Investir dans {company.name}
              </h3>
              <button onClick={() => setShowInvestModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Prix par action</span>
                  <span className="font-bold text-yellow-600">{formatAmount(sharePrice)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Actions disponibles</span>
                  <span className="font-bold text-blue-600">{availableShares}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Votre solde</span>
                  <span className="font-bold text-green-600">{formatAmount(userBalance)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'actions
                  </label>
                  <input
                    type="number"
                    value={shares}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setShares(Math.max(1, Math.min(val, availableShares)));
                      setInvestAmount((val * sharePrice).toString());
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    min="1"
                    max={availableShares}
                  />
                  {shares > availableShares && (
                    <p className="text-red-500 text-xs mt-1">
                      ⚠️ Seulement {availableShares} actions disponibles
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant total (FCFA)
                  </label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setInvestAmount(val.toString());
                      const newShares = Math.max(1, Math.min(Math.round(val / sharePrice), availableShares));
                      setShares(newShares);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    min={sharePrice}
                    step="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Prix minimum: {formatAmount(sharePrice)} ({sharePrice} FCFA × 1 action)
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 flex items-start gap-2">
                  <FaShieldAlt className="mt-0.5" />
                  <span>
                    <strong>Résumé</strong><br />
                    Vous allez acheter <strong>{shares}</strong> action(s) 
                    pour un total de <strong>{formatAmount(parseFloat(investAmount) || 0)}</strong>
                  </span>
                </p>
              </div>

              <div className="flex gap-3 mt-6 text-black">
                <button
                  onClick={() => setShowInvestModal(false)}
                  className="flex-1 border bg-red-700 border-l-2 border-gray-300 placeholder-gray-800 rounded-lg hover:bg-red-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleInvest}
                  disabled={loading || parseFloat(investAmount) > userBalance || shares > availableShares || !investAmount}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <><FaCheckCircle /> Confirmer l'investissement</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Liste des investisseurs */}
      {showInvestorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Investisseurs ({investors.length})
              </h3>
              <button onClick={() => setShowInvestorsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {investors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaUsers className="text-gray-300 text-5xl mx-auto mb-3" />
                  <p>Aucun investisseur pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {investors.map((investor, index) => (
                    <div key={investor.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {investor.investor_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{investor.investor_name}</p>
                            <p className="text-sm text-gray-500">
                              <FaPhone className="inline mr-1 text-xs" />
                              {investor.investor_phone || 'N/A'}
                            </p>
                            {investor.investor_email && (
                              <p className="text-sm text-gray-500">
                                <FaEnvelope className="inline mr-1 text-xs" />
                                {investor.investor_email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatAmount(investor.amount)}</p>
                          <p className="text-sm text-gray-400">{investor.shares || 0} actions</p>
                          <p className="text-xs text-gray-400">{formatDate(investor.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <p className="font-bold">
                      Total collecté: {formatAmount(investors.reduce((sum, inv) => sum + inv.amount, 0))}
                    </p>
                    <p className="text-sm text-gray-500">
                      {investors.reduce((sum, inv) => sum + (inv.shares || 0), 0)} actions vendues
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InvestmentDetail;