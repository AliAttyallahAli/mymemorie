// src/pages/CompanyDashboard.jsx - Version complète et corrigée
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaWallet, FaMoneyBillWave, FaHistory, FaChartLine, 
  FaBuilding, FaWater, FaBolt, FaUsers, FaReceipt,
  FaArrowRight, FaCopy, FaCheckCircle, FaSpinner,
  FaExchangeAlt, FaPhone, FaUser, FaEnvelope,
  FaMapMarkerAlt, FaCalendarAlt, FaTimes,
  FaDownload, FaEye, FaPrint, FaShare, FaArrowLeft, FaHome,
  FaCreditCard, FaClock, FaPercent,
  FaUserFriends, FaCog, FaBell, FaSearch, FaFilter,
  FaArrowUp
} from 'react-icons/fa';

const CompanyDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [paymentData, setPaymentData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    meter_number: '',
    account_number: '',
    amount: '',
    period: '',
    invoice_number: ''
  });
  const [paying, setPaying] = useState(false);
  const [searchMeter, setSearchMeter] = useState('');
  const [meterInfo, setMeterInfo] = useState(null);
  const [searchingMeter, setSearchingMeter] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api';

  const fetchCompanyData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/company/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanyData(response.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const handleSearchMeter = async () => {
    if (!searchMeter) {
      toast.error('Veuillez entrer un numéro de compteur');
      return;
    }

    setSearchingMeter(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/bill-payments/search-meter`, {
        meter_number: searchMeter,
        company_id: companyData?.company?.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMeterInfo(response.data.data);
        setPaymentData(prev => ({
          ...prev,
          customer_name: response.data.data.customer_name,
          customer_phone: response.data.data.customer_phone || '',
          customer_address: response.data.data.address || '',
          amount: response.data.data.outstanding_amount || 0,
          period: response.data.data.period || ''
        }));
        toast.success('✅ Compteur trouvé');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Compteur non trouvé');
      setMeterInfo(null);
    } finally {
      setSearchingMeter(false);
    }
  };

  const handlePayment = async () => {
    const { customer_name, customer_phone, amount, meter_number } = paymentData;
    
    if (!customer_name || !customer_phone || !amount || !meter_number) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amountNum = parseInt(amount);
    if (amountNum < 100) {
      toast.error('Montant minimum 100 FCFA');
      return;
    }

    setPaying(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/bill-payment`, {
        company_id: companyData?.company?.id,
        customer_name: paymentData.customer_name,
        customer_phone: paymentData.customer_phone,
        customer_email: paymentData.customer_email || '',
        customer_address: paymentData.customer_address || '',
        meter_number: paymentData.meter_number,
        account_number: paymentData.account_number || '',
        amount: amountNum,
        period: paymentData.period || '',
        invoice_number: paymentData.invoice_number || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('✅ Paiement effectué avec succès');
        setPaymentData({
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          customer_address: '',
          meter_number: '',
          account_number: '',
          amount: '',
          period: '',
          invoice_number: ''
        });
        setMeterInfo(null);
        setSearchMeter('');
        fetchCompanyData();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du paiement');
    } finally {
      setPaying(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferPhone || !transferAmount) {
      toast.error('Téléphone et montant requis');
      return;
    }
    
    const amountNum = parseInt(transferAmount);
    if (amountNum < 100) {
      toast.error('Montant minimum 100 FCFA');
      return;
    }
    
    if (amountNum > companyData?.wallet?.balance) {
      toast.error('Solde insuffisant');
      return;
    }
    
    setTransferring(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_URL}/company/transfer`, {
        to_phone: transferPhone,
        amount: amountNum,
        description: `Transfert depuis ${companyData?.company?.name}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(`✅ Transfert de ${amountNum.toLocaleString()} FCFA effectué`);
        setShowTransferModal(false);
        setTransferAmount('');
        setTransferPhone('');
        fetchCompanyData();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du transfert');
    } finally {
      setTransferring(false);
    }
  };

  const copyToClipboard = (text, label = 'Copié') => {
    navigator.clipboard.writeText(text);
    toast.success(`✅ ${label} !`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleGoBack = () => navigate(-1);
  const handleGoHome = () => navigate('/');

  // Composant StatCard
  const StatCard = ({ icon: Icon, label, value, subtitle, color, bgColor }) => (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 ${color} hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className="text-xl" />
        </div>
      </div>
    </div>
  );

  // Composant QuickAction
  const QuickAction = ({ icon: Icon, label, onClick, color = 'bg-yellow-500' }) => (
    <button
      onClick={onClick}
      className={`${color} text-white rounded-xl p-4 text-center hover:shadow-lg transition-all duration-300 w-full`}
    >
      <Icon className="text-2xl mx-auto mb-2" />
      <p className="text-sm font-medium">{label}</p>
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md">
          <FaBuilding className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Aucune entreprise associée</h2>
          <p className="text-gray-500 mb-4">Vous n'êtes pas encore associé à une entreprise.</p>
         <p className="text-gray-500 mb-4">reservez pour leq entrprise de service comme ZIZ.</p>
          <button onClick={handleGoHome} className="bg-yellow-500 text-white px-6 py-2 rounded-xl hover:bg-yellow-600 transition">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const { company, wallet, statistics, recent_payments } = companyData;
  const isWaterCompany = company?.type === 'water';
  const isElectricityCompany = company?.type === 'electricity';
  const isTaxOffice = company?.type === 'tax_office';
  const isTravelAgency = company?.type === 'travel_agency';
  const canCollectPayments = isWaterCompany || isElectricityCompany || isTaxOffice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header avec navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              <FaArrowLeft className="text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Retour</span>
            </button>
            
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <FaHome />
              <span className="text-sm font-medium">Accueil</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
            <div className="bg-white rounded-xl px-4 py-2 shadow-md">
              <p className="text-xs text-gray-400">Solde</p>
              <p className="font-bold text-yellow-600">{wallet?.balance?.toLocaleString() || 0} FCFA</p>
            </div>
          </div>
        </div>

        {/* Banner entreprise */}
        <div className="relative bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-500 rounded-2xl p-6 mb-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                {company?.logo || (isWaterCompany ? '💧' : isElectricityCompany ? '⚡' : '🏢')}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{company?.name}</h1>
                <p className="text-yellow-100 text-sm">
                  {isWaterCompany && '🏭 Fournisseur d\'eau'}
                  {isElectricityCompany && '⚡ Fournisseur d\'électricité'}
                  {isTaxOffice && '🏛️ Service d\'impôts'}
                  {isTravelAgency && '✈️ Agence de voyage'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <FaPhone className="text-yellow-200 text-xs" />
                  <span className="text-sm text-yellow-100">{user?.phone || company?.contact_phone}</span>
                  <button 
                    onClick={() => copyToClipboard(user?.phone || company?.contact_phone, 'Numéro copié')}
                    className="text-yellow-200 hover:text-white transition text-xs"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-yellow-200">Transactions</p>
                <p className="font-bold">{statistics?.total_payments || 0}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-yellow-200">Revenus</p>
                <p className="font-bold">{statistics?.total_received?.toLocaleString() || 0} FCFA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation onglets */}
        <div className="bg-white rounded-2xl shadow-lg p-1.5 mb-6 flex flex-wrap gap-1">
          {[
            { id: 'dashboard', icon: FaChartLine, label: 'Tableau de bord' },
            ...(canCollectPayments ? [{ id: 'payments', icon: FaReceipt, label: 'Paiements' }] : []),
            { id: 'history', icon: FaHistory, label: 'Historique' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className={activeTab === tab.id ? 'text-white' : 'text-gray-400'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard 
                icon={FaWallet}
                label="Solde disponible"
                value={`${wallet?.balance?.toLocaleString() || 0} FCFA`}
                color="border-yellow-500"
                bgColor="bg-yellow-100 text-yellow-600"
              />
              <StatCard 
                icon={FaMoneyBillWave}
                label="Total reçu"
                value={`${statistics?.total_received?.toLocaleString() || 0} FCFA`}
                subtitle={`${statistics?.total_payments || 0} transactions`}
                color="border-green-500"
                bgColor="bg-green-100 text-green-600"
              />
              <StatCard 
                icon={FaPercent}
                label="Frais collectés"
                value={`${statistics?.total_fees?.toLocaleString() || 0} FCFA`}
                subtitle="Commission 1.5%"
                color="border-blue-500"
                bgColor="bg-blue-100 text-blue-600"
              />
              <StatCard 
                icon={FaUsers}
                label="Clients servis"
                value={statistics?.total_clients || 0}
                subtitle="Clients uniques"
                color="border-purple-500"
                bgColor="bg-purple-100 text-purple-600"
              />
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {canCollectPayments && (
                <QuickAction
                  icon={FaReceipt}
                  label="Collecter un paiement"
                  onClick={() => setActiveTab('payments')}
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
              )}
              <QuickAction
                icon={FaExchangeAlt}
                label="Faire un transfert"
                onClick={() => setShowTransferModal(true)}
                color="bg-gradient-to-br from-green-500 to-green-600"
              />
              <QuickAction
                icon={FaCopy}
                label="Copier mon numéro"
                onClick={() => copyToClipboard(user?.phone || company?.contact_phone, 'Numéro copié')}
                color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
              <QuickAction
                icon={FaPrint}
                label="Imprimer le rapport"
                onClick={() => window.print()}
                color="bg-gradient-to-br from-gray-600 to-gray-700"
              />
            </div>

            {/* Derniers paiements */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FaClock className="text-yellow-500" /> Derniers paiements reçus
                </h2>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 transition flex items-center gap-1"
                >
                  Voir tout <FaArrowRight className="text-xs" />
                </button>
              </div>
              
              {recent_payments?.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <FaReceipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="font-medium">Aucun paiement reçu</p>
                  <p className="text-sm">Les paiements apparaîtront ici une fois effectués</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recent_payments?.slice(0, 5).map((payment, index) => (
                    <div
                      key={payment.receipt_number}
                      className="p-4 hover:bg-gray-50 transition cursor-pointer flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <FaCheckCircle />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{payment.customer_name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <FaPhone className="text-xs" /> {payment.customer_phone}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">#{payment.receipt_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          +{payment.amount?.toLocaleString() || 0} FCFA
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Paiements */}
        {activeTab === 'payments' && canCollectPayments && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FaReceipt className="text-yellow-600 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Collecter un paiement</h2>
                <p className="text-sm text-gray-500">Encaisser un paiement client directement sur votre compte</p>
              </div>
            </div>

            {(isWaterCompany || isElectricityCompany) && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 rounded-xl border border-blue-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaSearch className="inline mr-2 text-blue-500" /> Rechercher un compteur
                </label>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={searchMeter}
                    onChange={(e) => setSearchMeter(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Entrez le numéro de compteur"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchMeter()}
                  />
                  <button
                    onClick={handleSearchMeter}
                    disabled={searchingMeter}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {searchingMeter ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                    Rechercher
                  </button>
                </div>
                
                {meterInfo && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-semibold text-green-800 flex items-center gap-2">
                      <FaCheckCircle className="text-green-500" /> Informations trouvées
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <span className="text-gray-500">Client</span>
                      <span className="font-medium">{meterInfo.customer_name}</span>
                      <span className="text-gray-500">Adresse</span>
                      <span>{meterInfo.address}</span>
                      <span className="text-gray-500">Montant dû</span>
                      <span className="font-bold text-green-700">{meterInfo.outstanding_amount?.toLocaleString()} FCFA</span>
                      <span className="text-gray-500">Période</span>
                      <span>{meterInfo.period}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentData.customer_name}
                    onChange={(e) => setPaymentData({...paymentData, customer_name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={paymentData.customer_phone}
                    onChange={(e) => setPaymentData({...paymentData, customer_phone: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Ex: 62787300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={paymentData.customer_email}
                    onChange={(e) => setPaymentData({...paymentData, customer_email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                  <input
                    type="text"
                    value={paymentData.customer_address}
                    onChange={(e) => setPaymentData({...paymentData, customer_address: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Adresse du client"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isWaterCompany ? 'N° Compteur' : 'N° Contrat'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentData.meter_number}
                    onChange={(e) => setPaymentData({...paymentData, meter_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder={isWaterCompany ? 'Ex: 123456789' : 'Ex: CON-2026-001'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Montant (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Montant à payer"
                    min="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Période</label>
                  <input
                    type="text"
                    value={paymentData.period}
                    onChange={(e) => setPaymentData({...paymentData, period: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Ex: Janvier 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Facture</label>
                  <input
                    type="text"
                    value={paymentData.invoice_number}
                    onChange={(e) => setPaymentData({...paymentData, invoice_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                    placeholder="Numéro de facture"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentData({
                      customer_name: '',
                      customer_phone: '',
                      customer_email: '',
                      customer_address: '',
                      meter_number: '',
                      account_number: '',
                      amount: '',
                      period: '',
                      invoice_number: ''
                    });
                    setMeterInfo(null);
                    setSearchMeter('');
                  }}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2.5 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><FaSpinner className="animate-spin" /> Traitement...</>
                  ) : (
                    <><FaCheckCircle /> Effectuer le paiement</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaHistory className="text-yellow-500" /> Historique complet des paiements
              </h2>
            </div>
            
            {recent_payments?.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FaReceipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="font-medium">Aucun paiement enregistré</p>
                <p className="text-sm">Les paiements apparaîtront ici une fois effectués</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reçu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recent_payments?.map((payment) => (
                      <tr key={payment.receipt_number} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {payment.receipt_number?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{payment.customer_name}</p>
                          <p className="text-xs text-gray-500">{payment.customer_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-800">
                            {payment.amount?.toLocaleString() || 0} FCFA
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-600">
                          {payment.amount_to_company?.toLocaleString() || 0} FCFA
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedReceipt(payment);
                              setShowReceiptModal(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-700 text-sm bg-yellow-50 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition"
                          >
                            <FaEye className="inline mr-1" /> Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="2" className="px-6 py-3 font-bold text-right">Total:</td>
                      <td className="px-6 py-3 font-bold text-green-600 text-right">
                        {recent_payments?.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-3 font-bold text-blue-600 text-right">
                        {recent_payments?.reduce((sum, p) => sum + (p.amount_to_company || 0), 0).toLocaleString()} FCFA
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Transfert */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaExchangeAlt /> Transférer des fonds
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPhone className="inline mr-2 text-gray-400" /> Numéro du destinataire *
                </label>
                <input
                  type="tel"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Ex: 62787307"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMoneyBillWave className="inline mr-2 text-gray-400" /> Montant (FCFA) *
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Montant à transférer"
                  min="100"
                  required
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">Solde disponible: {wallet?.balance?.toLocaleString() || 0} FCFA</p>
                  <button
                    type="button"
                    onClick={() => setTransferAmount(wallet?.balance?.toString() || '0')}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Transférer tout
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {transferring ? (
                    <><FaSpinner className="animate-spin" /> Traitement...</>
                  ) : (
                    <><FaCheckCircle /> Transférer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reçu */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaReceipt /> Détail du paiement
              </h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">✅</div>
                <p className="text-2xl font-bold text-green-600">
                  {selectedReceipt.amount?.toLocaleString() || 0} FCFA
                </p>
                <p className="text-sm text-gray-500 font-mono">Reçu: {selectedReceipt.receipt_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-semibold">{selectedReceipt.customer_name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-semibold">{selectedReceipt.customer_phone}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Montant</p>
                  <p className="font-semibold">{selectedReceipt.amount?.toLocaleString()} FCFA</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Frais</p>
                  <p className="font-semibold">{selectedReceipt.fee?.toLocaleString()} FCFA</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                  <p className="text-xs text-gray-500">Net perçu</p>
                  <p className="font-bold text-green-600 text-lg">
                    {selectedReceipt.amount_to_company?.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-semibold">{formatDate(selectedReceipt.created_at)}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  <FaPrint /> Imprimer
                </button>
                <button
                  onClick={() => copyToClipboard(selectedReceipt.receipt_number, 'Reçu copié')}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2.5 rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <FaCopy /> Copier le reçu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;