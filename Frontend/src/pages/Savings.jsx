// src/pages/Savings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { 
    FaSearch, FaDownload, FaFilePdf, FaFileExcel, 
    FaPrint, FaCalendarAlt, FaChevronLeft, FaPiggyBank,
    FaChevronRight, FaSpinner, FaReceipt, FaArrowLeft,
    FaChartLine, FaMoneyBillWave, FaBuilding, FaPlus,
    FaCheckCircle, FaClock, FaTimes, FaFilter, FaLock,
    FaArrowUp, FaArrowDown, FaWallet, FaEye,
    FaInfoCircle, FaHistory, FaPercentage,
    FaHourglassHalf, FaCoins, FaBell, FaFileInvoice,
    FaUnlock, FaTrophy, FaUserShield, FaCog
} from 'react-icons/fa';

const Savings = ({ user, socket }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savings, setSavings] = useState([]);
    const [stats, setStats] = useState({
        total_savings: 0,
        total_amount: 0,
        simple_amount: 0,
        term_amount: 0,
        active_count: 0
    });
    const [userBalance, setUserBalance] = useState(0);
    const [activeTab, setActiveTab] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSavings, setSelectedSavings] = useState(null);
    const [savingsDetail, setSavingsDetail] = useState(null);

    const [createForm, setCreateForm] = useState({
        type: 'simple',
        name: '',
        target_amount: '',
        end_date: '',
        initial_deposit: ''
    });

    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawReason, setWithdrawReason] = useState('');

    // ✅ Vérifier si l'utilisateur est admin
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);

    useEffect(() => {
        if (user) {
            fetchSavings();
            fetchUserBalance();
        }
    }, [user]);

    // ✅ Récupérer les épargnes
    const fetchSavings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/api/savings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavings(response.data.data || []);
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Récupérer le solde
    const fetchUserBalance = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/api/wallet/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserBalance(response.data.balance || 0);
        } catch (error) {
            console.error('Erreur solde:', error);
        }
    };

    // ✅ Créer une épargne
    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`${API_URL}/api/savings', createForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                toast.success('✅ Épargne créée avec succès !');
                setShowCreateModal(false);
                setCreateForm({
                    type: 'simple',
                    name: '',
                    target_amount: '',
                    end_date: '',
                    initial_deposit: ''
                });
                fetchSavings();
                fetchUserBalance();
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la création');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Déposer
    const handleDeposit = async () => {
        const amount = parseInt(depositAmount);
        if (!amount || amount < 100) {
            toast.error('Montant minimum 100 FCFA');
            return;
        }
        
        if (amount > userBalance) {
            toast.error('Solde insuffisant');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`/api/savings/${selectedSavings.id}/deposit`, 
                { amount }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                toast.success(`✅ Dépôt de ${amount.toLocaleString()} FCFA effectué !`);
                setShowDepositModal(false);
                setDepositAmount('');
                fetchSavings();
                fetchUserBalance();
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur lors du dépôt');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Demander un retrait
    const handleWithdrawRequest = async () => {
        const amount = parseInt(withdrawAmount);
        if (!amount || amount < 100) {
            toast.error('Montant minimum 100 FCFA');
            return;
        }
        
        if (amount > selectedSavings.current_amount) {
            toast.error('Solde épargne insuffisant');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`/api/savings/${selectedSavings.id}/withdraw-request`, 
                { amount, reason: withdrawReason }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                const fee = response.data.data.fee;
                const net = response.data.data.net_amount;
                toast.success(`✅ Demande envoyée ! Net après frais (0,1%): ${net.toLocaleString()} FCFA`);
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setWithdrawReason('');
                fetchSavings();
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la demande');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Voir détails
    const handleViewDetail = async (savingsItem) => {
        setSelectedSavings(savingsItem);
        setShowDetailModal(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`/api/savings/${savingsItem.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavingsDetail(response.data.data);
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    };

    // ✅ Aller à la page de gestion admin
    const goToAdminManagement = () => {
        navigate('/admin/savings');
    };

    const formatAmount = (amount) => {
        if (!amount && amount !== 0) return '0 FCFA';
        return amount.toLocaleString() + ' FCFA';
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getProgress = (savingsItem) => {
        if (!savingsItem.target_amount || savingsItem.target_amount === 0) return 0;
        return Math.min((savingsItem.current_amount / savingsItem.target_amount) * 100, 100);
    };

    const getProgressColor = (progress) => {
        if (progress >= 100) return 'bg-green-500';
        if (progress >= 60) return 'bg-blue-500';
        if (progress >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const canWithdraw = (savingsItem) => {
        if (savingsItem.type === 'simple') return true;
        
        const today = new Date();
        const endDate = savingsItem.end_date ? new Date(savingsItem.end_date) : null;
        const targetReached = savingsItem.target_amount > 0 && 
                              savingsItem.current_amount >= savingsItem.target_amount;
        
        if (endDate && today < endDate && !targetReached) return false;
        return true;
    };

    const filteredSavings = savings.filter(s => {
        if (activeTab === 'all') return true;
        if (activeTab === 'simple') return s.type === 'simple';
        if (activeTab === 'term') return s.type === 'term';
        if (activeTab === 'active') return s.status === 'active';
        if (activeTab === 'completed') return s.status === 'completed';
        return true;
    });

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                {/* Bouton retour */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaPiggyBank /> Mon Épargne
                            </h1>
                            <p className="text-purple-200">Épargnez pour vos objectifs</p>
                            <div className="flex gap-4 mt-3 text-sm text-purple-200 flex-wrap">
                                <span>💰 {stats.total_savings || 0} épargnes</span>
                                <span>✅ {stats.active_count || 0} actives</span>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                                <p className="text-purple-200 text-xs">Total épargné</p>
                                <p className="text-white font-bold text-xl">{formatAmount(stats.total_amount || 0)}</p>
                            </div>
                            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                                <p className="text-purple-200 text-xs">Solde wallet</p>
                                <p className="text-white font-bold text-xl">{formatAmount(userBalance)}</p>
                            </div>
                            {/* ✅ Bouton vers la gestion admin (visible uniquement pour admin) */}
                            {isAdmin && (
                                <button
                                    onClick={goToAdminManagement}
                                    className="bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2 text-white transition-colors flex items-center gap-2"
                                    title="Gestion des épargnes (Admin)"
                                >
                                    <FaUserShield />
                                    <span className="text-sm font-medium">Gestion</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bannière Admin */}
                {isAdmin && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <FaUserShield className="text-red-500 text-2xl" />
                                <div>
                                    <p className="font-bold text-red-700">🛡️ Mode Administrateur</p>
                                    <p className="text-sm text-red-600">
                                        Accédez à la gestion complète des épargnes et validez les demandes de retrait
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={goToAdminManagement}
                                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all flex items-center gap-2 shadow-md"
                            >
                                <FaCog /> Gérer les épargnes
                            </button>
                        </div>
                    </div>
                )}

                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500">Total épargné</p>
                        <p className="text-xl font-bold text-purple-600">{formatAmount(stats.total_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">Épargne simple</p>
                        <p className="text-xl font-bold text-blue-600">{formatAmount(stats.simple_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-orange-500">
                        <p className="text-sm text-gray-500">Épargne à terme</p>
                        <p className="text-xl font-bold text-orange-600">{formatAmount(stats.term_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Épargnes actives</p>
                        <p className="text-xl font-bold text-green-600">{stats.active_count || 0}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition shadow-md flex items-center gap-2"
                    >
                        <FaPlus /> Nouvelle épargne
                    </button>
                    
                    {/* ✅ Bouton admin dans les actions */}
                    {isAdmin && (
                        <button
                            onClick={goToAdminManagement}
                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition shadow-md flex items-center gap-2"
                        >
                            <FaUserShield /> Gestion Admin
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    {[
                        { id: 'all', label: 'Toutes', icon: FaPiggyBank },
                        { id: 'simple', label: 'Simples', icon: FaWallet },
                        { id: 'term', label: 'À terme', icon: FaLock },
                        { id: 'active', label: 'Actives', icon: FaCheckCircle },
                        { id: 'completed', label: 'Complétées', icon: FaTrophy }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Liste */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <FaSpinner className="animate-spin text-purple-500 text-4xl" />
                    </div>
                ) : filteredSavings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <FaPiggyBank className="text-gray-300 text-6xl mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">Aucune épargne</p>
                        <p className="text-gray-400 text-sm mb-4">Commencez à épargner dès maintenant</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            Créer ma première épargne
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredSavings.map(item => {
                            const progress = getProgress(item);
                            const isTerm = item.type === 'term';
                            const canWithdrawNow = canWithdraw(item);
                            
                            return (
                                <div key={item.id} className="bg- rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
                                    {/* En-tête */}
                                    <div className={`p-4 ${isTerm ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'} text-white`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                                    {isTerm ? <FaLock /> : <FaWallet />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{item.name}</h3>
                                                    <p className="text-xs opacity-80">
                                                        {isTerm ? 'Épargne à terme' : 'Épargne simple'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                item.status === 'active' ? 'bg-green-500/30 text-white' :
                                                item.status === 'completed' ? 'bg-blue-500/30 text-white' :
                                                'bg-gray-500/30 text-white'
                                            }`}>
                                                {item.status === 'active' ? '✅ Active' :
                                                 item.status === 'completed' ? '🎯 Atteinte' :
                                                 item.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Corps */}
                                    <div className="p-4">
                                        <div className="text-center mb-4">
                                            <p className="text-sm text-gray-500">Solde actuel</p>
                                            <p className="text-3xl font-bold text-gray-800">
                                                {formatAmount(item.current_amount)}
                                            </p>
                                            {isTerm && item.target_amount > 0 && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Objectif: {formatAmount(item.target_amount)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Progression */}
                                        {isTerm && item.target_amount > 0 && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-500">Progression</span>
                                                    <span className="font-bold">{progress.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className={`h-3 rounded-full ${getProgressColor(progress)} transition-all`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Infos date limite */}
                                        {isTerm && item.end_date && (
                                            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <FaCalendarAlt className="text-orange-500" />
                                                    <span className="text-orange-700">
                                                        Échéance: <strong>{formatDate(item.end_date)}</strong>
                                                    </span>
                                                </div>
                                                {!canWithdrawNow && (
                                                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                        <FaInfoCircle size={10} />
                                                        Retrait disponible après échéance ou objectif atteint
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedSavings(item);
                                                    setDepositAmount('');
                                                    setShowDepositModal(true);
                                                }}
                                                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-1"
                                            >
                                                <FaArrowUp size={12} /> Déposer
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedSavings(item);
                                                    setWithdrawAmount('');
                                                    setWithdrawReason('');
                                                    setShowWithdrawModal(true);
                                                }}
                                                disabled={!canWithdrawNow}
                                                className={`flex-1 py-2 rounded-lg transition text-sm flex items-center justify-center gap-1 ${
                                                    canWithdrawNow
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                                title={!canWithdrawNow ? 'Retrait non disponible' : ''}
                                            >
                                                <FaArrowDown size={12} /> Retirer
                                            </button>
                                            <button
                                                onClick={() => handleViewDetail(item)}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                                title="Voir détails"
                                            >
                                                <FaEye size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Créer une épargne */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="relative max-w-lg w-full bg-blue-900/70 rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaPiggyBank /> Nouvelle épargne
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-70 mb-2">
                                    Type d'épargne *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreateForm({ ...createForm, type: 'simple' })}
                                        className={`p-4 rounded-xl border-2 transition text-left ${
                                            createForm.type === 'simple'
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <FaWallet className={`text-2xl mb-2 ${createForm.type === 'simple' ? 'text-purple-600' : 'text-gray-400'}`} />
                                        <p className="text-fuchsia-600 font-bold">Épargne Simple</p>
                                        <p className="text-xs text-black mt-1">Retrait à tout moment</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCreateForm({ ...createForm, type: 'term' })}
                                        className={`p-4 rounded-xl border-2 transition text-left ${
                                            createForm.type === 'term'
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <FaLock className={`text-2xl mb-2 ${createForm.type === 'term' ? 'text-orange-600' : 'text-gray-400'}`} />
                                        <p className="text-orange-500 font-bold">Épargne à Terme</p>
                                        <p className="text-xs text-black mt-1">Objectif + Date limite</p>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-70 mb-1">
                                    Nom de l'épargne *
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="Ex: Achat moto, Voyage..."
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            {createForm.type === 'term' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-70 mb-1">
                                            Montant objectif (FCFA) *
                                        </label>
                                        <input
                                            type="number"
                                            value={createForm.target_amount}
                                            onChange={(e) => setCreateForm({ ...createForm, target_amount: e.target.value })}
                                            placeholder="Ex: 500000"
                                            min="1000"
                                            step="1000"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                            required={createForm.type === 'term'}
                                        />
                                        <p className="text-xs text-gray-50 mt-1">Minimum 1 000 FCFA</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-70 mb-1">
                                            Date d'échéance *
                                        </label>
                                        <input
                                            type="date"
                                            value={createForm.end_date}
                                            onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                            required={createForm.type === 'term'}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-70 mb-1">
                                    Dépôt initial (optionnel)
                                </label>
                                <input
                                    type="number"
                                    value={createForm.initial_deposit}
                                    onChange={(e) => setCreateForm({ ...createForm, initial_deposit: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    step="100"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                                <p className="text-xs text-gray-50 mt-1">
                                    Solde disponible: {formatAmount(userBalance)}
                                </p>
                            </div>

                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                <p className="text-xs text-purple-700 flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                                    <span>
                                        {createForm.type === 'simple' 
                                            ? 'Vous pourrez retirer à tout moment avec des frais de 0,1%.'
                                            : 'Le retrait ne sera possible qu\'après l\'échéance OU après avoir atteint l\'objectif.'
                                        }
                                    </span>
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-red-500 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Créer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Déposer */}
            {showDepositModal && selectedSavings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative max-w-md w-full bg-blue-900 rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaArrowUp /> Déposer dans {selectedSavings.name}
                            </h3>
                            <button onClick={() => setShowDepositModal(false)} className="text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Solde épargne</span>
                                    <span className="text-black font-bold">{formatAmount(selectedSavings.current_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Votre wallet</span>
                                    <span className="font-bold text-green-600">{formatAmount(userBalance)}</span>
                                </div>
                                {selectedSavings.type === 'term' && selectedSavings.target_amount > 0 && (
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                        <span className="text-gray-500">Restant pour objectif</span>
                                        <span className="font-bold text-orange-600">
                                            {formatAmount(selectedSavings.target_amount - selectedSavings.current_amount)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-70 mb-1">
                                    Montant à déposer (FCFA)
                                </label>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Montant"
                                    min="100"
                                    step="100"
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-bold text-center"
                                />
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {[1000, 5000, 10000, 25000].map(amount => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setDepositAmount(amount.toString())}
                                            className="px-3 py-1 bg-green-400 rounded-lg text-sm hover:bg-gray-200"
                                        >
                                            {amount.toLocaleString()}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setDepositAmount(userBalance.toString())}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowDepositModal(false)}
                                    className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-red-500 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeposit}
                                    disabled={submitting || !depositAmount || parseInt(depositAmount) > userBalance}
                                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Déposer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Retirer */}
            {showWithdrawModal && selectedSavings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative max-w-md w-full bg-blue-900 rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaArrowDown /> Retrait - {selectedSavings.name}
                            </h3>
                            <button onClick={() => setShowWithdrawModal(false)} className="text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <p className="text-xs text-yellow-800 flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                                    <span>
                                        Votre demande sera envoyée à un administrateur pour validation. 
                                        Des frais de <strong>0,1%</strong> seront appliqués.
                                    </span>
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Solde épargne</span>
                                    <span className="text-green-600 font-bold">{formatAmount(selectedSavings.current_amount)}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">
                                        Montant à retirer (FCFA)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="Montant"
                                        min="100"
                                        step="100"
                                        max={selectedSavings.current_amount}
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-bold text-center"
                                    />
                                </div>

                                {withdrawAmount && parseInt(withdrawAmount) > 0 && (
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Montant demandé</span>
                                            <span className="font-bold">{formatAmount(parseInt(withdrawAmount))}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-600">Frais (0,1%)</span>
                                            <span className="font-bold text-red-600">
                                                - {formatAmount(Math.max(1, Math.round(parseInt(withdrawAmount) * 0.001)))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1 pt-1 border-t border-blue-200">
                                            <span className="text-gray-800 font-medium">Net à recevoir</span>
                                            <span className="font-bold text-green-600">
                                                {formatAmount(parseInt(withdrawAmount) - Math.max(1, Math.round(parseInt(withdrawAmount) * 0.001)))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">
                                        Raison (optionnel)
                                    </label>
                                    <textarea
                                        value={withdrawReason}
                                        onChange={(e) => setWithdrawReason(e.target.value)}
                                        placeholder="Raison du retrait..."
                                        rows="2"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-red-500 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleWithdrawRequest}
                                    disabled={submitting || !withdrawAmount || parseInt(withdrawAmount) > selectedSavings.current_amount}
                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Envoyer la demande</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Détail */}
            {showDetailModal && selectedSavings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FaEye /> Détails - {selectedSavings.name}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-purple-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Type</p>
                                    <p className="font-bold text-purple-700">
                                        {selectedSavings.type === 'simple' ? '💰 Simple' : '🔒 À terme'}
                                    </p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Statut</p>
                                    <p className="font-bold text-green-700">
                                        {selectedSavings.status === 'active' ? '✅ Active' : '🎯 Atteinte'}
                                    </p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Solde actuel</p>
                                    <p className="font-bold text-blue-700">{formatAmount(selectedSavings.current_amount)}</p>
                                </div>
                                {selectedSavings.type === 'term' && (
                                    <div className="bg-orange-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Objectif</p>
                                        <p className="font-bold text-orange-700">{formatAmount(selectedSavings.target_amount)}</p>
                                    </div>
                                )}
                            </div>

                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <FaHistory /> Historique des transactions
                            </h4>
                            
                            {!savingsDetail?.transactions || savingsDetail.transactions.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Aucune transaction</p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {savingsDetail.transactions.map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                                    tx.type === 'withdrawal' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                    {tx.type === 'deposit' ? <FaArrowUp /> : 
                                                     tx.type === 'withdrawal' ? <FaArrowDown /> : 
                                                     <FaPercentage />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {tx.type === 'deposit' ? 'Dépôt' :
                                                         tx.type === 'withdrawal' ? 'Retrait' : 'Intérêt'}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${
                                                    tx.type === 'deposit' ? 'text-green-600' : 'text-blue-600'
                                                }`}>
                                                    {tx.type === 'deposit' ? '+' : '-'}{formatAmount(tx.amount)}
                                                </p>
                                                {tx.fee > 0 && (
                                                    <p className="text-xs text-red-500">Frais: {formatAmount(tx.fee)}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {savingsDetail?.pending_withdrawals?.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaClock /> Demandes en attente
                                    </h4>
                                    <div className="space-y-2">
                                        {savingsDetail.pending_withdrawals.map(w => (
                                            <div key={w.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-yellow-800">Retrait en attente</p>
                                                        <p className="text-xs text-yellow-600">
                                                            Demandé le {formatDate(w.requested_at)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-yellow-800">{formatAmount(w.amount)}</p>
                                                        <p className="text-xs text-yellow-600">
                                                            Net: {formatAmount(w.net_amount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setDepositAmount('');
                                        setShowDepositModal(true);
                                    }}
                                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    <FaArrowUp /> Déposer
                                </button>
                                {canWithdraw(selectedSavings) && (
                                    <button
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            setWithdrawAmount('');
                                            setWithdrawReason('');
                                            setShowWithdrawModal(true);
                                        }}
                                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                    >
                                        <FaArrowDown /> Retirer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Savings;