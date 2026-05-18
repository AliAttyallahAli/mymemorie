// src/pages/TaxPayment.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaBuilding, FaUser, FaPhone, FaMapMarker, FaStore, FaFileInvoice, FaCalendar, FaMoneyBillWave, FaDownload, FaEye, FaLandmark } from 'react-icons/fa';
import Layout from '../components/Layout';
import { generateTaxReceiptPDF } from '../services/pdfGenerator';

const taxTypes = [
    { value: 'Taxe Commerçante', label: '🏪 Taxe Commerçante', defaultAmount: 25000 },
    { value: "Taxe d'Habitation", label: '🏠 Taxe d\'Habitation', defaultAmount: 15000 },
    { value: 'Taxe Foncière', label: '🌍 Taxe Foncière', defaultAmount: 30000 },
    { value: 'Patente', label: '🏢 Patente', defaultAmount: 40000 },
    { value: 'Taxe de Séjour', label: '🏨 Taxe de Séjour', defaultAmount: 5000 }
];

function TaxPayment({ user }) {
    const [offices, setOffices] = useState([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [selectedTaxType, setSelectedTaxType] = useState(taxTypes[0]);
    const [amount, setAmount] = useState(taxTypes[0].defaultAmount);
    const [loading, setLoading] = useState(false);
    const [payments, setPayments] = useState([]);
    const [activeTab, setActiveTab] = useState('pay');
    const [formData, setFormData] = useState({
        taxpayer_name: '',
        taxpayer_phone: '',
        taxpayer_address: '',
        business_number: '',
        property_address: '',
        tax_period: new Date().getFullYear().toString()
    });

    useEffect(() => {
        fetchOffices();
        fetchPaymentHistory();
    }, []);

    const fetchOffices = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/tax/offices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOffices(response.data);
        } catch (error) {
            console.error('Erreur chargement communes:', error);
            toast.error('Erreur chargement des communes');
        }
    };

    const fetchPaymentHistory = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/tax/payments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayments(response.data);
        } catch (error) {
            console.error('Erreur historique:', error);
        }
    };

    const handleTaxTypeChange = (e) => {
        const selected = taxTypes.find(t => t.value === e.target.value);
        setSelectedTaxType(selected);
        setAmount(selected.defaultAmount);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedOffice) {
            toast.error('Veuillez sélectionner une commune');
            return;
        }
        
        if (amount < 100) {
            toast.error('Le montant minimum est de 100 FCFA');
            return;
        }
        
        if (!formData.taxpayer_name) {
            toast.error('Veuillez entrer le nom du contribuable');
            return;
        }
        
        if (!formData.taxpayer_phone) {
            toast.error('Veuillez entrer le téléphone du contribuable');
            return;
        }
        
        setLoading(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('/api/tax/pay', {
                office_id: selectedOffice,
                taxpayer_name: formData.taxpayer_name || user?.fullname,
                taxpayer_phone: formData.taxpayer_phone || user?.phone,
                taxpayer_address: formData.taxpayer_address || '',
                business_number: formData.business_number || '',
                property_address: formData.property_address || '',
                tax_type: selectedTaxType.value,
                tax_period: formData.tax_period,
                amount: amount,
                notes: `Paiement ${selectedTaxType.value} - ${formData.tax_period}`
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                toast.success('Paiement effectué avec succès !');
                generateTaxReceiptPDF(response.data.receipt);
                setFormData({
                    ...formData,
                    taxpayer_address: '',
                    business_number: '',
                    property_address: ''
                });
                fetchPaymentHistory();
                setActiveTab('history');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur lors du paiement');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReceipt = async (receiptNumber) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`/api/tax/receipt/${receiptNumber}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            generateTaxReceiptPDF(response.data);
        } catch (error) {
            toast.error('Erreur lors du téléchargement');
        }
    };

    const fee = Math.floor(amount * 0.01);
    const totalAmount = amount + fee;

    return (
        <Layout user={user}>
            <div className="max-w-6xl mx-auto">
                {/* Header avec dégradé blue-marine */}
                <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 rounded-2xl p-6 mb-8 shadow-lg">
                    <h1 className="text-2xl font-bold text-white mb-2">💰 Paiement des Impôts et Taxes</h1>
                    <p className="text-blue-200">Payez vos taxes en ligne simplement et rapidement</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('pay')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === 'pay'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaMoneyBillWave className="inline mr-2" /> Payer une taxe
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === 'history'
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaFileInvoice className="inline mr-2" /> Historique des paiements
                    </button>
                </div>

                {/* Formulaire de paiement */}
                {activeTab === 'pay' && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-6 p-6">
                            {/* Colonne gauche - Formulaire */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Informations de paiement</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaBuilding className="inline mr-1 text-blue-600" /> Commune / Service d'impôt *
                                        </label>
                                        <select
                                            value={selectedOffice}
                                            onChange={(e) => setSelectedOffice(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Sélectionnez une commune</option>
                                            {offices.map(office => (
                                                <option key={office.id} value={office.id}>
                                                    {office.name} - {office.office_number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaFileInvoice className="inline mr-1 text-blue-600" /> Type de taxe *
                                        </label>
                                        <select
                                            value={selectedTaxType.value}
                                            onChange={handleTaxTypeChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {taxTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label} - {type.defaultAmount.toLocaleString()} FCFA
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaCalendar className="inline mr-1 text-blue-600" /> Période
                                        </label>
                                        <input
                                            type="text"
                                            name="tax_period"
                                            value={formData.tax_period}
                                            onChange={handleInputChange}
                                            placeholder="Ex: 2024-2025"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaUser className="inline mr-1 text-blue-600" /> Nom complet du contribuable *
                                        </label>
                                        <input
                                            type="text"
                                            name="taxpayer_name"
                                            value={formData.taxpayer_name}
                                            onChange={handleInputChange}
                                            placeholder="Nom du propriétaire / commerçant"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaPhone className="inline mr-1 text-blue-600" /> Téléphone *
                                        </label>
                                        <input
                                            type="tel"
                                            name="taxpayer_phone"
                                            value={formData.taxpayer_phone}
                                            onChange={handleInputChange}
                                            placeholder="Numéro de téléphone"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaMapMarker className="inline mr-1 text-blue-600" /> Adresse
                                        </label>
                                        <input
                                            type="text"
                                            name="taxpayer_address"
                                            value={formData.taxpayer_address}
                                            onChange={handleInputChange}
                                            placeholder="Adresse complète"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaStore className="inline mr-1 text-blue-600" /> Numéro de boutique / local
                                        </label>
                                        <input
                                            type="text"
                                            name="business_number"
                                            value={formData.business_number}
                                            onChange={handleInputChange}
                                            placeholder="Numéro de la boutique (si commerçant)"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FaMapMarker className="inline mr-1 text-blue-600" /> Adresse de la propriété
                                        </label>
                                        <input
                                            type="text"
                                            name="property_address"
                                            value={formData.property_address}
                                            onChange={handleInputChange}
                                            placeholder="Adresse du bien"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl font-semibold hover:from-blue-800 hover:to-blue-900 transition-all disabled:opacity-50 shadow-md mt-4"
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Traitement...
                                            </div>
                                        ) : (
                                            '💰 Payer la taxe'
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Colonne droite - Récapitulatif */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Récapitulatif</h2>
                                
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="text-gray-600">Type de taxe</span>
                                        <span className="font-medium">{selectedTaxType.label}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="text-gray-600">Période</span>
                                        <span className="font-medium">{formData.tax_period}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="text-gray-600">Montant de la taxe</span>
                                        <span className="font-medium">{amount.toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="text-gray-600">Frais de service (1%)</span>
                                        <span className="font-medium text-orange-600">{fee.toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 -mx-3">
                                        <span className="font-bold text-gray-800">Total à payer</span>
                                        <span className="font-bold text-blue-700 text-xl">{totalAmount.toLocaleString()} FCFA</span>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                                    <p className="text-sm text-blue-800">
                                        <strong>ℹ️ Information</strong><br />
                                        Le paiement sera effectué depuis votre wallet CashPays. 
                                        Un reçu officiel sera généré et disponible en PDF après paiement.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Historique des paiements */}
                {activeTab === 'history' && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Historique des paiements</h2>
                            
                            {payments.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FaFileInvoice className="text-5xl mx-auto mb-3 text-gray-300" />
                                    <p>Aucun paiement effectué</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">N° Reçu</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Commune</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contribuable</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Montant</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {payments.map(payment => (
                                                <tr key={payment.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-mono text-blue-600">{payment.receipt_number}</td>
                                                    <td className="px-4 py-3 text-sm">{payment.office_name || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">{payment.tax_type}</td>
                                                    <td className="px-4 py-3 text-sm">{payment.taxpayer_name}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                                                        {payment.total_amount.toLocaleString()} FCFA
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleDownloadReceipt(payment.receipt_number)}
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                            title="Télécharger le reçu"
                                                        >
                                                            <FaDownload />
                                                        </button>
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
            </div>
        </Layout>
    );
}

export default TaxPayment;