// src/pages/LoanRequest.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
    FaHandHoldingUsd, FaCalculator, FaArrowLeft, FaCheckCircle,
    FaTimes, FaSpinner, FaInfoCircle, FaUser, FaPhone,
    FaEnvelope, FaMapMarkerAlt, FaBriefcase, FaMoneyBillWave,
    FaCalendarAlt, FaPercent, FaClock, FaFileContract,
    FaShieldAlt, FaWallet, FaHistory, FaEye
} from 'react-icons/fa';

const LoanRequest = ({ user, socket }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState({ status: 'none', level: 0 });
    const [myRequests, setMyRequests] = useState([]);
    const [myLoans, setMyLoans] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [calculation, setCalculation] = useState(null);
    const [activeTab, setActiveTab] = useState('request');
    
    const [formData, setFormData] = useState({
        amount: '',
        duration_months: 6,
        reason: '',
        fullname: user?.fullname || '',
        phone: user?.phone || '',
        email: user?.email || '',
        address: '',
        occupation: '',
        monthly_income: ''
    });

    useEffect(() => {
        if (user) {
            checkKYC();
            fetchMyRequests();
            fetchMyLoans();
            setFormData(prev => ({
                ...prev,
                fullname: user.fullname || '',
                phone: user.phone || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const checkKYC = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKycStatus(response.data);
        } catch (error) {
            console.error('Erreur KYC:', error);
        }
    };

    const fetchMyRequests = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/api/loans/my-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyRequests(response.data.data || []);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const fetchMyLoans = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`${API_URL}/api/loans/my-loans', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyLoans(response.data.data || []);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    // ✅ Calculer dynamiquement
    const handleCalculate = async () => {
        const amount = parseFloat(formData.amount);
        const duration = parseInt(formData.duration_months);
        
        if (!amount || amount < 5000) {
            toast.error('Montant minimum: 5 000 FCFA');
            return;
        }
        
        if (!duration || duration < 1 || duration > 24) {
            toast.error('Durée: 1 à 24 mois');
            return;
        }
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`${API_URL}/api/loans/calculate', {
                amount, duration_months: duration
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setCalculation(response.data.data);
        } catch (error) {
            console.error('Erreur calcul:', error);
            toast.error('Erreur lors du calcul');
        }
    };

    // ✅ Soumettre la demande
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (kycStatus.status !== 'verified' || (kycStatus.level || 0) < 1) {
            toast.error('Vous devez être vérifié KYC niveau 1 minimum');
            return;
        }
        
        if (!formData.amount || !formData.reason) {
            toast.error('Montant et raison requis');
            return;
        }
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`${API_URL}/api/loans/request', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                toast.success('✅ Demande de prêt soumise !');
                setShowForm(false);
                setFormData({
                    amount: '', duration_months: 6, reason: '',
                    fullname: user?.fullname || '', phone: user?.phone || '',
                    email: user?.email || '', address: '', occupation: '', monthly_income: ''
                });
                setCalculation(null);
                fetchMyRequests();
            }
        } catch (error) {
            console.error('Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la demande');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Rembourser un prêt
    const handleRepay = async (loanId, amount) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(`/api/loans/${loanId}/repay`, 
                { amount }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                toast.success(`✅ Remboursement de ${amount.toLocaleString()} FCFA`);
                fetchMyLoans();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const formatAmount = (amount) => {
        if (!amount && amount !== 0) return '0 FCFA';
        return amount.toLocaleString() + ' FCFA';
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { color: 'bg-yellow-100 text-yellow-700', label: '⏳ En attente' },
            'approved': { color: 'bg-green-100 text-green-700', label: '✅ Approuvé' },
            'rejected': { color: 'bg-red-100 text-red-700', label: '❌ Rejeté' },
            'active': { color: 'bg-blue-100 text-blue-700', label: '📊 Actif' },
            'completed': { color: 'bg-gray-100 text-gray-700', label: '✔️ Terminé' }
        };
        return badges[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    };

    const canRequest = kycStatus.status === 'verified' && (kycStatus.level || 0) >= 1;
    const hasActiveLoan = myLoans.some(l => l.status === 'active');
    const hasPendingRequest = myRequests.some(r => r.status === 'pending');

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaHandHoldingUsd /> Demande de Prêt
                            </h1>
                            <p className="text-blue-200">Financez vos projets avec AlkherPay</p>
                            <div className="flex gap-4 mt-3 text-sm text-blue-200">
                                <span>💰 Taux: 5% / an</span>
                                <span>📅 Durée: 1-24 mois</span>
                                <span>💵 Max: 5 000 000 FCFA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerte KYC */}
                {!canRequest && (
                    <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                        <div className="flex items-center gap-3">
                            <FaInfoCircle className="text-yellow-500 text-2xl" />
                            <div className="flex-1">
                                <p className="font-bold text-yellow-700">⚠️ KYC niveau 1 requis</p>
                                <p className="text-sm text-gray-600">
                                    Vous devez être vérifié KYC niveau 1 minimum pour demander un prêt.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/kyc')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Vérifier mon compte
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'request'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaHandHoldingUsd /> Nouvelle demande
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'requests'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaHistory /> Mes demandes
                        {myRequests.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                                {myRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'loans'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaWallet /> Mes prêts
                        {myLoans.filter(l => l.status === 'active').length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs">
                                {myLoans.filter(l => l.status === 'active').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab: Nouvelle demande */}
                {activeTab === 'request' && (
                    <div>
                        {hasActiveLoan ? (
                            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                                <FaInfoCircle className="text-blue-500 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Vous avez déjà un prêt actif en cours de remboursement.</p>
                                <button
                                    onClick={() => setActiveTab('loans')}
                                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg"
                                >
                                    Voir mes prêts
                                </button>
                            </div>
                        ) : hasPendingRequest ? (
                            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                                <FaClock className="text-yellow-500 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Vous avez déjà une demande de prêt en attente.</p>
                                <button
                                    onClick={() => setActiveTab('requests')}
                                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg"
                                >
                                    Voir ma demande
                                </button>
                            </div>
                        ) : (
                            <div className="bg-blue-700 rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-6">
                                    Formulaire de demande de prêt
                                </h2>
                                
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Montant et durée */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Montant souhaité (FCFA) *
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                                onBlur={handleCalculate}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="5 000 - 5 000 000"
                                                min="5000"
                                                max="5000000"
                                                step="1000"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Durée (mois) *
                                            </label>
                                            <select
                                                value={formData.duration_months}
                                                onChange={(e) => {
                                                    setFormData({...formData, duration_months: e.target.value});
                                                    setTimeout(handleCalculate, 100);
                                                }}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            >
                                                {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(m => (
                                                    <option key={m} value={m}>{m} mois</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Calcul */}
                                    {calculation && (
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                            <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                                                <FaCalculator /> Simulation
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">Montant</p>
                                                    <p className="font-bold">{formatAmount(calculation.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Intérêts (5%/an)</p>
                                                    <p className="font-bold text-orange-600">{formatAmount(calculation.interestAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Total à rembourser</p>
                                                    <p className="font-bold text-blue-600">{formatAmount(calculation.totalAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Mensualité</p>
                                                    <p className="font-bold text-green-600">{formatAmount(calculation.monthlyPayment)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Raison */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Raison du prêt *
                                        </label>
                                        <textarea
                                            value={formData.reason}
                                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                            placeholder="Expliquez pourquoi vous demandez ce prêt..."
                                            required
                                        />
                                    </div>

                                    {/* Informations personnelles */}
                                    <div className="border-t pt-6">
                                        <h3 className="font-bold text-gray-700 mb-4">
                                            Informations complémentaires
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nom complet
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.fullname}
                                                    onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Téléphone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Profession
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.occupation}
                                                    onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Revenu mensuel (FCFA)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.monthly_income}
                                                    onChange={(e) => setFormData({...formData, monthly_income: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                    placeholder="Optionnel"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Adresse
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                                    className="w-full px-4 py-2 border rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bouton */}
                                    <button
                                        type="submit"
                                        disabled={submitting || !canRequest}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
                                    >
                                        {submitting ? (
                                            <><FaSpinner className="animate-spin" /> Envoi...</>
                                        ) : (
                                            <><FaCheckCircle /> Soumettre la demande</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Mes demandes */}
                {activeTab === 'requests' && (
                    <div>
                        {myRequests.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <FaHistory className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune demande</p>
                                <button
                                    onClick={() => setActiveTab('request')}
                                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg"
                                >
                                    Nouvelle demande
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myRequests.map(request => {
                                    const badge = getStatusBadge(request.status);
                                    return (
                                        <div key={request.id} className="bg-white rounded-xl shadow-lg p-4">
                                            <div className="flex justify-between items-start flex-wrap gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                        <span className="text-xs text-gray-400">#{request.id}</span>
                                                    </div>
                                                    <p className="font-bold text-lg">{formatAmount(request.amount)}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {request.duration_months} mois • Taux {request.interest_rate}%/an
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatDate(request.requested_at)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Total à rembourser</p>
                                                    <p className="font-bold text-blue-600">{formatAmount(request.total_amount)}</p>
                                                    <p className="text-xs text-gray-400">
                                                        Mensualité: {formatAmount(request.monthly_payment)}
                                                    </p>
                                                    {request.rejection_reason && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            Raison: {request.rejection_reason}
                                                        </p>
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

                {/* Tab: Mes prêts */}
                {activeTab === 'loans' && (
                    <div>
                        {myLoans.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <FaWallet className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucun prêt</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myLoans.map(loan => {
                                    const progress = loan.total_amount > 0 
                                        ? (loan.amount_paid / loan.total_amount) * 100 
                                        : 0;
                                    const badge = getStatusBadge(loan.status);
                                    
                                    return (
                                        <div key={loan.id} className="bg-white rounded-xl shadow-lg p-4">
                                            <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {loan.contract_number}
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-xl">{formatAmount(loan.amount)}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Total: {formatAmount(loan.total_amount)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Mensualité</p>
                                                    <p className="font-bold text-blue-600">
                                                        {formatAmount(loan.monthly_payment)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Durée: {loan.duration_months} mois
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progression */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-500">
                                                        Remboursé: {formatAmount(loan.amount_paid)}
                                                    </span>
                                                    <span className="font-bold">{progress.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className="h-3 rounded-full bg-green-500 transition-all"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Reste: {formatAmount(loan.remaining_amount)}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            {loan.status === 'active' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const amount = prompt(`Montant à rembourser (max: ${loan.remaining_amount} FCFA):`);
                                                            if (amount && parseInt(amount) > 0) {
                                                                handleRepay(loan.id, parseInt(amount));
                                                            }
                                                        }}
                                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                                                    >
                                                        <FaMoneyBillWave className="inline mr-2" /> Rembourser
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default LoanRequest;