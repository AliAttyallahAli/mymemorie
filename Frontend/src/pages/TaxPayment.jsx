// src/pages/TaxPayment.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    FaLandmark, FaMoneyBillWave, FaReceipt, FaCheckCircle,
    FaUser, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaBuilding,
    FaPrint, FaHistory, FaArrowLeft, FaSpinner, FaFileInvoice,
    FaUniversity, FaInfoCircle, FaWallet
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ Types de taxes
const taxTypes = [
    { id: 1, name: 'Taxe Commerçante', label: 'Taxe Commerçante', default_amount: 25000, description: 'Pour les commerçants et boutiques' },
    { id: 2, name: "Taxe d'Habitation", label: "Taxe d'Habitation", default_amount: 15000, description: 'Pour les résidences' },
    { id: 3, name: 'Taxe Foncière', label: 'Taxe Foncière', default_amount: 30000, description: 'Pour les terrains et propriétés' },
    { id: 4, name: 'Patente', label: 'Patente', default_amount: 40000, description: 'Taxe professionnelle' },
    { id: 5, name: 'Taxe de Séjour', label: 'Taxe de Séjour', default_amount: 5000, description: 'Pour les hôtels et logements touristiques' }
];

// ✅ Extraction robuste
const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    if (data && Array.isArray(data.data)) return data.data;
    return [];
};

const TaxPayment = ({ user }) => {
    const navigate = useNavigate();

    // ============================================
    // ÉTATS
    // ============================================
    const [step, setStep] = useState(1);
    const [communes, setCommunes] = useState([]);
    const [loadingCommunes, setLoadingCommunes] = useState(true);
    const [selectedCommune, setSelectedCommune] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [paymentReceipt, setPaymentReceipt] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    const [formData, setFormData] = useState({
        taxpayerName: user?.fullname || user?.name || '',
        taxpayerPhone: user?.phone || '',
        taxpayerAddress: user?.address || '',
        taxType: 'Taxe Commerçante',
        taxPeriod: new Date().getFullYear().toString(),
        amount: 25000,
        businessNumber: '',
        propertyAddress: ''
    });

    // ============================================
    // HELPERS
    // ============================================
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    // ============================================
    // REDIRECTION (dans useEffect pour éviter le warning)
    // ============================================
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    useEffect(() => {
        if (user) {
            fetchCommunes();
            fetchPaymentHistory();
            fetchWalletBalance();
        }
    }, [user]);

    const fetchCommunes = async () => {
        setLoadingCommunes(true);
        try {
            const response = await axios.get(`${API_URL}/api/communes`, getAuthHeaders());

            console.log('📥 Communes reçues:', response.data);

            const communesData = extractArray(response.data, 'communes', 'data');

            if (communesData.length > 0) {
                setCommunes(communesData);
                console.log('✅ Communes chargées:', communesData.length);
            } else {
                console.warn('⚠️ Aucune commune - utilisation fallback');
                setCommunes([
                    { id: 1, name: "Commune de N'Djaména Centre", address: "N'Djaména Centre", phone: '62787301' },
                    { id: 2, name: 'Commune de Mongo', address: 'Mongo', phone: '62787302' },
                    { id: 3, name: 'Commune de Moundou', address: 'Moundou', phone: '62787303' },
                    { id: 4, name: 'Commune de Sarh', address: 'Sarh', phone: '62787304' },
                    { id: 5, name: "Commune d'Abéché", address: 'Abéché', phone: '62787305' }
                ]);
            }
        } catch (error) {
            console.error('❌ Erreur communes:', error);
            setCommunes([
                { id: 1, name: "Commune de N'Djaména Centre", address: "N'Djaména Centre", phone: '62787301' },
                { id: 2, name: 'Commune de Mongo', address: 'Mongo', phone: '62787302' },
                { id: 3, name: 'Commune de Moundou', address: 'Moundou', phone: '62787303' },
                { id: 4, name: 'Commune de Sarh', address: 'Sarh', phone: '62787304' },
                { id: 5, name: "Commune d'Abéché", address: 'Abéché', phone: '62787305' }
            ]);
        } finally {
            setLoadingCommunes(false);
        }
    };

    const fetchPaymentHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/tax/payments`, getAuthHeaders());
            const paymentsData = extractArray(response.data, 'payments', 'data');
            setPaymentHistory(paymentsData);
            console.log('📋 Historique:', paymentsData.length);
        } catch (error) {
            console.error('❌ Erreur historique:', error);
            setPaymentHistory([]);
        }
    };

    const fetchWalletBalance = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/wallet/balance`, getAuthHeaders());
            const balance = response.data?.balance || response.data?.wallet?.balance || 0;
            setWalletBalance(Number(balance) || 0);
        } catch (error) {
            console.error('❌ Erreur solde:', error);
            setWalletBalance(0);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleCommuneSelect = (commune) => {
        setSelectedCommune(commune);
        setStep(2);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTaxTypeChange = (e) => {
        const taxTypeName = e.target.value;
        const selected = taxTypes.find(t => t.name === taxTypeName);
        setFormData(prev => ({
            ...prev,
            taxType: taxTypeName,
            amount: selected?.default_amount || ''
        }));
    };

    // ============================================
    // PAIEMENT
    // ============================================
    const handleSubmitPayment = async (e) => {
        e.preventDefault();

        console.log('=== PAIEMENT TAXE ===');
        console.log('Commune:', selectedCommune);
        console.log('Montant:', formData.amount);
        console.log('User:', user?.id || user?.userId);

        // ✅ VALIDATIONS
        if (!selectedCommune) {
            toast.error('Veuillez sélectionner une commune');
            return;
        }

        const amountNum = parseFloat(formData.amount);
        if (isNaN(amountNum) || amountNum < 100) {
            toast.error('Le montant minimum est de 100 FCFA');
            return;
        }

        if (!formData.taxpayerName?.trim()) {
            toast.error('Nom du contribuable requis');
            return;
        }

        if (!formData.taxpayerPhone?.trim()) {
            toast.error('Téléphone requis');
            return;
        }

        setIsSubmitting(true);

        try {
            // ✅ PAYLOAD aligné avec le backend
            const paymentData = {
                commune_id: parseInt(selectedCommune.id),
                office_id: parseInt(selectedCommune.id),
                commune_name: selectedCommune.name,
                taxpayer_name: formData.taxpayerName.trim(),
                taxpayer_phone: formData.taxpayerPhone.trim(),
                taxpayer_address: formData.taxpayerAddress || '',
                business_number: formData.businessNumber || '',
                property_address: formData.propertyAddress || '',
                tax_type: formData.taxType,
                tax_period: String(formData.taxPeriod || ''),
                amount: parseInt(amountNum),
                notes: `Paiement ${formData.taxType} - ${formData.taxPeriod}`
            };

            console.log('📤 Payload:', paymentData);

            const response = await axios.post(
                `${API_URL}/api/tax/pay`,
                paymentData,
                getAuthHeaders()
            );

            console.log('📥 Réponse:', response.data);

            if (response.data.success) {
                setPaymentReceipt({
                    ...response.data.receipt,
                    taxpayer_name: formData.taxpayerName,
                    taxpayer_phone: formData.taxpayerPhone,
                    tax_type: formData.taxType,
                    tax_period: formData.taxPeriod,
                    amount: amountNum
                });

                toast.success('Paiement effectué avec succès !');
                setStep(3);

                // Rafraîchir
                fetchWalletBalance();
                fetchPaymentHistory();
            } else {
                toast.error(response.data.error || 'Erreur lors du paiement');
            }

        } catch (error) {
            console.error('❌ Erreur paiement:', error);
            console.error('Détails:', error.response?.data);
            toast.error(error.response?.data?.error || 'Erreur lors du paiement');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // IMPRESSION REÇU
    // ============================================
    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu ${paymentReceipt?.receipt_number || 'Taxe'}</title>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #1e3a5f, #0a192f); color: white; padding: 30px; text-align: center; }
                    .header h1 { font-size: 28px; margin-bottom: 10px; }
                    .body { padding: 30px; }
                    .section { margin-bottom: 25px; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; }
                    .section h3 { color: #1e3a5f; font-size: 16px; margin-bottom: 15px; border-left: 4px solid #1e3a5f; padding-left: 10px; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; }
                    .label { color: #666; font-weight: 500; }
                    .value { color: #333; font-weight: 600; }
                    .total { background: #eff6ff; padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center; }
                    .total .amount { font-size: 32px; font-weight: bold; color: #1e3a5f; }
                    .badge { display: inline-block; background: #16a34a; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
                    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; }
                    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏛️ REÇU OFFICIEL</h1>
                        <p>République du Tchad - Paiement d'impôt</p>
                    </div>
                    <div class="body">
                        <div class="section">
                            <h3>📄 Informations générales</h3>
                            <div class="row"><span class="label">N° Reçu</span><span class="value">${paymentReceipt?.receipt_number || 'N/A'}</span></div>
                            <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleString('fr-FR')}</span></div>
                            <div class="row"><span class="label">Statut</span><span class="badge">PAYÉ</span></div>
                        </div>
                        <div class="section">
                            <h3>🏛️ Commune</h3>
                            <div class="row"><span class="label">Nom</span><span class="value">${selectedCommune?.name || 'N/A'}</span></div>
                            <div class="row"><span class="label">Adresse</span><span class="value">${selectedCommune?.address || '-'}</span></div>
                        </div>
                        <div class="section">
                            <h3>👤 Contribuable</h3>
                            <div class="row"><span class="label">Nom</span><span class="value">${formData.taxpayerName}</span></div>
                            <div class="row"><span class="label">Téléphone</span><span class="value">${formData.taxpayerPhone}</span></div>
                        </div>
                        <div class="section">
                            <h3>💰 Détails du paiement</h3>
                            <div class="row"><span class="label">Type de taxe</span><span class="value">${formData.taxType}</span></div>
                            <div class="row"><span class="label">Période</span><span class="value">${formData.taxPeriod}</span></div>
                            <div class="row"><span class="label">Montant</span><span class="value">${parseInt(formData.amount).toLocaleString()} FCFA</span></div>
                        </div>
                        <div class="total">
                            <div style="color: #666; margin-bottom: 8px;">TOTAL PAYÉ</div>
                            <div class="amount">${parseInt(formData.amount).toLocaleString()} FCFA</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Ce reçu est généré électroniquement et fait foi de paiement.</p>
                        <p>CashPays - Plateforme sécurisée</p>
                    </div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const handleNewPayment = () => {
        setStep(1);
        setSelectedCommune(null);
        setPaymentReceipt(null);
        setFormData({
            taxpayerName: user?.fullname || user?.name || '',
            taxpayerPhone: user?.phone || '',
            taxpayerAddress: user?.address || '',
            taxType: 'Taxe Commerçante',
            taxPeriod: new Date().getFullYear().toString(),
            amount: 25000,
            businessNumber: '',
            propertyAddress: ''
        });
    };

    // ============================================
    // RENDU
    // ============================================
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">

            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] shadow-lg border-b border-blue-500/20">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-white hover:text-blue-300 transition"
                        >
                            <FaArrowLeft /> Retour
                        </button>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-white">
                                Paiement Impôts & Taxes
                            </h1>
                            <p className="text-blue-300 text-sm flex items-center justify-center gap-1 mt-1">
                                <FaWallet /> Solde: <span className="font-bold">{walletBalance.toLocaleString()} FCFA</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-white px-4 py-2 rounded-lg transition"
                        >
                            <FaHistory /> Historique
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* PROGRESS */}
                    <div className="mb-8">
                        <div className="flex justify-between">
                            {[
                                { step: 1, label: 'Commune', icon: <FaBuilding /> },
                                { step: 2, label: 'Formulaire', icon: <FaFileInvoice /> },
                                { step: 3, label: 'Confirmation', icon: <FaCheckCircle /> }
                            ].map((s) => (
                                <div key={s.step} className="flex-1 text-center">
                                    <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-xl transition-all ${
                                        step >= s.step
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                                            : 'bg-gray-300 text-gray-500'
                                    }`}>
                                        {step > s.step ? '✓' : s.icon}
                                    </div>
                                    <p className={`text-sm mt-2 font-medium ${
                                        step >= s.step ? 'text-blue-400' : 'text-gray-400'
                                    }`}>
                                        {s.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="relative mt-4">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 -translate-y-1/2 rounded-full">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-full transition-all duration-500"
                                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ÉTAPE 1 */}
                    {step === 1 && (
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] p-6">
                                <h2 className="text-xl font-bold text-white">Sélectionnez votre commune</h2>
                                <p className="text-blue-300 text-sm">Choisissez la commune où vous payez vos impôts</p>
                            </div>
                            <div className="p-6">
                                {loadingCommunes ? (
                                    <div className="text-center py-12">
                                        <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
                                        <p className="text-gray-500">Chargement...</p>
                                    </div>
                                ) : communes.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FaUniversity className="text-5xl mx-auto mb-3 text-gray-300" />
                                        <p>Aucune commune disponible</p>
                                        <button onClick={fetchCommunes} className="mt-4 text-blue-600 underline">
                                            Recharger
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {communes.map(commune => (
                                            <button
                                                key={commune.id}
                                                onClick={() => handleCommuneSelect(commune)}
                                                className="p-4 border-2 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FaUniversity className="text-blue-600 text-2xl group-hover:scale-110 transition" />
                                                    <div>
                                                        <h3 className="font-bold text-gray-800">{commune.name}</h3>
                                                        <p className="text-sm text-gray-500">{commune.address || commune.province || '-'}</p>
                                                        {commune.phone && (
                                                            <p className="text-xs text-gray-400 mt-1">📞 {commune.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 2 */}
                    {step === 2 && selectedCommune && (
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] p-6">
                                <h2 className="text-xl font-bold text-white">Paiement à {selectedCommune.name}</h2>
                                <p className="text-blue-300 text-sm">Remplissez les informations</p>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSubmitPayment}>
                                    <div className="grid md:grid-cols-2 gap-5">

                                        {/* Section contribuable */}
                                        <div className="md:col-span-2">
                                            <div className="bg-blue-50 p-4 rounded-xl mb-2 border border-blue-200">
                                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                                    <FaInfoCircle /> Informations du contribuable
                                                </h3>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nom complet <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="taxpayerName"
                                                    value={formData.taxpayerName}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Téléphone <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="taxpayerPhone"
                                                    value={formData.taxpayerPhone}
                                                    onChange={handleInputChange}
                                                    maxLength="8"
                                                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                                            <div className="relative">
                                                <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-400" />
                                                <textarea
                                                    name="taxpayerAddress"
                                                    value={formData.taxpayerAddress}
                                                    onChange={handleInputChange}
                                                    rows="2"
                                                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Adresse complète"
                                                />
                                            </div>
                                        </div>

                                        {/* Section taxe */}
                                        <div className="md:col-span-2">
                                            <div className="bg-blue-50 p-4 rounded-xl mb-2 border border-blue-200">
                                                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                                    <FaFileInvoice /> Détails de la taxe
                                                </h3>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Type de taxe <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="taxType"
                                                value={formData.taxType}
                                                onChange={handleTaxTypeChange}
                                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                            >
                                                {taxTypes.map(type => (
                                                    <option key={type.id} value={type.name}>
                                                        {type.label} - {type.default_amount.toLocaleString()} FCFA
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {taxTypes.find(t => t.name === formData.taxType)?.description}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Période <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="taxPeriod"
                                                    value={formData.taxPeriod}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Montant (FCFA) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="number"
                                                    name="amount"
                                                    value={formData.amount}
                                                    onChange={handleInputChange}
                                                    min="100"
                                                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Numéro de commerce
                                            </label>
                                            <input
                                                type="text"
                                                name="businessNumber"
                                                value={formData.businessNumber}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                placeholder="Optionnel"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Adresse de la propriété
                                            </label>
                                            <textarea
                                                name="propertyAddress"
                                                value={formData.propertyAddress}
                                                onChange={handleInputChange}
                                                rows="2"
                                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                                                placeholder="Optionnel"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl hover:from-blue-800 hover:to-blue-900 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                                        >
                                            {isSubmitting ? (
                                                <><FaSpinner className="animate-spin" /> Traitement...</>
                                            ) : (
                                                <><FaMoneyBillWave /> Payer maintenant</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 3 */}
                    {step === 3 && paymentReceipt && (
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
                                <FaCheckCircle className="w-20 h-20 mx-auto text-white mb-4" />
                                <h2 className="text-2xl font-bold text-white">Paiement réussi !</h2>
                                <p className="text-green-100 mt-2">Votre transaction a été effectuée</p>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-gray-500">N° Reçu</p>
                                            <p className="font-mono text-sm font-semibold">{paymentReceipt.receipt_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Date</p>
                                            <p className="font-medium">{new Date().toLocaleString('fr-FR')}</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-blue-700 pl-4">
                                        <p className="text-sm text-gray-500">Commune</p>
                                        <p className="font-bold text-lg">{selectedCommune?.name}</p>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                        <p className="text-sm text-gray-500 mb-2">Contribuable</p>
                                        <p className="font-medium">{formData.taxpayerName}</p>
                                        <p className="text-sm text-gray-600">{formData.taxpayerPhone}</p>
                                    </div>

                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-600">Type de taxe:</span>
                                            <span className="font-medium">{formData.taxType}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-600">Période:</span>
                                            <span className="font-medium">{formData.taxPeriod}</span>
                                        </div>
                                        <div className="border-t border-blue-200 pt-2 mt-2">
                                            <div className="flex justify-between font-bold">
                                                <span>Montant payé:</span>
                                                <span className="text-blue-800 text-xl">
                                                    {parseInt(formData.amount).toLocaleString()} FCFA
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 flex gap-4 border-t">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 transition font-medium flex items-center justify-center gap-2"
                                >
                                    <FaPrint /> Imprimer
                                </button>
                                <button
                                    onClick={handleNewPayment}
                                    className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl hover:from-blue-800 hover:to-blue-900 transition font-medium"
                                >
                                    Nouveau paiement
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL HISTORIQUE */}
            {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaHistory /> Historique
                            </h2>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="text-white hover:text-blue-200 text-3xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {paymentHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FaReceipt className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                                    <p>Aucun paiement effectué</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {paymentHistory.map((payment) => (
                                        <div key={payment.id} className="border rounded-xl p-4 hover:shadow-md transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{payment.tax_type}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Reçu: {payment.receipt_number}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{payment.office_name || payment.commune_name || '-'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-blue-700">
                                                        {Number(payment.total_amount || payment.amount || 0).toLocaleString()} FCFA
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {payment.payment_date
                                                            ? new Date(payment.payment_date).toLocaleDateString('fr-FR')
                                                            : '-'}
                                                    </p>
                                                    <p className="text-xs text-green-600 mt-1">✓ Payé</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxPayment;