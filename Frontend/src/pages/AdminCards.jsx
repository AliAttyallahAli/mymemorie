// src/pages/AdminCards.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCreditCard, FaCheckCircle, FaTimesCircle, FaBan,
    FaSpinner, FaEye, FaClock, FaKey, FaCopy, FaCheck,
    FaArrowLeft, FaExclamationTriangle, FaRedo
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'pinResets'

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
        }
    }, [filter, activeTab]);

    // Auto-refresh des demandes reset toutes les 30s si on est sur cet onglet
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
                toast.success('✅ PIN réinitialisé. L\'utilisateur peut en définir un nouveau.');
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
    // HELPERS
    // ============================================
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copié !');
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
            </div>

            {/* ============================================
                ONGLET CARTES
            ============================================ */}
            {activeTab === 'cards' && (
                <>
                    {/* Stats */}
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

                    {/* Filtres */}
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

                    {/* Liste des cartes */}
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

                                                {/* Badge PIN défini ou non */}
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
                    {/* Bannière info */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-blue-400 text-xl flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-300 mb-1">
                                    Demandes de réinitialisation de PIN
                                </h4>
                                <p className="text-xs text-blue-200">
                                    Approuver une demande supprimera le PIN actuel de la carte.
                                    L'utilisateur pourra en définir un nouveau depuis son application.
                                </p>
                            </div>
                        </div>
                    </div>

                    {loadingResets ? (
                        <div className="text-center py-12">
                            <FaSpinner className="animate-spin text-red-500 text-3xl mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Chargement...</p>
                        </div>
                    ) : pinResets.length === 0 ? (
                        <div className="text-center py-12 bg-gray-700/30 rounded-xl">
                            <FaKey className="text-gray-500 text-5xl mx-auto mb-3" />
                            <p className="text-gray-400">Aucune demande de reset PIN en attente</p>
                            <p className="text-xs text-gray-500 mt-2">
                                Les nouvelles demandes apparaîtront ici automatiquement
                            </p>
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
                                    Le client devra définir son PIN lui-même lors de la première utilisation.
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

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-gray-700/50 rounded-lg p-2">
                                        <div className="text-gray-400">Limite jour</div>
                                        <div className="text-white">{Number(approvedCard.daily_limit).toLocaleString()} F</div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-2">
                                        <div className="text-gray-400">Limite mois</div>
                                        <div className="text-white">{Number(approvedCard.monthly_limit).toLocaleString()} F</div>
                                    </div>
                                </div>

                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                    <p className="text-xs text-purple-300">
                                        💡 <strong>Info client :</strong> Communiquez uniquement le numéro de carte et le CVV.
                                        Le client définira son PIN lui-même depuis son application CashPays.
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