// src/pages/VirtualCard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    FaCreditCard, FaLock, FaEye, FaEyeSlash, FaCheckCircle,
    FaTimesCircle, FaSpinner, FaArrowLeft, FaHistory,
    FaMoneyBillWave, FaShieldAlt, FaClock, FaCopy, FaCheck,
    FaKey, FaExclamationTriangle, FaQrcode, FaFilePdf, FaRedo
} from 'react-icons/fa';
import Layout from '../components/Layout';

// ✅ API_URL vide → utilise le proxy Vite
const API_URL = '';

// ✅ Extraction robuste
const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    if (data && Array.isArray(data.data)) return data.data;
    return [];
};

// ============================================
// ✅ DÉTECTION AUTOMATIQUE DU RÉSEAU
// ============================================
const getNetworkBaseUrl = () => {
    const { protocol, hostname, port } = window.location;
    const portPart = port ? `:${port}` : '';
    const baseUrl = `${protocol}//${hostname}${portPart}`;

    console.log('🌐 Réseau détecté:', { hostname, baseUrl });

    return baseUrl;
};

function VirtualCard({ user }) {
    const navigate = useNavigate();

    // ============================================
    // ÉTATS
    // ============================================
    const [loading, setLoading] = useState(true);
    const [card, setCard] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [revealedData, setRevealedData] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(null);
    const [downloading, setDownloading] = useState(false);

    // PIN
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinForm, setPinForm] = useState({ new_pin: '', confirm_pin: '' });
    const [settingPin, setSettingPin] = useState(false);

    // RESET PIN
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetReason, setResetReason] = useState('');
    const [resetRequest, setResetRequest] = useState(null);
    const [submittingReset, setSubmittingReset] = useState(false);
    const [loadingResetStatus, setLoadingResetStatus] = useState(false);

    const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchCard();
        fetchTransactions();
        fetchResetStatus();
    }, [user]);

    const fetchCard = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/cards/my-card`, getAuthHeaders());
            setCard(response.data.card || null);
        } catch (error) {
            console.error('❌ Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/cards/my-transactions`, getAuthHeaders());
            setTransactions(extractArray(response.data, 'transactions'));
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    };

    const fetchResetStatus = async () => {
        setLoadingResetStatus(true);
        try {
            const response = await axios.get(`${API_URL}/api/cards/pin-reset-status`, getAuthHeaders());
            setResetRequest(response.data.request || null);
            console.log('📋 Statut reset:', response.data.request);
        } catch (error) {
            console.error('❌ Erreur reset status:', error);
            setResetRequest(null);
        } finally {
            setLoadingResetStatus(false);
        }
    };

    const handleRequestCard = async () => {
        setSubmitting(true);
        try {
            await axios.post(
                `${API_URL}/api/cards/request`,
                { card_type: 'classic', reason: requestReason },
                getAuthHeaders()
            );
            toast.success('Demande envoyée ! En attente de validation.');
            setShowRequestModal(false);
            fetchCard();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // RÉVÉLER / MASQUER
    // ============================================
    const toggleReveal = () => {
        if (revealedData) {
            setRevealedData(null);
        } else {
            setRevealedData({
                card_number: card.full_number || card.card_number,
                cvv: card.cvv
            });
        }
    };

    const copyToClipboard = async (text, field) => {
        if (!text) return;
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
            setCopied(field);
            toast.success('Copié !');
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error('❌ Erreur copie:', error);
            toast.error('Impossible de copier');
        }
    };

    // ============================================
    // DÉFINIR LE PIN
    // ============================================
    const handleSetPin = async () => {
        if (!/^\d{4}$/.test(pinForm.new_pin)) {
            toast.error('Le PIN doit contenir exactement 4 chiffres');
            return;
        }
        if (pinForm.new_pin !== pinForm.confirm_pin) {
            toast.error('Les deux PIN ne correspondent pas');
            return;
        }
        const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
        if (weakPins.includes(pinForm.new_pin)) {
            toast.error('PIN trop simple. Choisissez un autre code.');
            return;
        }

        setSettingPin(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/cards/set-pin`,
                {
                    card_number: card.card_number,
                    new_pin: pinForm.new_pin,
                    confirm_pin: pinForm.confirm_pin
                },
                getAuthHeaders()
            );
            if (response.data.success) {
                toast.success('🎉 PIN défini avec succès !');
                setShowPinModal(false);
                setPinForm({ new_pin: '', confirm_pin: '' });
                await fetchCard();
                await fetchResetStatus();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur lors de la définition du PIN');
        } finally {
            setSettingPin(false);
        }
    };

    // ============================================
    // DEMANDER UN RESET PIN
    // ============================================
    const handleRequestReset = async () => {
        if (!resetReason.trim()) {
            toast.error('Veuillez indiquer une raison');
            return;
        }

        setSubmittingReset(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/cards/request-pin-reset`,
                { reason: resetReason },
                getAuthHeaders()
            );

            if (response.data.success) {
                toast.success('📤 Demande envoyée ! En attente de validation.', {
                    duration: 5000
                });
                setShowResetModal(false);
                setResetReason('');
                await fetchResetStatus();
            } else {
                toast.error(response.data.error || 'Erreur');
            }
        } catch (error) {
            console.error('❌ Erreur reset:', error);

            if (error.response?.status === 404) {
                toast.error('Route non disponible. Contactez le support.');
            } else if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('Erreur lors de la demande');
            }
        } finally {
            setSubmittingReset(false);
        }
    };

    // ============================================
    // URL DE PAIEMENT (dynamique selon le réseau)
    // ============================================
    const getPaymentUrl = () => {
        const fullCardNumber = revealedData?.card_number
                            || card?.full_number
                            || card?.card_number;

        if (!fullCardNumber || fullCardNumber.includes('*')) {
            return '';
        }

        const baseUrl = getNetworkBaseUrl();
        const cleanNumber = fullCardNumber.replace(/\s/g, '');

        return `${baseUrl}/card-payment?card=${encodeURIComponent(cleanNumber)}`;
    };

    // ============================================
    // URL DU QR CODE
    // ============================================
    const getPaymentQRUrl = () => {
        const url = getPaymentUrl();
        if (!url) return '';

        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=7c3aed&bgcolor=ffffff&margin=5`;
    };

    // ============================================
    // ✅ TÉLÉCHARGER PDF (avec QR dynamique)
    // ============================================
    const handleDownloadPDF = async () => {
        if (!card) return;
        setDownloading(true);

        try {
            const currentBaseUrl = getNetworkBaseUrl();

            const response = await axios.get(
                `${API_URL}/api/cards/download-pdf?baseUrl=${encodeURIComponent(currentBaseUrl)}`,
                { ...getAuthHeaders(), responseType: 'text' }
            );

            const htmlBlob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
            const blobUrl = URL.createObjectURL(htmlBlob);

            let opened = false;

            try {
                const newWindow = window.open(blobUrl, '_blank');
                if (newWindow && !newWindow.closed) {
                    opened = true;
                    toast.success('📄 Carte ouverte dans un nouvel onglet');
                }
            } catch (e) { console.warn('window.open échoué'); }

            if (!opened) {
                try {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `carte-${card.card_number?.slice(-4) || 'virtuelle'}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    opened = true;
                    toast.success('📥 Fichier téléchargé');
                } catch (e) { console.warn('download échoué'); }
            }

            if (!opened) {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = blobUrl;
                document.body.appendChild(iframe);
                toast.success('📄 Carte générée');
                setTimeout(() => document.body.removeChild(iframe), 60000);
            }

            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        } catch (error) {
            console.error('❌ Erreur PDF:', error);
            toast.error('Impossible de générer le PDF');
        } finally {
            setDownloading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ En attente' },
            active: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Active' },
            blocked: { bg: 'bg-red-100', text: 'text-red-800', label: '🚫 Bloquée' },
            cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: '✗ Annulée' },
            expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: '⌛ Expirée' }
        };
        const b = badges[status] || badges.pending;
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>{b.label}</span>;
    };

    if (!user) return null;

    return (
        <Layout user={user}>
            <div className="max-w-6xl mx-auto p-4">

                {/* RETOUR */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* HEADER */}
                <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-900 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaCreditCard /> Ma Carte Virtuelle
                            </h1>
                            <p className="text-purple-200">Payez chez n'importe quel guichet partenaire</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                            <FaShieldAlt className="text-white text-2xl" />
                        </div>
                    </div>
                </div>

                {/* CONTENU */}
                {loading ? (
                    <div className="text-center py-12">
                        <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-3" />
                        <p className="text-gray-500">Chargement...</p>
                    </div>
                ) : !card ? (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <FaCreditCard className="text-6xl text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune carte virtuelle</h2>
                        <p className="text-gray-500 mb-6">
                            Demandez votre carte Visa virtuelle pour payer chez les guichets partenaires
                        </p>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-semibold hover:opacity-90 shadow-lg"
                        >
                            💳 Demander une carte
                        </button>
                    </div>
                ) : card.status === 'pending' ? (
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <FaClock className="text-5xl text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Demande en cours</h2>
                        <p className="text-gray-500 mb-4">
                            Votre demande a été envoyée le{' '}
                            {card.requested_at ? new Date(card.requested_at).toLocaleDateString('fr-FR') : '-'}
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-md mx-auto">
                            <p className="text-sm text-yellow-800">
                                ⏳ En attente de validation par l'administrateur.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* CARTE VISUELLE AVEC QR INTÉGRÉ */}
                        <div>
                            <div className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-2xl p-6 text-white shadow-2xl aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden">

                                {/* ✅ QR CODE INTÉGRÉ SUR LA CARTE */}
                                {card.pin_set && revealedData?.card_number && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-white p-2 rounded-xl shadow-2xl z-20">
                                        <img
                                            src={getPaymentQRUrl()}
                                            alt="QR de paiement"
                                            className="w-24 h-24"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <p className="text-[7px] text-purple-700 text-center font-bold mt-1 tracking-wider">
                                            SCANNER
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="text-xs opacity-70 mb-1">CARTE VIRTUELLE</div>
                                        <div className="text-lg font-bold">CashPays</div>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(card.status)}
                                    </div>
                                </div>

                                <div className="my-4 relative z-10 max-w-[60%]">
                                    <div className="text-xs opacity-70 mb-1">Numéro de carte</div>
                                    <div className="font-mono text-xl tracking-wider">
                                        {revealedData?.card_number || card.card_number_masked || '**** **** **** ****'}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end relative z-10 max-w-[60%]">
                                    <div>
                                        <div className="text-xs opacity-70">Titulaire</div>
                                        <div className="font-semibold text-sm">
                                            {card.card_holder || user?.fullname?.toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs opacity-70">Expire</div>
                                        <div className="font-mono font-semibold">
                                            {String(card.expiry_month).padStart(2, '0')}/{String(card.expiry_year).slice(-2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Message si QR non disponible */}
                            {(!card.pin_set || !revealedData?.card_number) && card.status === 'active' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
                                    <p className="text-xs text-blue-800 text-center">
                                        {!card.pin_set
                                            ? '💡 Définissez votre PIN pour afficher le QR sur la carte'
                                            : '💡 Cliquez sur "Afficher" pour révéler le QR sur la carte'}
                                    </p>
                                </div>
                            )}

                            {/* SOLDE */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
                                <div className="text-sm text-gray-500 mb-1">Solde du compte lié</div>
                                <div className="text-3xl font-bold text-purple-700">
                                    {Number(card.balance || 0).toLocaleString()} FCFA
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    Limite journalière: {Number(card.daily_limit || 0).toLocaleString()} FCFA
                                </div>
                            </div>

                            {/* ACTIONS RAPIDES */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    onClick={() => setShowQRModal(true)}
                                    className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl p-4 hover:opacity-90 transition shadow-md flex flex-col items-center gap-2"
                                >
                                    <FaQrcode className="text-2xl" />
                                    <span className="text-sm font-medium">QR Code</span>
                                    <span className="text-[10px] opacity-70">Partager pour payer</span>
                                </button>

                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                    className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl p-4 hover:opacity-90 transition shadow-md flex flex-col items-center gap-2 disabled:opacity-50"
                                >
                                    {downloading ? (
                                        <FaSpinner className="animate-spin text-2xl" />
                                    ) : (
                                        <FaFilePdf className="text-2xl" />
                                    )}
                                    <span className="text-sm font-medium">PDF Carte</span>
                                    <span className="text-[10px] opacity-70">Recto/Verso + QR</span>
                                </button>
                            </div>

                            {/* INFO RÉSEAU */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
                                <p className="text-xs text-blue-800 text-center">
                                    🌐 QR généré pour : <span className="font-mono font-bold">{getNetworkBaseUrl()}</span>
                                </p>
                            </div>
                        </div>

                        {/* DÉTAILS */}
                        <div className="space-y-4">

                            {/* BANNIÈRE PIN RÉINITIALISÉ */}
                            {!card.pin_set && resetRequest?.status === 'approved' && (
                                <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5">
                                    <div className="flex items-start gap-3">
                                        <FaCheckCircle className="text-green-600 text-2xl flex-shrink-0 mt-1" />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-green-900 mb-1">
                                                ✅ PIN réinitialisé
                                            </h3>
                                            <p className="text-sm text-green-800 mb-3">
                                                Votre PIN a été réinitialisé par l'administrateur.
                                                Définissez-en un nouveau.
                                            </p>
                                            <button
                                                onClick={() => setShowPinModal(true)}
                                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-md"
                                            >
                                                <FaKey /> Définir un nouveau PIN
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BANNIÈRE PIN NON DÉFINI */}
                            {!card.pin_set && (!resetRequest || resetRequest.status !== 'approved') && (
                                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-5">
                                    <div className="flex items-start gap-3">
                                        <FaExclamationTriangle className="text-yellow-600 text-2xl flex-shrink-0 mt-1" />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-yellow-900 mb-1">
                                                🔐 Définissez votre PIN
                                            </h3>
                                            <p className="text-sm text-yellow-800 mb-3">
                                                Avant votre première utilisation, définissez un PIN à 4 chiffres.
                                            </p>
                                            <button
                                                onClick={() => setShowPinModal(true)}
                                                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-md"
                                            >
                                                <FaKey /> Définir mon PIN
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* INFOS SENSIBLES */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <FaLock /> Informations sensibles
                                    </h3>
                                    <button
                                        onClick={toggleReveal}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
                                    >
                                        {revealedData ? <FaEyeSlash /> : <FaEye />}
                                        {revealedData ? 'Masquer' : 'Afficher'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Numéro complet</div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                                                {revealedData?.card_number || card.card_number_masked || '**** **** **** ****'}
                                            </div>
                                            {revealedData?.card_number && (
                                                <button
                                                    onClick={() => copyToClipboard(revealedData.card_number, 'number')}
                                                    className="p-2 text-gray-400 hover:text-purple-600 transition"
                                                >
                                                    {copied === 'number' ? <FaCheck className="text-green-500" /> : <FaCopy />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">CVV</div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg text-center">
                                                    {revealedData?.cvv || '***'}
                                                </div>
                                                {revealedData?.cvv && (
                                                    <button
                                                        onClick={() => copyToClipboard(revealedData.cvv, 'cvv')}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 transition"
                                                    >
                                                        {copied === 'cvv' ? <FaCheck className="text-green-500 text-xs" /> : <FaCopy className="text-xs" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">PIN</div>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex-1 font-mono text-sm px-3 py-2 rounded-lg text-center font-bold ${
                                                    card.pin_set
                                                        ? 'bg-gray-50 text-purple-700'
                                                        : 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                                                }`}>
                                                    {card.pin_set ? '••••' : 'Non défini'}
                                                </div>
                                                {card.pin_set && (
                                                    <button
                                                        onClick={() => setShowPinModal(true)}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 transition"
                                                        title="Modifier le PIN"
                                                    >
                                                        <FaKey className="text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Expiration</div>
                                            <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg text-center">
                                                {String(card.expiry_month).padStart(2, '0')}/{String(card.expiry_year).slice(-2)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Type</div>
                                            <div className="text-sm bg-gray-50 px-3 py-2 rounded-lg text-center capitalize">
                                                {card.card_type || 'classic'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BOUTON RESET PIN */}
                                {card.pin_set && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        {loadingResetStatus ? (
                                            <div className="text-center py-2">
                                                <FaSpinner className="animate-spin text-purple-500 text-sm mx-auto" />
                                            </div>
                                        ) : resetRequest?.status === 'pending' ? (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 flex items-center gap-2">
                                                <FaClock className="text-yellow-600 flex-shrink-0" />
                                                <div>
                                                    <strong>Demande de reset en attente</strong>
                                                    <div className="text-[10px] opacity-70 mt-0.5">
                                                        Demandée le {resetRequest.created_at
                                                            ? new Date(resetRequest.created_at).toLocaleDateString('fr-FR')
                                                            : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : resetRequest?.status === 'rejected' ? (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
                                                <FaTimesCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <strong>Demande rejetée</strong>
                                                    {resetRequest.admin_note && (
                                                        <div className="text-[10px] opacity-70 mt-0.5">
                                                            {resetRequest.admin_note}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setShowResetModal(true)}
                                                        className="underline mt-1 block text-red-700 font-medium"
                                                    >
                                                        Faire une nouvelle demande
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowResetModal(true)}
                                                className="w-full text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg underline flex items-center justify-center gap-1 py-2 transition"
                                            >
                                                <FaRedo className="text-xs" />
                                                PIN oublié ? Demander une réinitialisation
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                                    <p className="text-xs text-orange-800">
                                        ⚠️ <strong>Sécurité :</strong> Ne partagez jamais votre PIN.
                                    </p>
                                </div>
                            </div>

                            {/* COMMENT UTILISER */}
                            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    💡 Comment payer ?
                                </h3>
                                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                                    <li>Rendez-vous chez un guichet partenaire</li>
                                    <li>Présentez le QR code (ou numéro de carte)</li>
                                    <li>Tapez votre PIN sur le terminal</li>
                                    <li>Le montant est débité de votre wallet</li>
                                    <li>Recevez un reçu instantané</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORIQUE */}
                {card && card.status === 'active' && transactions.length > 0 && (
                    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                            <FaHistory className="text-purple-600" />
                            <h3 className="font-bold text-gray-800">Mes transactions par carte</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marchand</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-xs font-mono text-purple-600">
                                                {tx.receipt_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {tx.card_holder_id === user?.id ? (
                                                    <span className="text-red-600">💸 Paiement envoyé</span>
                                                ) : (
                                                    <span className="text-green-600">💰 Paiement reçu</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold">
                                                {Number(tx.total_amount || 0).toLocaleString()} FCFA
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {tx.card_holder_id === user?.id
                                                    ? (tx.merchant_name || `Guichet #${tx.merchant_id}`)
                                                    : (tx.holder_name || 'Client')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* MODAL QR */}
                {showQRModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-5 text-white flex justify-between items-center">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <FaQrcode /> QR Code de paiement
                                </h3>
                                <button
                                    onClick={() => setShowQRModal(false)}
                                    className="text-white/70 hover:text-white text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6">
                                {!revealedData?.card_number ? (
                                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4">
                                        <div className="flex items-start gap-3">
                                            <FaExclamationTriangle className="text-yellow-600 text-2xl flex-shrink-0" />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-yellow-900 mb-1">
                                                    🔓 Numéro masqué
                                                </h4>
                                                <p className="text-sm text-yellow-800 mb-3">
                                                    Pour générer un QR code fonctionnel, vous devez d'abord afficher votre numéro de carte.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setRevealedData({
                                                            card_number: card.full_number || card.card_number,
                                                            cvv: card.cvv
                                                        });
                                                        toast.success('Numéro révélé ! Le QR va se générer.');
                                                    }}
                                                    className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                                                >
                                                    <FaEye /> Révéler le numéro
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-200">
                                            <p className="text-xs text-blue-800 text-center">
                                                📱 Faites scanner ce QR code par un guichet pour payer
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border-2 border-purple-200 mb-4">
                                            {getPaymentQRUrl() ? (
                                                <img
                                                    src={getPaymentQRUrl()}
                                                    alt="QR Code de paiement"
                                                    className="w-full max-w-[250px] mx-auto"
                                                    onError={(e) => {
                                                        console.error('❌ Erreur chargement QR');
                                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="250"%3E%3Crect width="250" height="250" fill="%237c3aed"/%3E%3Ctext x="125" y="125" text-anchor="middle" fill="white" font-size="16"%3ECashPays%3C/text%3E%3C/svg%3E';
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-center py-8 text-gray-400">
                                                    <FaQrcode className="text-5xl mx-auto mb-2" />
                                                    <p className="text-sm">QR non disponible</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 mb-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Titulaire</span>
                                                <span className="font-medium text-gray-800">
                                                    {card.card_holder || user?.fullname}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-600">Carte</span>
                                                <span className="font-mono font-medium text-purple-700">
                                                    {revealedData.card_number}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t border-purple-200">
                                                <span className="text-gray-600">Réseau</span>
                                                <span className="font-mono text-xs text-purple-700">
                                                    {getNetworkBaseUrl()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-4">
                                            <p className="text-xs text-green-800">
                                                ✅ QR dynamique : s'adapte automatiquement au réseau (localhost, IP locale, ou domaine)
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => copyToClipboard(getPaymentUrl(), 'link')}
                                        disabled={!revealedData?.card_number}
                                        className="flex-1 py-2 border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 text-sm font-medium disabled:opacity-50"
                                    >
                                        <FaCopy className="inline mr-1" /> Copier le lien
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={downloading}
                                        className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        <FaFilePdf /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DEMANDE CARTE */}
                {showRequestModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaCreditCard className="text-purple-600" /> Demander une carte
                                </h3>

                                <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        Une carte virtuelle Visa vous sera délivrée avec un numéro unique.
                                        Vous définirez votre PIN lors de la première utilisation.
                                    </p>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Raison (optionnel)
                                </label>
                                <textarea
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ex: Pour mes achats quotidiens..."
                                />

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowRequestModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleRequestCard}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <><FaSpinner className="animate-spin" /> Envoi...</>
                                        ) : (
                                            <>📤 Envoyer la demande</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL PIN */}
                {showPinModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaKey className="text-purple-600" />
                                    {card.pin_set ? 'Modifier mon PIN' : 'Définir mon PIN'}
                                </h3>

                                <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        {card.pin_set
                                            ? 'Entrez un nouveau PIN à 4 chiffres.'
                                            : 'Choisissez un PIN à 4 chiffres. Ne le partagez jamais.'}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {card.pin_set ? 'Nouveau PIN' : 'PIN'} (4 chiffres)
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength="4"
                                            value={pinForm.new_pin}
                                            onChange={(e) => setPinForm({
                                                ...pinForm,
                                                new_pin: e.target.value.replace(/\D/g, '').slice(0, 4)
                                            })}
                                            className="w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-purple-500"
                                            placeholder="••••"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirmer le PIN
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength="4"
                                            value={pinForm.confirm_pin}
                                            onChange={(e) => setPinForm({
                                                ...pinForm,
                                                confirm_pin: e.target.value.replace(/\D/g, '').slice(0, 4)
                                            })}
                                            className={`w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-purple-500 ${
                                                pinForm.confirm_pin && pinForm.new_pin !== pinForm.confirm_pin
                                                    ? 'border-red-400 bg-red-50'
                                                    : pinForm.confirm_pin && pinForm.new_pin === pinForm.confirm_pin
                                                        ? 'border-green-400 bg-green-50'
                                                        : ''
                                            }`}
                                            placeholder="••••"
                                        />
                                        {pinForm.confirm_pin && pinForm.new_pin !== pinForm.confirm_pin && (
                                            <p className="text-xs text-red-600 mt-1">Les PIN ne correspondent pas</p>
                                        )}
                                        {pinForm.confirm_pin && pinForm.new_pin === pinForm.confirm_pin && pinForm.new_pin.length === 4 && (
                                            <p className="text-xs text-green-600 mt-1">✓ Les PIN correspondent</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                                    <p className="text-xs text-yellow-800">
                                        <strong>⚠️ Évitez :</strong> 0000, 1111, 1234 ou votre date de naissance.
                                    </p>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowPinModal(false);
                                            setPinForm({ new_pin: '', confirm_pin: '' });
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSetPin}
                                        disabled={
                                            settingPin ||
                                            pinForm.new_pin.length !== 4 ||
                                            pinForm.new_pin !== pinForm.confirm_pin
                                        }
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {settingPin ? (
                                            <><FaSpinner className="animate-spin" /> Enregistrement...</>
                                        ) : (
                                            <><FaLock /> Enregistrer</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL RESET PIN */}
                {showResetModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaRedo className="text-red-600" />
                                    Réinitialiser mon PIN
                                </h3>

                                <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
                                    <div className="flex items-start gap-2">
                                        <FaExclamationTriangle className="text-red-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-red-800 font-semibold mb-1">
                                                ⚠️ Action soumise à validation
                                            </p>
                                            <p className="text-xs text-red-700">
                                                La réinitialisation supprimera votre PIN actuel.
                                                Vous devrez en définir un nouveau après approbation.
                                                Un administrateur traitera votre demande sous 24h.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Raison de la demande *
                                </label>
                                <textarea
                                    value={resetReason}
                                    onChange={(e) => setResetReason(e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-red-500"
                                    placeholder="Ex: J'ai oublié mon PIN..."
                                    required
                                    autoFocus
                                />

                                <div className="bg-yellow-50 rounded-lg p-3 mt-4 border border-yellow-200">
                                    <p className="text-xs text-yellow-800">
                                        🔔 Vous recevrez une notification dès que votre demande sera traitée.
                                    </p>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowResetModal(false);
                                            setResetReason('');
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleRequestReset}
                                        disabled={submittingReset || !resetReason.trim()}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submittingReset ? (
                                            <><FaSpinner className="animate-spin" /> Envoi...</>
                                        ) : (
                                            <><FaRedo /> Envoyer la demande</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default VirtualCard;