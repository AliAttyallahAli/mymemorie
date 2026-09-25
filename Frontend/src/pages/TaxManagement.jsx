// src/pages/TaxManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaLandmark, FaMoneyBillWave, FaReceipt, FaCheckCircle,
    FaFileInvoice, FaChartLine, FaSearch, FaDownload,
    FaFilter, FaSpinner, FaEye, FaTimes, FaUniversity,
    FaWallet, FaUsers, FaCalendarAlt, FaArrowLeft
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ Extraction robuste
const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    if (data && Array.isArray(data.data)) return data.data;
    return [];
};

function TaxManagement({ user }) {
    const navigate = useNavigate();

    // ============================================
    // ÉTATS
    // ============================================
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({
        total_payments: 0,
        total_collected: 0,
        total_taxes: 0,
        total_fees: 0,
        paid: 0,
        pending: 0
    });
    const [byTaxType, setByTaxType] = useState([]);
    const [byCommune, setByCommune] = useState([]);

    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTaxType, setFilterTaxType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCommune, setFilterCommune] = useState('');

    // Modal détail
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // ============================================
    // HELPERS
    // ============================================
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    // ============================================
    // REDIRECTION
    // ============================================
    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // ============================================
    // CHARGEMENT
    // ============================================
    useEffect(() => {
        if (user?.role === 'admin') {
            fetchPayments();
            fetchStats();
        }
    }, [user]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/admin/tax/payments?limit=500`,
                getAuthHeaders()
            );

            console.log('📥 Paiements reçus:', response.data);

            const paymentsData = extractArray(response.data, 'payments', 'data');
            setPayments(paymentsData);
            console.log('✅ Paiements chargés:', paymentsData.length);

        } catch (error) {
            console.error('❌ Erreur paiements:', error);
            toast.error('Erreur chargement des paiements');
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/admin/tax/stats`,
                getAuthHeaders()
            );

            console.log('📊 Stats reçues:', response.data);

            if (response.data.stats) {
                setStats(response.data.stats);
            }
            if (response.data.byTaxType) {
                setByTaxType(response.data.byTaxType);
            }
            if (response.data.byCommune) {
                setByCommune(response.data.byCommune);
            }

        } catch (error) {
            console.error('❌ Erreur stats:', error);
        }
    };

    // ============================================
    // FILTRES
    // ============================================
    const filteredPayments = payments.filter(payment => {
        // Recherche texte
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const match =
                payment.receipt_number?.toLowerCase().includes(term) ||
                payment.taxpayer_name?.toLowerCase().includes(term) ||
                payment.taxpayer_phone?.includes(term) ||
                payment.office_name?.toLowerCase().includes(term);
            if (!match) return false;
        }

        // Filtre type
        if (filterTaxType && payment.tax_type !== filterTaxType) return false;

        // Filtre statut
        if (filterStatus && payment.payment_status !== filterStatus) return false;

        // Filtre commune
        if (filterCommune && payment.office_name !== filterCommune) return false;

        return true;
    });

    // ============================================
    // EXPORT CSV
    // ============================================
    const handleExportCSV = () => {
        const headers = [
            'N° Reçu', 'Date', 'Commune', 'Contribuable', 'Téléphone',
            'Type', 'Période', 'Montant', 'Frais', 'Total', 'Statut'
        ];

        const rows = filteredPayments.map(p => [
            p.receipt_number,
            p.payment_date ? new Date(p.payment_date).toLocaleString('fr-FR') : '',
            p.office_name || '',
            p.taxpayer_name,
            p.taxpayer_phone,
            p.tax_type,
            p.tax_period || '',
            p.amount,
            p.fee,
            p.total_amount,
            p.payment_status
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `paiements_taxes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('Export CSV téléchargé');
    };

    // ============================================
    // RENDU
    // ============================================
    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <Layout user={user}>
            <div className="max-w-7xl mx-auto p-4">

                {/* BOUTON RETOUR */}
                <button
                    onClick={() => navigate('/admin')}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaLandmark /> Gestion des Taxes
                            </h1>
                            <p className="text-blue-200">
                                Suivi et statistiques des paiements d'impôts
                            </p>
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-lg transition-all"
                        >
                            <FaDownload /> Exporter CSV
                        </button>
                    </div>
                </div>

                {/* STATISTIQUES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Total paiements</span>
                            <FaReceipt className="text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {stats.total_payments || payments.length}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Total collecté</span>
                            <FaMoneyBillWave className="text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                            {Number(stats.total_collected || 0).toLocaleString()} FCFA
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Taxes</span>
                            <FaWallet className="text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {Number(stats.total_taxes || 0).toLocaleString()} FCFA
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Frais</span>
                            <FaChartLine className="text-orange-600" />
                        </div>
                        <div className="text-2xl font-bold text-orange-700">
                            {Number(stats.total_fees || 0).toLocaleString()} FCFA
                        </div>
                    </div>
                </div>

                {/* STATS PAR TYPE ET COMMUNE */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* Par type */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <FaFileInvoice className="text-blue-600" /> Par type de taxe
                        </h3>
                        {byTaxType.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Aucune donnée</p>
                        ) : (
                            <div className="space-y-2">
                                {byTaxType.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                        <span className="text-sm text-gray-700">{item.tax_type}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-blue-700">
                                                {Number(item.total || 0).toLocaleString()} FCFA
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                ({item.count})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Par commune */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <FaUniversity className="text-blue-600" /> Top communes
                        </h3>
                        {byCommune.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Aucune donnée</p>
                        ) : (
                            <div className="space-y-2">
                                {byCommune.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                        <span className="text-sm text-gray-700">
                                            {item.commune_name || 'N/A'}
                                        </span>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-blue-700">
                                                {Number(item.total || 0).toLocaleString()} FCFA
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                ({item.count})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FILTRES */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                    <div className="grid md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-2">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher (reçu, nom, téléphone, commune...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <select
                            value={filterTaxType}
                            onChange={(e) => setFilterTaxType(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les types</option>
                            <option value="Taxe Commerçante">Taxe Commerçante</option>
                            <option value="Taxe d'Habitation">Taxe d'Habitation</option>
                            <option value="Taxe Foncière">Taxe Foncière</option>
                            <option value="Patente">Patente</option>
                            <option value="Taxe de Séjour">Taxe de Séjour</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="paid">Payé</option>
                            <option value="pending">En attente</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                    </div>

                    {(searchTerm || filterTaxType || filterStatus || filterCommune) && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <FaFilter />
                            <span>{filteredPayments.length} résultat(s)</span>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterTaxType('');
                                    setFilterStatus('');
                                    setFilterCommune('');
                                }}
                                className="text-blue-600 hover:text-blue-800 underline ml-2"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    )}
                </div>

                {/* TABLEAU */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
                            <p className="text-gray-500">Chargement...</p>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FaReceipt className="text-5xl mx-auto mb-3 text-gray-300" />
                            <p>Aucun paiement trouvé</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commune</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contribuable</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-blue-600">
                                                {payment.receipt_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {payment.payment_date
                                                    ? new Date(payment.payment_date).toLocaleDateString('fr-FR')
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {payment.office_name || payment.commune_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-800 font-medium">
                                                    {payment.taxpayer_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {payment.taxpayer_phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {payment.tax_type}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                                                {Number(payment.total_amount || 0).toLocaleString()} FCFA
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                    payment.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-800'
                                                        : payment.payment_status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {payment.payment_status === 'paid' ? '✓ Payé'
                                                        : payment.payment_status === 'pending' ? '⏳ En attente'
                                                        : '✗ Annulé'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Voir le détail"
                                                >
                                                    <FaEye />
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

            {/* MODAL DÉTAIL */}
            {showDetailModal && selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaReceipt /> Détail du paiement
                            </h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-white hover:text-blue-200"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                            {/* N° Reçu */}
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <p className="text-xs text-blue-600 mb-1">N° Reçu</p>
                                <p className="font-mono text-lg font-bold text-blue-800">
                                    {selectedPayment.receipt_number}
                                </p>
                            </div>

                            {/* Commune */}
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Commune</p>
                                <p className="font-medium text-gray-800">
                                    {selectedPayment.office_name || selectedPayment.commune_name || '-'}
                                </p>
                                {selectedPayment.office_province && (
                                    <p className="text-sm text-gray-500">
                                        {selectedPayment.office_province}
                                        {selectedPayment.office_city ? ` - ${selectedPayment.office_city}` : ''}
                                    </p>
                                )}
                            </div>

                            {/* Contribuable */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Contribuable</p>
                                    <p className="font-medium text-gray-800">
                                        {selectedPayment.taxpayer_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                                    <p className="font-medium text-gray-800">
                                        {selectedPayment.taxpayer_phone}
                                    </p>
                                </div>
                            </div>

                            {/* Taxe */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Type de taxe</p>
                                    <p className="font-medium text-gray-800">
                                        {selectedPayment.tax_type}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Période</p>
                                    <p className="font-medium text-gray-800">
                                        {selectedPayment.tax_period || '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Montants */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Montant taxe</span>
                                    <span className="font-medium">
                                        {Number(selectedPayment.amount || 0).toLocaleString()} FCFA
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Frais (1%)</span>
                                    <span className="font-medium text-orange-600">
                                        {Number(selectedPayment.fee || 0).toLocaleString()} FCFA
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-800">Total payé</span>
                                    <span className="font-bold text-blue-700 text-lg">
                                        {Number(selectedPayment.total_amount || 0).toLocaleString()} FCFA
                                    </span>
                                </div>
                            </div>

                            {/* Date et statut */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Date</p>
                                    <p className="text-sm text-gray-700">
                                        {selectedPayment.payment_date
                                            ? new Date(selectedPayment.payment_date).toLocaleString('fr-FR')
                                            : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Statut</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                        selectedPayment.payment_status === 'paid'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {selectedPayment.payment_status === 'paid' ? '✓ Payé' : 'En attente'}
                                    </span>
                                </div>
                            </div>

                            {/* Adresses */}
                            {selectedPayment.taxpayer_address && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Adresse</p>
                                    <p className="text-sm text-gray-700">{selectedPayment.taxpayer_address}</p>
                                </div>
                            )}

                            {selectedPayment.business_number && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">N° Commerce</p>
                                    <p className="text-sm text-gray-700">{selectedPayment.business_number}</p>
                                </div>
                            )}

                            {selectedPayment.notes && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                                    <p className="text-sm text-gray-700">{selectedPayment.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default TaxManagement;