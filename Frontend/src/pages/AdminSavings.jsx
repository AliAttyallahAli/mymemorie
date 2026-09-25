// src/pages/AdminSavings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
    FaPiggyBank, FaUsers, FaMoneyBillWave, FaSearch,
    FaEye, FaCheckCircle, FaTimes, FaClock, FaSpinner,
    FaArrowUp, FaArrowDown, FaFilter, FaCalendarAlt,
    FaChartLine, FaBell, FaWallet, FaLock, FaUnlock,
    FaPercentage, FaList, FaDownload, FaInfoCircle
} from 'react-icons/fa';

const AdminSavings = ({ user, socket }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('savings');
    const [savings, setSavings] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [stats, setStats] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [processAction, setProcessAction] = useState('approve');
    const [processComment, setProcessComment] = useState('');

    useEffect(() => {
        fetchSavings();
        fetchWithdrawalRequests();
        fetchStats();
    }, []);

    const fetchSavings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/admin/savings', {
                params: { status: filterStatus, type: filterType, search: searchTerm },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavings(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const fetchWithdrawalRequests = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/admin/savings/withdrawal-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWithdrawalRequests(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/admin/savings/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    };

    const handleProcessWithdrawal = async () => {
        if (!selectedItem) return;
        setSubmitting(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(
                `/api/admin/savings/withdrawal-requests/${selectedItem.id}/process`,
                { action: processAction, comment: processComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                toast.success(processAction === 'approve' 
                    ? '✅ Retrait approuvé et effectué' 
                    : '❌ Demande rejetée');
                setShowProcessModal(false);
                setSelectedItem(null);
                setProcessComment('');
                fetchSavings();
                fetchWithdrawalRequests();
                fetchStats();
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    const formatAmount = (amount) => {
        if (!amount && amount !== 0) return '0 FCFA';
        return amount.toLocaleString() + ' FCFA';
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const pendingCount = withdrawalRequests.filter(r => r.status === 'pending').length;

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaPiggyBank /> Gestion des Épargnes
                            </h1>
                            <p className="text-blue-200">Administration du système d'épargne</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                                <p className="text-blue-200 text-xs">Total épargné</p>
                                <p className="text-white font-bold text-xl">{formatAmount(stats.total_amount || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500">Épargnes</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.total_savings || 0}</p>
                        <p className="text-xs text-gray-400">{stats.total_users || 0} utilisateurs</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Total épargné</p>
                        <p className="text-xl font-bold text-green-600">{formatAmount(stats.total_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">Simple</p>
                        <p className="text-xl font-bold text-blue-600">{formatAmount(stats.simple_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-orange-500">
                        <p className="text-sm text-gray-500">À terme</p>
                        <p className="text-xl font-bold text-orange-600">{formatAmount(stats.term_amount || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-red-500 relative">
                        <p className="text-sm text-gray-500">Retraits en attente</p>
                        <p className="text-2xl font-bold text-red-600">{stats.pending_count || 0}</p>
                        {pendingCount > 0 && (
                            <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('savings')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'savings'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaPiggyBank /> Toutes les épargnes
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawals')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 relative ${
                            activeTab === 'withdrawals'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaBell /> Demandes de retrait
                        {pendingCount > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab: Savings */}
                {activeTab === 'savings' && (
                    <div>
                        {/* Filtres */}
                        <div className="bg-blue-800/35 rounded-xl shadow-md p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-blue-800/100 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tous les types</option>
                                    <option value="simple">Simple</option>
                                    <option value="term">À terme</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="bg-blue-800/100 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="active">Actives</option>
                                    <option value="completed">Complétées</option>
                                </select>
                            </div>
                            <button
                                onClick={fetchSavings}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                                🔄 Actualiser
                            </button>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <FaSpinner className="animate-spin text-blue-500 text-4xl" />
                            </div>
                        ) : savings.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                <FaPiggyBank className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune épargne trouvée</p>
                            </div>
                        ) : (
                            <div className="bg-blue-800/35 rounded-xl shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Objectif</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {savings.map(item => (
                                                <tr key={item.id} className="hover:bg-blue-700">
                                                    <td className="px-4 py-3 font-mono text-sm">#{item.id}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">{item.user_name || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500">{item.user_phone}</p>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{item.name}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            item.type === 'simple' 
                                                                ? 'bg-purple-100 text-purple-700' 
                                                                : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            {item.type === 'simple' ? '💰 Simple' : '🔒 À terme'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-green-600">
                                                        {formatAmount(item.current_amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {item.target_amount > 0 ? formatAmount(item.target_amount) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            item.status === 'active' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {item.status === 'active' ? '✅ Active' : '🎯 Atteinte'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="text-white hover:text-gray-700 text-sm"
                                                        >
                                                            <FaEye /> Voir
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Withdrawals */}
                {activeTab === 'withdrawals' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FaBell className="text-yellow-500" />
                                Demandes de retrait
                            </h3>
                            <button
                                onClick={() => { fetchWithdrawalRequests(); fetchStats(); }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                                🔄 Actualiser
                            </button>
                        </div>

                        {withdrawalRequests.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                <FaBell className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune demande de retrait</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {withdrawalRequests.map(request => (
                                    <div key={request.id} className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${
                                        request.status === 'pending' ? 'border-yellow-500' :
                                        request.status === 'approved' ? 'border-green-500' :
                                        'border-red-500'
                                    }`}>
                                        <div className="flex flex-wrap justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {request.status === 'pending' ? '⏳ En attente' :
                                                         request.status === 'approved' ? '✅ Approuvé' :
                                                         '❌ Rejeté'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">#{request.id}</span>
                                                </div>
                                                
                                                <p className="font-bold text-gray-800">
                                                    {request.user_name} <span className="text-gray-500">({request.user_phone})</span>
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Épargne: <strong>{request.savings_name}</strong> ({request.savings_type === 'simple' ? 'Simple' : 'À terme'})
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Demandé le {formatDate(request.requested_at)}
                                                </p>
                                                {request.reason && (
                                                    <p className="text-sm text-gray-600 mt-2">📝 {request.reason}</p>
                                                )}
                                                {request.admin_comment && (
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        💬 Admin: {request.admin_comment}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-gray-800">
                                                    {formatAmount(request.amount)}
                                                </p>
                                                <p className="text-xs text-red-500">
                                                    Frais: {formatAmount(request.fee)}
                                                </p>
                                                <p className="text-sm font-bold text-green-600">
                                                    Net: {formatAmount(request.net_amount)}
                                                </p>
                                                
                                                {request.status === 'pending' && (
                                                    <div className="flex gap-2 mt-3 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(request);
                                                                setProcessAction('reject');
                                                                setProcessComment('');
                                                                setShowProcessModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                                        >
                                                            <FaTimes className="inline mr-1" /> Rejeter
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(request);
                                                                setProcessAction('approve');
                                                                setProcessComment('');
                                                                setShowProcessModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                        >
                                                            <FaCheckCircle className="inline mr-1" /> Approuver
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Traitement */}
            {showProcessModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className={`relative max-w-md w-full rounded-2xl shadow-2xl overflow-hidden ${
                        processAction === 'approve' ? 'bg-white' : 'bg-white'
                    }`}>
                        <div className={`p-4 flex justify-between items-center ${
                            processAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                        } text-white`}>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                {processAction === 'approve' ? <FaCheckCircle /> : <FaTimes />}
                                {processAction === 'approve' ? 'Approuver le retrait' : 'Rejeter la demande'}
                            </h3>
                            <button onClick={() => setShowProcessModal(false)} className="text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-black">Utilisateur</span>
                                    <span className="text-black font-medium">{selectedItem.user_name}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Montant</span>
                                    <span className="text-black font-bold">{formatAmount(selectedItem.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Frais (0,1%)</span>
                                    <span className="font-bold text-red-500"> - {formatAmount(selectedItem.fee)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                    <span className="text-gray-800 font-medium">Net à envoyer</span>
                                    <span className="font-bold text-green-600">{formatAmount(selectedItem.net_amount)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commentaire {processAction === 'reject' && '(requis)'}
                                </label>
                                <textarea
                                    value={processComment}
                                    onChange={(e) => setProcessComment(e.target.value)}
                                    placeholder={processAction === 'approve' ? 'Note optionnelle...' : 'Raison du rejet...'}
                                    rows="3"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black "
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowProcessModal(false)}
                                    className="flex-1 border border-gray-900 py-2.5 rounded-lg hover:bg-red-500 transition text-black"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleProcessWithdrawal}
                                    disabled={submitting || (processAction === 'reject' && !processComment)}
                                    className={`flex-1 text-white py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium ${
                                        processAction === 'approve' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {submitting ? (
                                        <FaSpinner className="animate-spin" />
                                    ) : (
                                        <>
                                            {processAction === 'approve' ? <FaCheckCircle /> : <FaTimes />}
                                            {processAction === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Détail */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">
                                Détails de l'épargne
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className={`text-5xl mb-2 ${selectedItem.type === 'simple' ? '💰' : '🔒'}`}>
                                    {selectedItem.type === 'simple' ? '💰' : '🔒'}
                                </div>
                                <h4 className="text-xl font-bold">{selectedItem.name}</h4>
                                <p className="text-gray-500">{selectedItem.type === 'simple' ? 'Épargne Simple' : 'Épargne à Terme'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500">Utilisateur</span>
                                    <span className="text-black font-medium">{selectedItem.user_name}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500">Téléphone</span>
                                    <span className="text-black font-medium">{selectedItem.user_phone}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500">Solde actuel</span>
                                    <span className="font-bold text-green-600">{formatAmount(selectedItem.current_amount)}</span>
                                </div>
                                {selectedItem.target_amount > 0 && (
                                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500">Objectif</span>
                                        <span className="font-bold text-orange-600">{formatAmount(selectedItem.target_amount)}</span>
                                    </div>
                                )}
                                {selectedItem.end_date && (
                                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500">Date d'échéance</span>
                                        <span className="text-black font-medium">{formatDate(selectedItem.end_date)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500">Créée le</span>
                                    <span className="text-black font-medium">{formatDate(selectedItem.created_at)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-green-700 font-medium">Statut</span>
                                    <span className="font-bold text-green-600">
                                        {selectedItem.status === 'active' ? '✅ Active' : '🎯 Atteinte'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AdminSavings;