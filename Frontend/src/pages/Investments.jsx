// src/pages/Investments.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
    FaChartLine, FaBuilding, FaUsers, FaMoneyBillWave, FaPlus,
    FaEye, FaCheckCircle, FaTimes, FaClock, FaUser, FaPhone,
    FaMapMarkerAlt, FaEnvelope, FaCalendarAlt, FaDollarSign,
    FaShare, FaRocket, FaShieldAlt, FaArrowLeft, FaWallet,
    FaHistory, FaStar, FaUserPlus, FaBriefcase, FaHandshake,
    FaPercent, FaAward, FaTrophy, FaMedal, FaCertificate,
    FaFileInvoice, FaIdCard, FaSearch, FaFilter, FaSpinner,
    FaGlobe, FaCrown, FaArrowRight, FaInfoCircle, FaChartBar,
    FaBullhorn, FaGift, FaThumbsUp
} from 'react-icons/fa';
import KYCStatus from '../components/KYCStatus';

const Investments = ({ user, socket }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('discover');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [myInvestments, setMyInvestments] = useState([]);
    const [myCompany, setMyCompany] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showCompanyDetail, setShowCompanyDetail] = useState(false);
    const [showCreateCompany, setShowCreateCompany] = useState(false);
    const [showInvestModal, setShowInvestModal] = useState(false);
    const [investAmount, setInvestAmount] = useState('');
    const [shares, setShares] = useState(1);
    const [kycStatus, setKycStatus] = useState({ status: 'none', has_kyc: false, level: 0 });
    const [userBalance, setUserBalance] = useState(0);
    const [investorsCount, setInvestorsCount] = useState(0);
    const [showKYCModal, setShowKYCModal] = useState(false);
    const [statistics, setStatistics] = useState({
        totalInvested: 0,
        totalReturns: 0,
        activeInvestments: 0,
        roi: 0
    });
    const [companyForm, setCompanyForm] = useState({
        name: '',
        fullName: '',
        description: '',
        sector: '',
        location: '',
        website: '',
        email: '',
        phone: '',
        fundingGoal: '',
        equityOffered: '',
        sharesOffered: '',
        sharePrice: '',
        pitch: '',
        team: '',
        achievements: ''
    });

    useEffect(() => {
        if (user) {
            checkKYCStatus();
            fetchUserBalance();
            fetchCompanies();
            fetchMyInvestments();
            fetchMyCompany();
            fetchInvestorsCount();
            fetchStatistics();
        }
    }, [user]);

    // ✅ Vérification KYC
    const checkKYCStatus = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data) {
                setKycStatus(response.data);
                console.log('✅ KYC Status:', response.data);
            } else {
                setKycStatus({ 
                    status: 'none', 
                    has_kyc: false, 
                    level: 0,
                    is_verified: false 
                });
            }
        } catch (error) {
            console.error('❌ Erreur KYC:', error);
            setKycStatus({ 
                status: 'error', 
                has_kyc: false, 
                level: 0,
                is_verified: false,
                message: 'Erreur de chargement'
            });
        }
    };

    // ✅ Vérification KYC avant création - NIVEAU 1 SUFFIT
    const checkKYCBeforeCreate = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const status = response.data.status;
            const level = response.data.level || 0;
            
            // ✅ Niveau 1 suffit
            if (status === 'verified' && level >= 1) {
                setShowCreateCompany(true);
                return true;
            }
            
            if (status === 'pending') {
                toast.error('⏳ Votre demande KYC est en attente de vérification.', { duration: 5000 });
                return false;
            }
            
            if (status === 'rejected') {
                toast.error('❌ Votre demande KYC a été rejetée.', { duration: 5000 });
                setShowKYCModal(true);
                return false;
            }
            
            if (status === 'none' || level < 1) {
                toast.error(`⚠️ Niveau KYC ${level} - Niveau 1 requis pour créer une entreprise.`, { duration: 5000 });
                setShowKYCModal(true);
                return false;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erreur vérification KYC:', error);
            toast.error('Erreur lors de la vérification KYC.');
            return false;
        }
    };

    // ✅ Fonction pour passer au niveau KYC supérieur
    const handleKYCUpgrade = () => {
        const currentLevel = kycStatus.level || 0;
        
        if (currentLevel === 1) {
            toast('📝 Soumettez les documents pour passer au niveau 2', {
                duration: 3000,
                icon: '📝'
            });
            navigate('/kyc-level-2');
        } else if (currentLevel === 2) {
            toast('📝 Soumettez les documents pour passer au niveau 3', {
                duration: 3000,
                icon: '👑'
            });
            navigate('/kyc-level-3');
        } else {
            toast('📝 Complétez votre profil KYC', {
                duration: 3000,
                icon: '📝'
            });
            navigate('/kyc');
        }
    };

    // Récupération du solde
    const fetchUserBalance = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserBalance(response.data.balance || 0);
        } catch (error) {
            console.error('Erreur solde:', error);
            setUserBalance(0);
        }
    };

    // Récupération des entreprises d'investissement
    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data || response.data || [];
            setCompanies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
            setCompanies([]);
            if (error.response?.status === 404) {
                setCompanies(getMockCompanies());
            }
        } finally {
            setLoading(false);
        }
    };

    // Récupération des investissements de l'utilisateur
    const fetchMyInvestments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/my-investments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data || response.data || [];
            setMyInvestments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement investissements:', error);
            setMyInvestments([]);
        }
    };

    // Récupération de l'entreprise de l'utilisateur
    const fetchMyCompany = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/my-company', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyCompany(response.data.data || response.data || null);
        } catch (error) {
            console.error('Erreur chargement entreprise:', error);
            setMyCompany(null);
        }
    };

    // Récupération du nombre d'investisseurs
    const fetchInvestorsCount = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/investors-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvestorsCount(response.data.count || 0);
        } catch (error) {
            console.error('Erreur récupération investisseurs:', error);
            setInvestorsCount(0);
        }
    };

    // Récupération des statistiques
    const fetchStatistics = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/statistics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setStatistics(response.data);
            }
        } catch (error) {
            console.error('Erreur statistiques:', error);
            setStatistics({
                totalInvested: 0,
                totalReturns: 0,
                activeInvestments: 0,
                roi: 0
            });
        }
    };

    // ✅ Création d'une entreprise d'investissement - NIVEAU 1 SUFFIT
    const handleCreateCompany = async (e) => {
        e.preventDefault();

        // ✅ Niveau 1 suffit
        const isKycVerified = kycStatus?.status === 'verified' && (kycStatus?.level || 0) >= 1;
        
        if (!isKycVerified) {
            toast.error('❌ Niveau KYC 1 requis pour créer une entreprise.');
            setShowKYCModal(true);
            return;
        }

        if (!companyForm.name || !companyForm.description || !companyForm.fundingGoal) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            
            const payload = {
                name: companyForm.name,
                fullName: companyForm.fullName || companyForm.name,
                description: companyForm.description,
                sector: companyForm.sector || 'Autre',
                location: companyForm.location || '',
                website: companyForm.website || '',
                email: companyForm.email || '',
                phone: companyForm.phone || '',
                fundingGoal: parseFloat(companyForm.fundingGoal),
                equityOffered: parseFloat(companyForm.equityOffered) || 0,
                sharesOffered: parseInt(companyForm.sharesOffered) || 0,
                sharePrice: parseFloat(companyForm.sharePrice) || 0,
                pitch: companyForm.pitch || '',
                team: companyForm.team || '',
                achievements: companyForm.achievements || ''
            };

            const response = await axios.post('/api/investment/company', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Entreprise créée avec succès !');
                setShowCreateCompany(false);
                setCompanyForm({
                    name: '', fullName: '', description: '', sector: '',
                    location: '', website: '', email: '', phone: '',
                    fundingGoal: '', equityOffered: '', sharesOffered: '',
                    sharePrice: '', pitch: '', team: '', achievements: ''
                });
                fetchCompanies();
                fetchMyCompany();
            } else {
                toast.error(response.data.error || 'Erreur lors de la création');
            }
        } catch (error) {
            console.error('❌ Erreur création:', error);
            if (error.response?.data?.code === 'KYC_REQUIRED' || error.response?.data?.code === 'KYC_LEVEL_INSUFFICIENT') {
                toast.error(error.response?.data?.error || 'Vérification KYC requise');
                setShowKYCModal(true);
            } else {
                toast.error(error.response?.data?.error || 'Erreur lors de la création');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Investir dans une entreprise
    const handleInvest = async () => {
        if (!selectedCompany) {
            toast.error('Aucune entreprise sélectionnée');
            return;
        }

        const amount = parseFloat(investAmount);
        const sharesCount = parseInt(shares);

        if (!amount || amount < (selectedCompany.share_price || 1000)) {
            toast.error(`Montant minimum: ${(selectedCompany.share_price || 1000).toLocaleString()} FCFA`);
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

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('/api/investment/invest', {
                company_id: selectedCompany.id,
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
                fetchUserBalance();
                fetchMyInvestments();
                fetchCompanies();
                fetchInvestorsCount();
                fetchStatistics();
            } else {
                toast.error(response.data.error || 'Erreur lors de l\'investissement');
            }
        } catch (error) {
            console.error('Erreur investissement:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de l\'investissement');
        } finally {
            setSubmitting(false);
        }
    };

    // Voir les détails d'une entreprise
    const handleViewCompanyDetail = (company) => {
        setSelectedCompany(company);
        setShowCompanyDetail(true);
    };

    // Données mock pour le développement
    const getMockCompanies = () => {
        return [
            {
                id: 1,
                name: 'Tech Innovation SA',
                fullName: 'Tech Innovation SA',
                sector: 'Technologie',
                description: 'Startup innovante dans le domaine de l\'IA et du machine learning.',
                funding_goal: 5000000,
                collected_amount: 3200000,
                share_price: 1000,
                shares_available: 5000,
                investors_count: 45,
                location: 'N\'Djamena, Tchad',
                website: 'https://techinnovation.td',
                email: 'contact@techinnovation.td',
                phone: '6622334455',
                color: '#4F46E5',
                is_active: true,
                created_at: new Date().toISOString(),
                user: {
                    fullname: 'Ali Mahamat',
                    phone: '6622334455'
                },
                pitch: 'Nous révolutionnons l\'accès à la technologie en Afrique centrale.',
                team: 'Une équipe de 12 experts en IA et développement.'
            },
            {
                id: 2,
                name: 'Green Energy Tchad',
                fullName: 'Green Energy Tchad',
                sector: 'Énergie',
                description: 'Solutions d\'énergie solaire pour les zones rurales.',
                funding_goal: 8000000,
                collected_amount: 1500000,
                share_price: 2000,
                shares_available: 4000,
                investors_count: 12,
                location: 'Moundou, Tchad',
                website: 'https://greenenergy.td',
                email: 'info@greenenergy.td',
                phone: '6633445566',
                color: '#10B981',
                is_active: true,
                created_at: new Date().toISOString(),
                user: {
                    fullname: 'Fatimé Ali',
                    phone: '6633445566'
                },
                pitch: 'Apporter l\'électricité propre à 5000 foyers ruraux.',
                team: 'Une équipe de 8 ingénieurs et techniciens.'
            },
            {
                id: 3,
                name: 'AgriTech Tchad',
                fullName: 'AgriTech Tchad',
                sector: 'Agriculture',
                description: 'Plateforme de mise en relation entre agriculteurs et acheteurs.',
                funding_goal: 3000000,
                collected_amount: 2800000,
                share_price: 500,
                shares_available: 6000,
                investors_count: 78,
                location: 'N\'Djamena, Tchad',
                website: 'https://agritech.td',
                email: 'contact@agritech.td',
                phone: '6677889900',
                color: '#F59E0B',
                is_active: true,
                created_at: new Date().toISOString(),
                user: {
                    fullname: 'Mahamat Issa',
                    phone: '6677889900'
                },
                pitch: 'Connecter 10000 agriculteurs à des marchés stables.',
                team: 'Une équipe de 15 personnes passionnées par l\'agriculture.'
            }
        ];
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatAmount = (amount) => {
        if (!amount && amount !== 0) return '0 FCFA';
        return amount.toLocaleString() + ' FCFA';
    };

    const getProgressColor = (collected, goal) => {
        if (!collected || !goal) return 'bg-gray-200';
        const percentage = (collected / goal) * 100;
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 60) return 'bg-blue-500';
        if (percentage >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStatusBadge = (company) => {
        const progress = (company.collected_amount / company.funding_goal) * 100;
        if (progress >= 100) return { label: '✅ Financée', color: 'bg-green-100 text-green-700' };
        if (progress >= 50) return { label: '📈 En cours', color: 'bg-blue-100 text-blue-700' };
        return { label: '🔄 Nouvelle', color: 'bg-yellow-100 text-yellow-700' };
    };

    const goToKYC = () => {
        navigate('/kyc');
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    // ✅ Niveau 1 suffit
    const canCreateCompany = kycStatus?.status === 'verified' && (kycStatus?.level || 0) >= 1;

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                {/* Bouton de retour */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
                >
                    <FaArrowLeft className="text-lg" />
                    <span>Retour au tableau de bord</span>
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-r from-green-800 via-green-700 to-teal-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">📈 Investissements</h1>
                            <p className="text-green-200">Investissez dans des entreprises innovantes</p>
                            <div className="flex gap-4 mt-3 text-sm text-green-200">
                                <span>🏢 {companies.length} entreprises</span>
                                <span>👥 {investorsCount} investisseurs</span>
                            </div>
                        </div>
                        <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                            <p className="text-green-200 text-xs">Votre solde</p>
                            <p className="text-white font-bold text-xl">{formatAmount(userBalance)}</p>
                        </div>
                    </div>
                </div>

                {/* KYC Status */}
                <div className="mb-6">
                    <KYCStatus 
                        status={kycStatus.status}
                        level={kycStatus.level}
                        onVerify={goToKYC}
                        onUpgrade={handleKYCUpgrade}
                        message={kycStatus.rejection_reason || kycStatus.message}
                        showUpgrade={kycStatus.status === 'verified'}
                    />
                </div>

                {/* Bannière Niveau 2 - Optionnel (pour upgrade) */}
                {kycStatus.status === 'verified' && kycStatus.level < 2 && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <FaCrown className="text-yellow-500 text-2xl" />
                                <div>
                                    <p className="font-bold text-yellow-700">⭐ Passez au Niveau KYC 2</p>
                                    <p className="text-sm text-gray-600">Plus de fonctionnalités et de limites</p>
                                </div>
                            </div>
                            <button
                                onClick={handleKYCUpgrade}
                                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all flex items-center gap-2 shadow-md"
                            >
                                <FaStar /> Niveau 2 <FaArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Statistiques */}
                {myInvestments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Total investi</p>
                            <p className="text-xl font-bold text-blue-600">{formatAmount(statistics.totalInvested)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Retours</p>
                            <p className="text-xl font-bold text-green-600">{formatAmount(statistics.totalReturns)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Investissements actifs</p>
                            <p className="text-xl font-bold text-purple-600">{statistics.activeInvestments}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">ROI</p>
                            <p className="text-xl font-bold text-yellow-600">{statistics.roi}%</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'discover'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaSearch /> Découvrir
                    </button>
                    <button
                        onClick={() => setActiveTab('my-investments')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'my-investments'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaWallet /> Mes investissements
                        {myInvestments.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs">
                                {myInvestments.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('my-company')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'my-company'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaBuilding /> Mon entreprise
                        {myCompany && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                                Active
                            </span>
                        )}
                    </button>
                    <button
                        onClick={checkKYCBeforeCreate}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            canCreateCompany
                                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        }`}
                        disabled={!canCreateCompany}
                        title={!canCreateCompany ? 'KYC niveau 1 requis' : ''}
                    >
                        <FaPlus /> Créer une entreprise
                        {!canCreateCompany && (
                            <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">KYC requis</span>
                        )}
                    </button>
                </div>

                {/* Tab: Découvrir */}
                {activeTab === 'discover' && (
                    <div>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaBuilding className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune entreprise disponible</p>
                                <button
                                    onClick={checkKYCBeforeCreate}
                                    className="mt-4 text-green-600 hover:text-green-700"
                                >
                                    Créer votre entreprise →
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {companies.map(company => {
                                    const progress = (company.collected_amount / company.funding_goal) * 100;
                                    const isFunded = progress >= 100;
                                    const status = getStatusBadge(company);

                                    return (
                                        <div key={company.id} className="bg-blue-900 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all border border-gray-100">
                                            <div className="p-4 border-b" style={{ borderColor: company.color || '#E5E7EB' }}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-black">{company.name}</h3>
                                                        <p className="text-sm text-white">{company.sector}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-sm text-white line-clamp-2">{company.description}</p>

                                                <div className="mt-4">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-white">Collecté</span>
                                                        <span className="font-bold">{formatAmount(company.collected_amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-amber-50">Objectif</span>
                                                        <span className="font-bold">{formatAmount(company.funding_goal)}</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${getProgressColor(company.collected_amount, company.funding_goal)}`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                        <span className="text-gray-400">{Math.min(progress, 100).toFixed(0)}%</span>
                                                        <span className="text-gray-400">{company.investors_count || 0} investisseurs</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => handleViewCompanyDetail(company)}
                                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <FaEye /> Voir détails
                                                    </button>
                                                    {!isFunded && (
                                                        <button
                                                            onClick={() => {
                                                                if (!canCreateCompany) {
                                                                    toast.error('KYC niveau 1 requis pour investir');
                                                                    setShowKYCModal(true);
                                                                    return;
                                                                }
                                                                setSelectedCompany(company);
                                                                setInvestAmount('');
                                                                setShares(1);
                                                                setShowInvestModal(true);
                                                            }}
                                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <FaMoneyBillWave /> Investir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Mes investissements */}
                {activeTab === 'my-investments' && (
                    <div>
                        {myInvestments.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaWallet className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucun investissement</p>
                                <button
                                    onClick={() => setActiveTab('discover')}
                                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                                >
                                    Découvrir des entreprises →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myInvestments.map(investment => (
                                    <div key={investment.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">{investment.company_name}</h3>
                                                <p className="text-sm text-gray-500">{investment.sector}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                Actif
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Montant investi</p>
                                                <p className="font-bold text-green-600">{formatAmount(investment.amount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Actions</p>
                                                <p className="font-bold">{investment.shares}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Date</p>
                                                <p className="text-sm">{formatDate(investment.created_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Valeur actuelle</p>
                                                <p className="font-bold text-blue-600">{formatAmount(investment.current_value || investment.amount)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const company = companies.find(c => c.id === investment.company_id);
                                                    if (company) handleViewCompanyDetail(company);
                                                }}
                                                className="px-4 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                                            >
                                                Voir l'entreprise
                                            </button>
                                            <button
                                                onClick={() => toast.success('Contrat généré !')}
                                                className="px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                Contrat
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Mon entreprise */}
                {activeTab === 'my-company' && (
                    <div>
                        {!myCompany ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaBuilding className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune entreprise</p>
                                <button
                                    onClick={checkKYCBeforeCreate}
                                    className="mt-4 bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 font-medium"
                                >
                                    Créer votre entreprise →
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                                    <h2 className="text-2xl font-bold">{myCompany.name}</h2>
                                    <p className="text-blue-200">{myCompany.sector}</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Objectif</p>
                                            <p className="text-xl font-bold text-blue-600">{formatAmount(myCompany.funding_goal)}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Collecté</p>
                                            <p className="text-xl font-bold text-green-600">{formatAmount(myCompany.collected_amount)}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Investisseurs</p>
                                            <p className="text-xl font-bold text-purple-600">{myCompany.investors_count || 0}</p>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <h3 className="font-bold mb-2">Description</h3>
                                        <p className="text-gray-700">{myCompany.description}</p>
                                    </div>
                                    {myCompany.pitch && (
                                        <div className="mt-4">
                                            <h3 className="font-bold mb-2">🎯 Pitch</h3>
                                            <p className="text-gray-700">{myCompany.pitch}</p>
                                        </div>
                                    )}
                                    {myCompany.team && (
                                        <div className="mt-4">
                                            <h3 className="font-bold mb-2">👥 Équipe</h3>
                                            <p className="text-gray-700">{myCompany.team}</p>
                                        </div>
                                    )}
                                    <div className="mt-6 pt-4 border-t flex gap-2">
                                        <button
                                            onClick={() => toast.info('Partage bientôt disponible')}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <FaShare className="inline mr-2" /> Partager
                                        </button>
                                        <button
                                            onClick={() => toast.info('Modification bientôt disponible')}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Détail entreprise */}
            {showCompanyDetail && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-3xl w-full bg-blue-900 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-800">Détails</h3>
                            <button onClick={() => setShowCompanyDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                                    <FaBuilding className="text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-yellow-500">{selectedCompany.name}</h2>
                                    <p className="text-fuchsia-600">{selectedCompany.sector}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            selectedCompany.collected_amount >= selectedCompany.funding_goal
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {selectedCompany.collected_amount >= selectedCompany.funding_goal ? '✅ Financée' : '📈 En cours'}
                                        </span>
                                        <span className="text-xs text-white-400">{selectedCompany.investors_count || 0} investisseurs</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-green-400 mb-2">Description</h4>
                                <p className="text-black">{selectedCompany.description}</p>
                            </div>

                            {selectedCompany.pitch && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-green-500 mb-2">🎯 Pitch</h4>
                                    <p className="text-black">{selectedCompany.pitch}</p>
                                </div>
                            )}

                            {selectedCompany.team && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-700 mb-2">👥 Équipe</h4>
                                    <p className="text-gray-600">{selectedCompany.team}</p>
                                </div>
                            )}

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-700 mb-2">📊 Objectifs</h4>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Collecté</span>
                                        <span className="font-bold text-green-600">{formatAmount(selectedCompany.collected_amount)}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Objectif</span>
                                        <span className="font-bold text-blue-600">{formatAmount(selectedCompany.funding_goal)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full ${selectedCompany.collected_amount >= selectedCompany.funding_goal ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min((selectedCompany.collected_amount / selectedCompany.funding_goal) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-gray-400">
                                            {Math.min((selectedCompany.collected_amount / selectedCompany.funding_goal) * 100, 100).toFixed(0)}%
                                        </span>
                                        <span className="text-gray-400">
                                            {formatAmount(selectedCompany.funding_goal - selectedCompany.collected_amount)} restants
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-700 mb-2">📞 Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {selectedCompany.location && (
                                        <p className="text-gray-600"><FaMapMarkerAlt className="inline mr-2" /> {selectedCompany.location}</p>
                                    )}
                                    {selectedCompany.phone && (
                                        <p className="text-gray-600"><FaPhone className="inline mr-2" /> {selectedCompany.phone}</p>
                                    )}
                                    {selectedCompany.email && (
                                        <p className="text-gray-600"><FaEnvelope className="inline mr-2" /> {selectedCompany.email}</p>
                                    )}
                                    {selectedCompany.website && (
                                        <p className="text-gray-600"><FaGlobe className="inline mr-2" /> <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedCompany.website}</a></p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                {selectedCompany.collected_amount < selectedCompany.funding_goal && (
                                    <button
                                        onClick={() => {
                                            if (!canCreateCompany) {
                                                toast.error('KYC niveau 1 requis pour investir');
                                                setShowKYCModal(true);
                                                return;
                                            }
                                            setShowCompanyDetail(false);
                                            setInvestAmount('');
                                            setShares(1);
                                            setShowInvestModal(true);
                                        }}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaMoneyBillWave /> Investir
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowCompanyDetail(false)}
                                    className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Investir */}
            {showInvestModal && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-blue-800 rounded-2xl shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Investir</h3>
                            <button onClick={() => setShowInvestModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Prix par action</span>
                                    <span className="font-bold">{formatAmount(selectedCompany.share_price || 1000)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Votre solde</span>
                                    <span className={`font-bold ${userBalance >= (selectedCompany.share_price || 1000) ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatAmount(userBalance)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'actions</label>
                                    <input
                                        type="number"
                                        value={shares}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setShares(Math.max(1, val));
                                            setInvestAmount((val * (selectedCompany.share_price || 1000)).toString());
                                        }}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant total</label>
                                    <input
                                        type="number"
                                        value={investAmount}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setInvestAmount(val.toString());
                                            const price = selectedCompany.share_price || 1000;
                                            setShares(Math.max(1, Math.round(val / price)));
                                        }}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        min={selectedCompany.share_price || 1000}
                                        step="100"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-800 flex items-start gap-2">
                                    <FaShieldAlt className="mt-0.5" />
                                    <span>Un contrat sera généré automatiquement.</span>
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowInvestModal(false)}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleInvest}
                                    disabled={submitting || parseFloat(investAmount) > userBalance || parseFloat(investAmount) < (selectedCompany.share_price || 1000)}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Confirmer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Créer une entreprise */}
            {showCreateCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold text-white">🚀 Créer votre entreprise</h3>
                            <button onClick={() => setShowCreateCompany(false)} className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCompany} className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                            {(!kycStatus || (kycStatus.status !== 'verified' && !kycStatus.is_verified)) && (
                                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                                        <FaIdCard /> ⚠️ Niveau KYC 1 requis
                                        <button
                                            onClick={goToKYC}
                                            className="text-blue-400 underline font-medium"
                                        >
                                            Vérifier
                                        </button>
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Nom *</label>
                                    <input
                                        type="text"
                                        value={companyForm.name}
                                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        required
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Nom complet</label>
                                    <input
                                        type="text"
                                        value={companyForm.fullName}
                                        onChange={(e) => setCompanyForm({ ...companyForm, fullName: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Secteur *</label>
                                <select
                                    value={companyForm.sector}
                                    onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                                    required
                                    disabled={!canCreateCompany}
                                >
                                    <option value="" className="text-gray-800">Sélectionnez</option>
                                    <option value="Technologie" className="text-gray-800">💻 Technologie</option>
                                    <option value="Santé" className="text-gray-800">🏥 Santé</option>
                                    <option value="Éducation" className="text-gray-800">📚 Éducation</option>
                                    <option value="Agriculture" className="text-gray-800">🌾 Agriculture</option>
                                    <option value="Énergie" className="text-gray-800">⚡ Énergie</option>
                                    <option value="Transport" className="text-gray-800">🚚 Transport</option>
                                    <option value="Finance" className="text-gray-800">💰 Finance</option>
                                    <option value="Immobilier" className="text-gray-800">🏠 Immobilier</option>
                                    <option value="E-commerce" className="text-gray-800">🛒 E-commerce</option>
                                    <option value="Autre" className="text-gray-800">🔧 Autre</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Description *</label>
                                <textarea
                                    value={companyForm.description}
                                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="3"
                                    required
                                    disabled={!canCreateCompany}
                                    placeholder="Décrivez votre entreprise..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Pitch</label>
                                <textarea
                                    value={companyForm.pitch}
                                    onChange={(e) => setCompanyForm({ ...companyForm, pitch: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="2"
                                    disabled={!canCreateCompany}
                                    placeholder="Pourquoi investir ?"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Objectif *</label>
                                    <input
                                        type="number"
                                        value={companyForm.fundingGoal}
                                        onChange={(e) => setCompanyForm({ ...companyForm, fundingGoal: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        required
                                        min="100000"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Actions</label>
                                    <input
                                        type="number"
                                        value={companyForm.sharesOffered}
                                        onChange={(e) => setCompanyForm({ ...companyForm, sharesOffered: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        min="1"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Prix/action</label>
                                    <input
                                        type="number"
                                        value={companyForm.sharePrice}
                                        onChange={(e) => setCompanyForm({ ...companyForm, sharePrice: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        min="100"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Localisation</label>
                                    <input
                                        type="text"
                                        value={companyForm.location}
                                        onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Site web</label>
                                    <input
                                        type="url"
                                        value={companyForm.website}
                                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Équipe</label>
                                <textarea
                                    value={companyForm.team}
                                    onChange={(e) => setCompanyForm({ ...companyForm, team: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="2"
                                    disabled={!canCreateCompany}
                                    placeholder="Présentez votre équipe"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateCompany(false)}
                                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 rounded-lg hover:bg-white/20"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !canCreateCompany}
                                    className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Créer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Investments;