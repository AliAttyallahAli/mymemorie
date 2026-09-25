// src/pages/AdminLoans.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FaHandHoldingUsd, FaUsers, FaMoneyBillWave, FaCheckCircle,
    FaTimes, FaClock, FaSpinner, FaEye, FaFilePdf,
    FaDownload, FaFilter, FaSearch, FaChartLine
} from 'react-icons/fa';

const AdminLoans = ({ user, socket }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({});
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [processAction, setProcessAction] = useState('approve');
    const [processComment, setProcessComment] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending');

    useEffect(() => {
        fetchRequests();
        fetchLoans();
        fetchStats();
    }, [filterStatus]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`/api/admin/loans/requests?status=${filterStatus}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data.data || []);
        } catch (error) {
            console.error('Erreur:', error);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const fetchLoans = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/admin/loans', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoans(response.data.data || []);
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/admin/loans/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.stats || {});
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    // ✅ Traiter une demande
    const handleProcess = async () => {
        if (!selectedRequest) return;
        setSubmitting(true);
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(
                `/api/admin/loans/requests/${selectedRequest.id}/process`,
                { action: processAction, comment: processComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.success) {
                toast.success(processAction === 'approve' ? '✅ Prêt approuvé et décaissé' : '❌ Demande rejetée');
                setShowProcessModal(false);
                setProcessComment('');
                
                // Générer le contrat si approuvé
                if (processAction === 'approve') {
                    generateLoanContract(response.data.data, selectedRequest);
                }
                
                fetchRequests();
                fetchLoans();
                fetchStats();
            }
        } catch (error) {
            console.error('Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Générer le contrat de prêt
    const generateLoanContract = (loanData, request) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            const contractNumber = loanData.contract_number || `LOAN-${Date.now()}`;
            const contractDate = new Date().toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
            
            // En-tête
            doc.setFillColor(10, 47, 108);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('AlkherPay', pageWidth / 2, 18, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Contrat de Prêt', pageWidth / 2, 28, { align: 'center' });
            doc.text(`N° ${contractNumber}`, pageWidth / 2, 35, { align: 'center' });
            
            // Titre
            let y = 55;
            doc.setTextColor(10, 47, 108);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('CONTRAT DE PRÊT', pageWidth / 2, y, { align: 'center' });
            
            y += 8;
            doc.setDrawColor(10, 47, 108);
            doc.setLineWidth(0.5);
            doc.line(60, y, pageWidth - 60, y);
            
            y += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(`Fait le ${contractDate}`, pageWidth - 14, y, { align: 'right' });
            
            // Parties
            y += 15;
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(14, y, pageWidth - 28, 50, 3, 3, 'F');
            
            doc.setTextColor(10, 47, 108);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ENTRE LES SOUSSIGNÉS :', 20, y + 10);
            
            y += 20;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            
            doc.setFont('helvetica', 'bold');
            doc.text('LE PRÊTEUR :', 20, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text('AlkherPay', 25, y);
            y += 5;
            doc.text('Service client: 62 78 73 07', 25, y);
            
            y += 12;
            doc.setFont('helvetica', 'bold');
            doc.text('L\'EMPRUNTEUR :', 20, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${request.fullname || request.user_name}`, 25, y);
            y += 5;
            doc.text(`Téléphone : ${request.phone || request.user_phone}`, 25, y);
            y += 5;
            doc.text(`Email : ${request.email || request.user_email || 'N/A'}`, 25, y);
            
            // Article 1 - Montant
            y += 20;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y);
            y += 10;
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 80, 8, 2, 2, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 1 - MONTANT DU PRÊT', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            autoTable(doc, {
                startY: y,
                head: [['Description', 'Valeur']],
                body: [
                    ['Montant prêté', `${loanData.amount.toLocaleString('fr-FR')} FCFA`],
                    ['Taux d\'intérêt annuel', `${request.interest_rate} %`],
                    ['Durée', `${request.duration_months} mois`],
                    ['Intérêts totaux', `${(loanData.total_amount - loanData.amount).toLocaleString('fr-FR')} FCFA`],
                    ['Montant total à rembourser', `${loanData.total_amount.toLocaleString('fr-FR')} FCFA`],
                    ['Mensualité', `${loanData.monthly_payment.toLocaleString('fr-FR')} FCFA`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [10, 47, 108], textColor: [255, 255, 255] },
                bodyStyles: { fontSize: 10 },
                columnStyles: { 0: { cellWidth: 90, fontStyle: 'bold' } },
                margin: { left: 20, right: 20 }
            });
            
            y = doc.lastAutoTable.finalY + 15;
            
            // Article 2 - Engagements
            if (y > pageHeight - 80) { doc.addPage(); y = 20; }
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 80, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 2 - ENGAGEMENTS', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const engagements = [
                `• L'Emprunteur s'engage à rembourser le montant total de ${loanData.total_amount.toLocaleString('fr-FR')} FCFA.`,
                `• Le remboursement se fera par mensualités de ${loanData.monthly_payment.toLocaleString('fr-FR')} FCFA.`,
                `• Le non-respect des échéances entraînera des pénalités.`,
                `• L'Emprunteur autorise le Prêteur à prélever automatiquement sur son wallet.`
            ];
            
            engagements.forEach(text => {
                const lines = doc.splitTextToSize(text, pageWidth - 40);
                doc.text(lines, 20, y);
                y += lines.length * 5 + 3;
            });
            
            // Article 3 - Remboursement
            y += 10;
            if (y > pageHeight - 80) { doc.addPage(); y = 20; }
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 90, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 3 - MODALITÉS', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const modalites = [
                `• Date de début : ${contractDate}`,
                `• Durée : ${request.duration_months} mois`,
                `• Taux : ${request.interest_rate}% par an`,
                `• Remboursement anticipé possible sans pénalité.`
            ];
            
            modalites.forEach(text => {
                doc.text(text, 20, y);
                y += 6;
            });
            
            // Article 4 - Droit applicable
            y += 10;
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 100, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 4 - DROIT APPLICABLE', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            const droit = `Le présent contrat est régi par les lois en vigueur en République du Tchad. Tout litige sera soumis aux tribunaux compétents de N'Djamena.`;
            const droitLines = doc.splitTextToSize(droit, pageWidth - 40);
            doc.text(droitLines, 20, y);
            
            // Signatures
            y += 30;
            if (y > pageHeight - 80) { doc.addPage(); y = 20; }
            
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y);
            y += 15;
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(10, 47, 108);
            doc.text('SIGNATURES', pageWidth / 2, y, { align: 'center' });
            
            y += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            
            doc.setDrawColor(0, 0, 0);
            doc.line(20, y + 25, 90, y + 25);
            doc.text('Le Prêteur', 20, y + 35);
            doc.text('AlkherPay', 20, y + 42);
            
            doc.line(pageWidth - 90, y + 25, pageWidth - 20, y + 25);
            doc.text('L\'Emprunteur', pageWidth - 90, y + 35);
            doc.text(request.fullname || request.user_name, pageWidth - 90, y + 42);
            
            // Pied de page
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFillColor(245, 245, 245);
                doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `AlkherPay - Contrat ${contractNumber} - Page ${i}/${pageCount}`,
                    pageWidth / 2, pageHeight - 8, { align: 'center' }
                );
            }
            
            doc.save(`contrat_pret_${contractNumber}.pdf`);
            toast.success('📄 Contrat généré !');
            
        } catch (error) {
            console.error('Erreur génération contrat:', error);
            toast.error('Erreur génération contrat');
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

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-700 rounded-2xl p-6 mb-8 shadow-lg">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FaHandHoldingUsd /> Gestion des Prêts
                    </h1>
                    <p className="text-red-200">Administration du système de prêt</p>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500">Demandes en attente</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending_count || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">Prêts actifs</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.active_count || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Total décaissé</p>
                        <p className="text-xl font-bold text-green-600">{formatAmount(stats.total_disbursed || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500">Restant à percevoir</p>
                        <p className="text-xl font-bold text-purple-600">{formatAmount(stats.total_remaining || 0)}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                            activeTab === 'requests' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        <FaClock /> Demandes
                        {stats.pending_count > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs">
                                {stats.pending_count}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                            activeTab === 'loans' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        <FaHandHoldingUsd /> Prêts actifs
                    </button>
                </div>

                {/* Tab: Demandes */}
                {activeTab === 'requests' && (
                    <div>
                        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                            <div className="flex gap-3 flex-wrap">
                                {['pending', 'approved', 'rejected', 'all'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFilterStatus(s)}
                                        className={`px-4 py-2 rounded-lg text-sm ${
                                            filterStatus === s 
                                                ? 'bg-red-600 text-white' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {s === 'pending' ? '⏳ En attente' :
                                         s === 'approved' ? '✅ Approuvées' :
                                         s === 'rejected' ? '❌ Rejetées' : 'Toutes'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <FaSpinner className="animate-spin text-red-500 text-3xl" />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <FaClock className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune demande</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white rounded-xl shadow-md p-4">
                                        <div className="flex justify-between items-start flex-wrap gap-3">
                                            <div className="flex-1">
                                                <p className="font-bold text-lg">{req.user_name || req.fullname}</p>
                                                <p className="text-sm text-gray-500">{req.user_phone || req.phone}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    KYC Niveau {req.kyc_level || 0}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-2">
                                                    📝 {req.reason}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatDate(req.requested_at)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {formatAmount(req.amount)}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {req.duration_months} mois • {req.interest_rate}%/an
                                                </p>
                                                <p className="text-sm text-green-600 font-bold">
                                                    Total: {formatAmount(req.total_amount)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Mensualité: {formatAmount(req.monthly_payment)}
                                                </p>
                                                
                                                {req.status === 'pending' && (
                                                    <div className="flex gap-2 mt-3">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRequest(req);
                                                                setProcessAction('reject');
                                                                setProcessComment('');
                                                                setShowProcessModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm"
                                                        >
                                                            <FaTimes className="inline mr-1" /> Rejeter
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRequest(req);
                                                                setProcessAction('approve');
                                                                setProcessComment('');
                                                                setShowProcessModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm"
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

                {/* Tab: Prêts actifs */}
                {activeTab === 'loans' && (
                    <div className="space-y-3">
                        {loans.map(loan => {
                            const progress = loan.total_amount > 0 
                                ? (loan.amount_paid / loan.total_amount) * 100 
                                : 0;
                            
                            return (
                                <div key={loan.id} className="bg-white rounded-xl shadow-md p-4">
                                    <div className="flex justify-between items-start flex-wrap gap-3">
                                        <div className="flex-1">
                                            <p className="font-bold">{loan.user_name}</p>
                                            <p className="text-sm text-gray-500">{loan.user_phone}</p>
                                            <p className="text-xs font-mono text-gray-400 mt-1">
                                                {loan.contract_number}
                                            </p>
                                            <div className="mt-2">
                                                <div className="w-48 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full bg-green-500"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {progress.toFixed(0)}% remboursé
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-600">{formatAmount(loan.amount)}</p>
                                            <p className="text-sm text-green-600">
                                                Payé: {formatAmount(loan.amount_paid)}
                                            </p>
                                            <p className="text-sm text-red-600">
                                                Reste: {formatAmount(loan.remaining_amount)}
                                            </p>
                                            <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                                                loan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {loan.status === 'active' ? '📊 Actif' : '✅ Terminé'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Traitement */}
            {showProcessModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
                        <div className={`p-4 rounded-t-2xl flex justify-between items-center ${
                            processAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                        } text-white`}>
                            <h3 className="text-xl font-bold">
                                {processAction === 'approve' ? '✅ Approuver' : '❌ Rejeter'} le prêt
                            </h3>
                            <button onClick={() => setShowProcessModal(false)} className="text-white/80">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-black">Emprunteur</span>
                                    <span className="text-black font-medium">{selectedRequest.user_name || selectedRequest.fullname}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Montant</span>
                                    <span className="text-black font-bold">{formatAmount(selectedRequest.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-gray-500">Durée</span>
                                    <span className='text-black'>{selectedRequest.duration_months} mois</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                    <span className="text-gray-800 font-medium">Total à rembourser</span>
                                    <span className="font-bold text-blue-600">
                                        {formatAmount(selectedRequest.total_amount)}
                                    </span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commentaire {processAction === 'reject' && '(requis)'}
                                </label>
                                <textarea
                                    value={processComment}
                                    onChange={(e) => setProcessComment(e.target.value)}
                                    className="text-black w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows="3"
                                    placeholder={processAction === 'approve' ? 'Note (optionnel)' : 'Raison du rejet...'}
                                />
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowProcessModal(false)}
                                    className="flex-1 border border-gray-900 py-2.5 rounded-lg text-orange-600"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleProcess}
                                    disabled={submitting || (processAction === 'reject' && !processComment)}
                                    className={`flex-1 text-white py-2.5 rounded-lg disabled:opacity-50 ${
                                        processAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                >
                                    {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Confirmer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AdminLoans;