// src/pages/AdminCards.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCreditCard, FaCheckCircle, FaTimesCircle, FaBan,
    FaSpinner, FaEye, FaClock, FaKey, FaCopy, FaCheck,
    FaArrowLeft, FaExclamationTriangle, FaRedo, FaMoneyBillWave,
    FaChartLine, FaWallet
} from 'react-icons/fa';

// ✅ API_URL vide → utilise le proxy Vite
const API_URL = '';

const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    return [];
};

function AdminCards({ user }) {
    const navigate = useNavigate();

    // ============================================
    // ÉTATS
    // ============================================
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'pinResets' | 'fees'

    // Cartes
    const [cards, setCards] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [approvedCard, setApprovedCard] = useState(null);
    const [copied, setCopied] = useState(false);

    // Reset PIN
    const [pinResets, setPinResets] = useState([]);
    const [loadingResets, setLoadingResets] = useState(false);
    const [processingReset, setProcessingReset] = useState(null);

    // ✅ FRAIS
    const [feesData, setFeesData] = useState(null);
    const [loadingFees, setLoadingFees] = useState(false);

    const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (activeTab === 'cards') {
            fetchCards();
            fetchStats();
        } else if (activeTab === 'pinResets') {
            fetchPinResets();
        } else if (activeTab === 'fees') {
            fetchFees();
        }
    }, [filter, activeTab]);

    // Auto-refresh
    useEffect(() => {
        if (activeTab !== 'pinResets') return;
        const interval = setInterval(fetchPinResets, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // ============================================
    // CARTES
    // ============================================
    const fetchCards = async () => {
        setLoading(true);
        try {
            const url = filter === 'all'
                ? `${API_URL}/api/admin/cards`
                : `${API_URL}/api/admin/cards?status=${filter}`;
            const response = await axios.get(url, getAuthHeaders());
            setCards(extractArray(response.data, 'cards', 'data'));
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur chargement');
            setCards([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/cards/stats`, getAuthHeaders());
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('❌ Erreur stats:', error);
        }
    };

    const handleApprove = async (cardId) => {
        try {
            const response = await axios.post(
                `${API_URL}/api/admin/cards/${cardId}/approve`,
                { daily_limit: 500000, monthly_limit: 5000000 },
                getAuthHeaders()
            );

            if (response.data.success) {
                setApprovedCard(response.data.card);
                toast.success('Carte approuvée !');
                fetchCards();
                fetchStats();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const handleReject = async (cardId) => {
        const reason = prompt('Raison du rejet:');
        if (!reason) return;

        try {
            await axios.post(`${API_URL}/api/admin/cards/${cardId}/reject`, { reason }, getAuthHeaders());
            toast.success('Carte rejetée');
            fetchCards();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const handleBlock = async (cardId) => {
        if (!confirm('Bloquer cette carte ?')) return;
        try {
            await axios.post(`${API_URL}/api/admin/cards/${cardId}/block`, {}, getAuthHeaders());
            toast.success('Carte bloquée');
            fetchCards();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const handleUnblock = async (cardId) => {
        try {
            await axios.post(`${API_URL}/api/admin/cards/${cardId}/unblock`, {}, getAuthHeaders());
            toast.success('Carte débloquée');
            fetchCards();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    // ============================================
    // RESET PIN
    // ============================================
    const fetchPinResets = async () => {
        setLoadingResets(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/admin/cards/pin-resets?status=pending`,
                getAuthHeaders()
            );
            setPinResets(extractArray(response.data, 'requests'));
        } catch (error) {
            console.error('❌ Erreur pin-resets:', error);
            setPinResets([]);
        } finally {
            setLoadingResets(false);
        }
    };

    const handleApproveReset = async (resetId) => {
        setProcessingReset(resetId);
        try {
            const response = await axios.post(
                `${API_URL}/api/admin/cards/pin-resets/${resetId}/approve`,
                { note: 'Réinitialisation approuvée' },
                getAuthHeaders()
            );

            if (response.data.success) {
                toast.success('✅ PIN réinitialisé');
                fetchPinResets();
                fetchStats();
            }
        } catch (error) {
            console.error('❌ Erreur approbation:', error);
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setProcessingReset(null);
        }
    };

    const handleRejectReset = async (resetId) => {
        const reason = prompt('Raison du rejet:');
        if (!reason) return;

        setProcessingReset(resetId);
        try {
            await axios.post(
                `${API_URL}/api/admin/cards/pin-resets/${resetId}/reject`,
                { reason },
                getAuthHeaders()
            );
            toast.success('Demande rejetée');
            fetchPinResets();
        } catch (error) {
            console.error('❌ Erreur rejet:', error);
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setProcessingReset(null);
        }
    };

    // ============================================
    // ✅ FRAIS
    // ============================================
    const fetchFees = async () => {
        setLoadingFees(true);
        try {
            const response = await axios.get(`${API_URL}/api/admin/cards/fees`, getAuthHeaders());
            setFeesData(response.data);
        } catch (error) {
            console.error('❌ Erreur frais:', error);
            toast.error('Erreur chargement frais');
            setFeesData(null);
        } finally {
            setLoadingFees(false);
        }
    };

    // ============================================
    // HELPERS
    // ============================================
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.top = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Copié !');
        } catch (error) {
            toast.error('Impossible de copier');
        }
    };

    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/admin');
        }
    };

    if (user?.role !== 'admin') {
        return <div className="text-center py-12 text-red-400">Accès admin requis</div>;
    }

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">

            {/* BOUTON RETOUR */}
            <button
                onClick={handleGoBack}
                className="mb-4 flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all shadow-sm font-medium"
            >
                <FaArrowLeft /> Retour
            </button>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FaCreditCard className="text-purple-500 text-xl" />
                    </div>
                    Gestion des Cartes Virtuelles
                </h3>
            </div>

            {/* ONGLETS */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setActiveTab('cards')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        activeTab === 'cards'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    <FaCreditCard /> Cartes
                    {stats.total > 0 && (
                        <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-full">
                            {stats.total}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('pinResets')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 relative ${
                        activeTab === 'pinResets'
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    <FaRedo /> Reset PIN
                    {pinResets.length > 0 && (
                        <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold animate-pulse">
                            {pinResets.length}
                        </span>
                    )}
                </button>

                {/* ✅ NOUVEL ONGLET FRAIS */}
                <button
                    onClick={() => setActiveTab('fees')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        activeTab === 'fees'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    <FaMoneyBillWave /> Frais encaissés
                </button>
            </div>

            {/* ============================================
                ONGLET CARTES
            ============================================ */}
            {activeTab === 'cards' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-400">Total</div>
                            <div className="text-xl font-bold text-white">{stats.total || 0}</div>
                        </div>
                        <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/30">
                            <div className="text-xs text-yellow-400">En attente</div>
                            <div className="text-xl font-bold text-yellow-500">{stats.pending || 0}</div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/30">
                            <div className="text-xs text-green-400">Actives</div>
                            <div className="text-xl font-bold text-green-500">{stats.active || 0}</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                            <div className="text-xs text-red-400">Bloquées</div>
                            <div className="text-xl font-bold text-red-500">{stats.blocked || 0}</div>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/30">
                            <div className="text-xs text-blue-400">Transactions</div>
                            <div className="text-xl font-bold text-blue-500">{stats.total_transactions || 0}</div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4 flex-wrap">
                        {[
                            { key: 'pending', label: '⏳ En attente' },
                            { key: 'active', label: '✅ Actives' },
                            { key: 'blocked', label: '🚫 Bloquées' },
                            { key: 'all', label: '📋 Toutes' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    filter === f.key
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <FaSpinner className="animate-spin text-purple-500 text-3xl mx-auto mb-3" />
                        </div>
                    ) : cards.length === 0 ? (
                        <div className="text-center py-12 bg-gray-700/30 rounded-xl">
                            <FaCreditCard className="text-gray-500 text-5xl mx-auto mb-3" />
                            <p className="text-gray-400">Aucune carte</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cards.map(card => (
                                <div key={card.id} className="bg-gray-700/50 rounded-xl p-4 hover:bg-gray-700/70 transition">
                                    <div className="flex justify-between items-start flex-wrap gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="font-mono text-purple-400 font-semibold">
                                                    {card.card_number_masked || '(non généré)'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    card.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                    card.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    card.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {card.status}
                                                </span>
                                                <span className="text-xs text-gray-400">{card.card_type}</span>

                                                {card.status === 'active' && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                        card.pin_set 
                                                            ? 'bg-green-500/20 text-green-400' 
                                                            : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                        {card.pin_set ? '🔐 PIN défini' : '⚠️ PIN non défini'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-300">
                                                <strong>{card.user_name}</strong> • {card.user_phone}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Demandée: {card.requested_at ? new Date(card.requested_at).toLocaleDateString('fr-FR') : '-'}
                                                {card.approved_at && ` • Approuvée: ${new Date(card.approved_at).toLocaleDateString('fr-FR')}`}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            {card.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(card.id)}
                                                        className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium flex items-center gap-1"
                                                    >
                                                        <FaCheckCircle /> Approuver
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(card.id)}
                                                        className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium flex items-center gap-1"
                                                    >
                                                        <FaTimesCircle /> Rejeter
                                                    </button>
                                                </>
                                            )}
                                            {card.status === 'active' && (
                                                <button
                                                    onClick={() => handleBlock(card.id)}
                                                    className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <FaBan /> Bloquer
                                                </button>
                                            )}
                                            {card.status === 'blocked' && (
                                                <button
                                                    onClick={() => handleUnblock(card.id)}
                                                    className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <FaCheckCircle /> Débloquer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ============================================
                ONGLET RESET PIN
            ============================================ */}
            {activeTab === 'pinResets' && (
                <>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-blue-400 text-xl flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-300 mb-1">
                                    Demandes de réinitialisation de PIN
                                </h4>
                                <p className="text-xs text-blue-200">
                                    Approuver une demande supprimera le PIN actuel de la carte.
                                </p>
                            </div>
                        </div>
                    </div>

                    {loadingResets ? (
                        <div className="text-center py-12">
                            <FaSpinner className="animate-spin text-red-500 text-3xl mx-auto mb-3" />
                        </div>
                    ) : pinResets.length === 0 ? (
                        <div className="text-center py-12 bg-gray-700/30 rounded-xl">
                            <FaKey className="text-gray-500 text-5xl mx-auto mb-3" />
                            <p className="text-gray-400">Aucune demande de reset PIN</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pinResets.map((reset) => (
                                <div
                                    key={reset.id}
                                    className="bg-gray-700/50 rounded-xl p-4 hover:bg-gray-700/70 transition border-l-4 border-yellow-500"
                                >
                                    <div className="flex justify-between items-start flex-wrap gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="font-mono text-purple-400 font-semibold">
                                                    {reset.card_number_masked || '(non généré)'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                                                    <FaClock className="text-[10px]" /> En attente
                                                </span>
                                            </div>

                                            <div className="text-sm text-gray-300 mb-1">
                                                <strong>{reset.user_name}</strong> • {reset.user_phone}
                                            </div>

                                            {reset.reason && (
                                                <div className="text-xs text-gray-300 mt-2 bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                                                    <span className="text-gray-500 font-medium">Raison :</span>{' '}
                                                    {reset.reason}
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <FaClock className="text-[10px]" />
                                                Demandée le:{' '}
                                                {reset.created_at
                                                    ? new Date(reset.created_at).toLocaleString('fr-FR')
                                                    : '-'}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                onClick={() => handleApproveReset(reset.id)}
                                                disabled={processingReset === reset.id}
                                                className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {processingReset === reset.id ? (
                                                    <><FaSpinner className="animate-spin" /> Traitement...</>
                                                ) : (
                                                    <><FaCheckCircle /> Approuver</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleRejectReset(reset.id)}
                                                disabled={processingReset === reset.id}
                                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <FaTimesCircle /> Rejeter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ============================================
                ✅ ONGLET FRAIS ENCAISSÉS
            ============================================ */}
            {activeTab === 'fees' && (
                <>
                    {loadingFees ? (
                        <div className="text-center py-12">
                            <FaSpinner className="animate-spin text-green-500 text-3xl mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Chargement des frais...</p>
                        </div>
                    ) : !feesData ? (
                        <div className="text-center py-12 bg-gray-700/30 rounded-xl">
                            <FaMoneyBillWave className="text-gray-500 text-5xl mx-auto mb-3" />
                            <p className="text-gray-400">Aucune donnée disponible</p>
                            <button
                                onClick={fetchFees}
                                className="mt-4 text-green-400 hover:text-green-300 underline text-sm"
                            >
                                Recharger
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* SOLDE ADMIN */}
                            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                            <FaWallet className="text-white text-2xl" />
                                        </div>
                                        <div>
                                            <div className="text-sm opacity-80">Wallet Admin Principal</div>
                                            <div className="text-xs opacity-60">ID: #{feesData.admin_id}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs opacity-80 mb-1">Solde actuel</div>
                                        <div className="text-3xl font-bold">
                                            {Number(feesData.wallet_balance).toLocaleString()} FCFA
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-xs">
                                    💡 Les frais de transaction (1%) des paiements par carte sont automatiquement
                                    crédités sur ce wallet.
                                </div>
                            </div>

                            {/* STATS FRAIS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Aujourd'hui */}
                                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-blue-400 font-medium">Aujourd'hui</span>
                                        <FaChartLine className="text-blue-400" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-300 mb-1">
                                        {Number(feesData.stats.today.amount).toLocaleString()} F
                                    </div>
                                    <div className="text-xs text-blue-400/70">
                                        {feesData.stats.today.count} transaction(s)
                                    </div>
                                </div>

                                {/* Ce mois */}
                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-purple-400 font-medium">Ce mois</span>
                                        <FaChartLine className="text-purple-400" />
                                    </div>
                                    <div className="text-2xl font-bold text-purple-300 mb-1">
                                        {Number(feesData.stats.month.amount).toLocaleString()} F
                                    </div>
                                    <div className="text-xs text-purple-400/70">
                                        {feesData.stats.month.count} transaction(s)
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-green-400 font-medium">Total encaissé</span>
                                        <FaMoneyBillWave className="text-green-400" />
                                    </div>
                                    <div className="text-2xl font-bold text-green-300 mb-1">
                                        {Number(feesData.stats.total.amount).toLocaleString()} F
                                    </div>
                                    <div className="text-xs text-green-400/70">
                                        {feesData.stats.total.count} transaction(s)
                                    </div>
                                </div>
                            </div>

                            {/* HISTORIQUE FRAIS */}
                            <div className="bg-gray-700/50 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-gray-600 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FaMoneyBillWave className="text-green-400" />
                                        <h3 className="font-bold text-white">Historique des frais encaissés</h3>
                                    </div>
                                    <button
                                        onClick={fetchFees}
                                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                                    >
                                        <FaRedo className="text-[10px]" /> Actualiser
                                    </button>
                                </div>

                                {feesData.recent.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaMoneyBillWave className="text-gray-600 text-5xl mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">Aucun frais encaissé</p>
                                        <p className="text-gray-600 text-xs mt-2">
                                            Les frais apparaîtront ici après chaque paiement par carte
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reçu</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {feesData.recent.map((fee, index) => (
                                                    <tr key={fee.id || index} className="hover:bg-gray-700/50 transition">
                                                        <td className="px-4 py-3 text-sm text-gray-300">
                                                            {fee.created_at
                                                                ? new Date(fee.created_at).toLocaleString('fr-FR')
                                                                : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-purple-400">
                                                            {fee.receipt_number || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-400">
                                                            {fee.description || 'Frais de transaction'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm font-bold text-green-400">
                                                            +{Number(fee.amount || 0).toLocaleString()} F
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ============================================
                MODAL : CARTE APPROUVÉE
            ============================================ */}
            {approvedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl max-w-md w-full border border-green-500/30">
                        <div className="p-5 border-b border-gray-700">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaCheckCircle className="text-green-500" /> Carte approuvée
                            </h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    ⚠️ <strong>IMPORTANT :</strong> Ces informations ne seront affichées qu'UNE SEULE FOIS.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-gray-700/50 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-gray-400">Numéro de carte</div>
                                            <div className="font-mono text-white text-sm">{approvedCard.card_number}</div>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(approvedCard.card_number)}
                                            className="p-2 text-gray-400 hover:text-white"
                                        >
                                            {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-400">Expire</div>
                                        <div className="font-mono text-white text-sm">
                                            {String(approvedCard.expiry_month).padStart(2, '0')}/{String(approvedCard.expiry_year).slice(-2)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-400">CVV</div>
                                        <div className="font-mono text-white text-sm">{approvedCard.cvv}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-700/50 rounded-lg p-3">
                                    <div className="text-xs text-gray-400">Titulaire</div>
                                    <div className="text-white">{approvedCard.card_holder}</div>
                                </div>

                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                    <p className="text-xs text-purple-300">
                                        💡 <strong>Info client :</strong> Communiquez uniquement le numéro de carte et le CVV.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 bg-gray-800/50 border-t border-gray-700 flex justify-end">
                            <button
                                onClick={() => setApprovedCard(null)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminCards;