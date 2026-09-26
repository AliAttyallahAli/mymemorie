// src/pages/TaxManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    FaArrowLeft, FaHome, FaSpinner, FaReceipt, FaPrint,
    FaSearch, FaFilter, FaCalendarAlt, FaDownload, FaEye,
    FaUser, FaPhone, FaMapMarkerAlt, FaMoneyBillWave,
    FaCheckCircle, FaTimes, FaFileInvoice, FaBuilding,
    FaUsers, FaChartLine, FaWallet, FaClock, FaArrowRight,
    FaCopy, FaShare, FaWhatsapp, FaEnvelope, FaBan
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = '';

const TaxManagement = ({ user }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [communeInfo, setCommuneInfo] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false); // ✅ NOUVEAU
    const [stats, setStats] = useState({
        total: 0,
        total_amount: 0,
        today: 0,
        this_month: 0,
        pending: 0
    });
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [printing, setPrinting] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);

    // ============================================
    // VÉRIFICATION ROLE - AVERTISSEMENT
    // ============================================
    useEffect(() => {
        if (!user) {
            toast.error('Vous devez être connecté');
            navigate('/login');
            return;
        }

        if (user.role !== 'commune' && user.role !== 'admin') {
            setAccessDenied(true);
            toast.error(
                `❌ Accès réservé aux communes (votre rôle: "${user.role || 'inconnu'}")`,
                { duration: 5000, icon: '🚫' }
            );
        }
    }, [user, navigate]);

    // ============================================
    // REDIRECTION AUTO SI ACCÈS REFUSÉ
    // ============================================
    useEffect(() => {
        if (!accessDenied) return;

        const timer = setTimeout(() => {
            navigate('/dashboard');
        }, 8000);

        return () => clearTimeout(timer);
    }, [accessDenied, navigate]);

    // ============================================
    // CHARGEMENT
    // ============================================
    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

            const response = await axios.get(`${API_URL}/api/commune/payments`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📥 Réponse:', response.data);

            const data = response.data.payments || [];
            setPayments(data);
            setFilteredPayments(data);
            setCommuneInfo(response.data.commune || null);

            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            const totalAmount = data.reduce((sum, p) => sum + (p.amount || 0), 0);
            const todayAmount = data
                .filter(p => p.payment_date?.startsWith(today))
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            const monthAmount = data
                .filter(p => p.payment_date?.startsWith(firstDayOfMonth))
                .reduce((sum, p) => sum + (p.amount || 0), 0);

            setStats({
                total: data.length,
                total_amount: totalAmount,
                today: todayAmount,
                this_month: monthAmount,
                pending: data.filter(p => p.payment_status === 'pending').length
            });

        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur lors du chargement des paiements');
            setPayments([]);
            setFilteredPayments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!accessDenied && user) {
            fetchPayments();
        }
    }, [fetchPayments, accessDenied, user]);

    // ============================================
    // FILTRES
    // ============================================
    useEffect(() => {
        let filtered = [...payments];

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.taxpayer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.taxpayer_phone?.includes(searchTerm) ||
                p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.tax_type?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(p => p.payment_status === filterStatus);
        }

        if (startDate) {
            filtered = filtered.filter(p => p.payment_date?.startsWith(startDate));
        }

        setFilteredPayments(filtered);
        setCurrentPage(1);
    }, [searchTerm, filterStatus, startDate, endDate, payments]);

    // ============================================
    // PAGINATION
    // ============================================
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

    // ============================================
    // FORMATAGE DATES
    // ============================================
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // ============================================
    // IMPRESSION HTML
    // ============================================
    const printReceipt = async (payment) => {
        setPrinting(true);
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

            const response = await axios.get(
                `${API_URL}/api/tax/receipt/${payment.receipt_number}/print`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'text'
                }
            );

            const htmlBlob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
            const blobUrl = URL.createObjectURL(htmlBlob);

            let opened = false;

            try {
                const newWindow = window.open(blobUrl, '_blank');
                if (newWindow && !newWindow.closed) {
                    opened = true;
                    toast.success('📄 Reçu ouvert');
                }
            } catch (e) { console.warn('window.open échoué'); }

            if (!opened) {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `recu-${payment.receipt_number}.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('📥 Fichier téléchargé');
            }

            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        } catch (error) {
            console.error('❌ Erreur impression:', error);
            toast.error('Impossible de générer le reçu');
        } finally {
            setPrinting(false);
        }
    };

    // ============================================
    // PDF REÇU INDIVIDUEL
    // ============================================
    const generatePDF = (payment = null) => {
        const data = payment || selectedPayment;
        if (!data) return;

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;

            doc.setFillColor(124, 58, 237);
            doc.rect(0, 0, pageWidth, 42, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('REÇU OFFICIEL', centerX, 20, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('République du Tchad - Paiement d\'impôt', centerX, 30, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`N° Reçu: ${data.receipt_number || 'N/A'}`, centerX, 50, { align: 'center' });
            doc.text(`Date: ${formatDate(data.payment_date)}`, centerX, 56, { align: 'center' });

            doc.setFillColor(22, 163, 74);
            doc.roundedRect(centerX - 20, 60, 40, 8, 2, 2, 'F');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYÉ', centerX, 65.5, { align: 'center' });

            let y = 80;

            doc.setDrawColor(124, 58, 237);
            doc.setLineWidth(0.5);
            doc.line(20, y, pageWidth - 20, y);

            y += 8;
            doc.setFontSize(12);
            doc.setTextColor(124, 58, 237);
            doc.setFont('helvetica', 'bold');
            doc.text('COMMUNE', 20, y);

            y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Nom:', 25, y);
            doc.setTextColor(30, 30, 30);
            doc.setFont('helvetica', 'bold');
            doc.text(data.office_name || data.commune_name || communeInfo?.name || 'N/A', 60, y);

            if (communeInfo?.province) {
                y += 6;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text('Province:', 25, y);
                doc.setTextColor(30, 30, 30);
                doc.text(communeInfo.province, 60, y);
            }

            y += 10;
            doc.setDrawColor(124, 58, 237);
            doc.line(20, y, pageWidth - 20, y);

            y += 8;
            doc.setFontSize(12);
            doc.setTextColor(124, 58, 237);
            doc.setFont('helvetica', 'bold');
            doc.text('CONTRIBUABLE', 20, y);

            y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Nom:', 25, y);
            doc.setTextColor(30, 30, 30);
            doc.setFont('helvetica', 'bold');
            doc.text(data.taxpayer_name || 'N/A', 60, y);

            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Téléphone:', 25, y);
            doc.setTextColor(30, 30, 30);
            doc.text(data.taxpayer_phone || 'N/A', 60, y);

            if (data.taxpayer_address) {
                y += 6;
                doc.setTextColor(80, 80, 80);
                doc.text('Adresse:', 25, y);
                doc.setTextColor(30, 30, 30);
                doc.text(data.taxpayer_address, 60, y);
            }

            y += 10;
            doc.setDrawColor(124, 58, 237);
            doc.line(20, y, pageWidth - 20, y);

            y += 8;
            doc.setFontSize(12);
            doc.setTextColor(124, 58, 237);
            doc.setFont('helvetica', 'bold');
            doc.text('DÉTAILS DU PAIEMENT', 20, y);

            y += 6;

            doc.autoTable({
                startY: y,
                head: [],
                body: [
                    ['Type de taxe', data.tax_type || 'N/A'],
                    ['Période', data.tax_period || 'N/A'],
                    ['Montant', `${Number(data.amount || 0).toLocaleString()} FCFA`],
                    ['Frais (1%)', `${Number(data.fee || 0).toLocaleString()} FCFA`],
                    ['Statut', 'Payé ✅']
                ],
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 3, textColor: [30, 30, 30] },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 60 },
                    1: { cellWidth: 'auto' }
                },
                margin: { left: 20, right: 20 }
            });

            y = doc.lastAutoTable.finalY + 8;

            doc.setFillColor(243, 232, 255);
            doc.roundedRect(20, y, pageWidth - 40, 22, 3, 3, 'F');

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text('TOTAL PAYÉ', 25, y + 9);

            doc.setFontSize(18);
            doc.setTextColor(124, 58, 237);
            doc.setFont('helvetica', 'bold');
            doc.text(
                `${Number(data.total_amount || 0).toLocaleString()} FCFA`,
                pageWidth - 25,
                y + 15,
                { align: 'right' }
            );

            y += 40;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(20, y, pageWidth - 20, y);

            y += 8;
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            doc.text('Ce reçu est généré électroniquement.', centerX, y, { align: 'center' });
            y += 5;
            doc.text('CashPays - Plateforme sécurisée', centerX, y, { align: 'center' });

            const fileName = `recu_taxe_${data.receipt_number || 'paiement'}.pdf`;

            if (payment) {
                const pdfBlob = doc.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                const newWindow = window.open(url, '_blank');
                if (!newWindow) {
                    doc.save(fileName);
                    toast.success('📥 PDF téléchargé');
                } else {
                    toast.success('📄 PDF ouvert');
                }
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } else {
                doc.save(fileName);
                toast.success('📥 PDF téléchargé');
            }

        } catch (error) {
            console.error('❌ Erreur PDF:', error);
            toast.error('Erreur génération PDF');
        }
    };

    // ============================================
    // RAPPORT COMPLET
    // ============================================
    const generateFullReport = () => {
        setGeneratingReport(true);

        try {
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const centerX = pageWidth / 2;

            doc.setFillColor(30, 58, 95);
            doc.rect(0, 0, pageWidth, 35, 'F');

            doc.setFontSize(20);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('RAPPORT DES PAIEMENTS DE TAXES', centerX, 15, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `${communeInfo?.name || 'Commune'}${communeInfo?.province ? ` - ${communeInfo.province}` : ''}`,
                centerX,
                24,
                { align: 'center' }
            );

            doc.setFontSize(9);
            doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, centerX, 31, { align: 'center' });

            let y = 45;

            doc.setFontSize(13);
            doc.setTextColor(30, 58, 95);
            doc.setFont('helvetica', 'bold');
            doc.text('STATISTIQUES', 15, y);

            y += 6;

            const statsCards = [
                { label: 'Total paiements', value: String(stats.total), color: [59, 130, 246] },
                { label: 'Montant total', value: `${stats.total_amount.toLocaleString()} F`, color: [22, 163, 74] },
                { label: "Aujourd'hui", value: `${stats.today.toLocaleString()} F`, color: [234, 88, 12] },
                { label: 'Ce mois', value: `${stats.this_month.toLocaleString()} F`, color: [124, 58, 237] }
            ];

            const cardWidth = (pageWidth - 40) / 4;
            const cardHeight = 20;
            const cardGap = 5;

            statsCards.forEach((card, index) => {
                const x = 15 + (cardWidth + cardGap) * index;

                doc.setFillColor(...card.color);
                doc.roundedRect(x, y, cardWidth - 2, cardHeight, 3, 3, 'F');

                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'normal');
                doc.text(card.label, x + 4, y + 7);

                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text(card.value, x + 4, y + 16);
            });

            y += cardHeight + 10;

            doc.setFontSize(13);
            doc.setTextColor(30, 58, 95);
            doc.setFont('helvetica', 'bold');
            doc.text('DÉTAIL DES PAIEMENTS', 15, y);

            y += 6;

            const tableData = filteredPayments.map((p, index) => [
                index + 1,
                p.receipt_number || 'N/A',
                formatDateShort(p.payment_date),
                p.taxpayer_name || 'N/A',
                p.taxpayer_phone || 'N/A',
                p.tax_type || 'N/A',
                `${Number(p.amount || 0).toLocaleString()} F`,
                `${Number(p.fee || 0).toLocaleString()} F`,
                `${Number(p.total_amount || 0).toLocaleString()} F`,
                p.payment_status === 'paid' || !p.payment_status ? 'Payé' : p.payment_status
            ]);

            const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalFees = filteredPayments.reduce((sum, p) => sum + (p.fee || 0), 0);
            const grandTotal = filteredPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);

            doc.autoTable({
                startY: y,
                head: [[
                    '#', 'N° Reçu', 'Date', 'Contribuable', 'Téléphone',
                    'Type', 'Montant', 'Frais', 'Total', 'Statut'
                ]],
                body: tableData,
                foot: [[
                    '', '', '', '', '', 'TOTAL',
                    `${totalAmount.toLocaleString()} F`,
                    `${totalFees.toLocaleString()} F`,
                    `${grandTotal.toLocaleString()} F`,
                    ''
                ]],
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 58, 95],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                footStyles: {
                    fillColor: [243, 232, 255],
                    textColor: [30, 58, 95],
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: { fontSize: 8, cellPadding: 2 },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 38 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 32 },
                    6: { cellWidth: 28, halign: 'right' },
                    7: { cellWidth: 22, halign: 'right' },
                    8: { cellWidth: 28, halign: 'right' },
                    9: { cellWidth: 20, halign: 'center' }
                },
                margin: { left: 15, right: 15 },
                didDrawPage: () => {
                    const pageCount = doc.internal.getNumberOfPages();
                    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Page ${currentPage} / ${pageCount}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
                    doc.text('CashPays - Rapport confidentiel', 20, pageHeight - 8);
                }
            });

            const communeName = (communeInfo?.name || 'commune').replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`rapport_taxes_${communeName}_${dateStr}.pdf`);

            toast.success('📥 Rapport PDF téléchargé');

        } catch (error) {
            console.error('❌ Erreur rapport:', error);
            toast.error('Erreur génération rapport');
        } finally {
            setGeneratingReport(false);
        }
    };

    // ============================================
    // COPIER REÇU
    // ============================================
    const copyReceipt = async (payment) => {
        const text = `
REÇU DE PAIEMENT DE TAXE
N°: ${payment.receipt_number}
Date: ${formatDate(payment.payment_date)}

Contribuable: ${payment.taxpayer_name}
Téléphone: ${payment.taxpayer_phone}
Adresse: ${payment.taxpayer_address || 'N/A'}

Type: ${payment.tax_type}
Période: ${payment.tax_period || 'N/A'}
Montant: ${(payment.amount || 0).toLocaleString()} FCFA
Frais: ${(payment.fee || 0).toLocaleString()} FCFA
Total: ${(payment.total_amount || 0).toLocaleString()} FCFA

CashPays - Paiement sécurisé
    `;

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
            toast.success('✅ Reçu copié');
        } catch (error) {
            toast.error('Impossible de copier');
        }
    };

    // ============================================
    // PARTAGER WHATSAPP
    // ============================================
    const shareWhatsApp = (payment) => {
        const message = `
🏛️ REÇU DE PAIEMENT DE TAXE
N°: ${payment.receipt_number}
Contribuable: ${payment.taxpayer_name}
Montant: ${(payment.amount || 0).toLocaleString()} FCFA
Type: ${payment.tax_type}
Date: ${formatDateShort(payment.payment_date)}

CashPays - Paiement sécurisé
    `;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleGoBack = () => navigate(-1);
    const handleGoHome = () => navigate('/');

    // ============================================
    // ✅ ÉCRAN D'ACCÈS REFUSÉ
    // ============================================
    if (accessDenied) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center">

                    {/* Icône */}
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <FaBan className="text-red-600 text-5xl" />
                    </div>

                    {/* Titre */}
                    <h1 className="text-3xl font-bold text-gray-800 mb-3">
                        Accès refusé
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-2">
                        Cette page est réservée aux <strong className="text-red-600">communes</strong>.
                    </p>

                    {/* Rôle actuel */}
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-red-800">
                            <strong>Votre rôle actuel :</strong>{' '}
                            <span className="font-mono bg-red-200 text-red-900 px-2 py-0.5 rounded">
                                {user?.role || 'inconnu'}
                            </span>
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                            Seuls les utilisateurs avec le rôle <strong>"commune"</strong> peuvent accéder.
                        </p>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-xs text-blue-800 mb-2">
                            <strong>💡 Que faire ?</strong>
                        </p>
                        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                            <li>Si vous êtes un <strong>administrateur</strong>, créez une commune pour obtenir un accès</li>
                            <li>Si vous pensez qu'il s'agit d'une erreur, contactez le support</li>
                            <li>Sinon, retournez à votre tableau de bord</li>
                        </ul>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                        >
                            🏠 Tableau de bord
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                        >
                            ← Retour accueil
                        </button>
                    </div>

                    {/* Compte à rebours */}
                    <p className="text-xs text-gray-400 mt-4">
                        Redirection automatique dans 8 secondes...
                    </p>
                </div>
            </div>
        );
    }

    // ============================================
    // CHARGEMENT
    // ============================================
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-5xl text-yellow-500 mx-auto mb-4" />
                    <p className="text-gray-500">Chargement des paiements...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-900/70">
            <div className="container mx-auto px-4 py-6 max-w-7xl">

                {/* Header navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGoBack}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <FaArrowLeft className="text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">Retour</span>
                        </button>

                        <button
                            onClick={handleGoHome}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                            <FaHome />
                            <span className="text-sm font-medium">Accueil</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 hidden sm:inline">
                            {new Date().toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </span>
                        <div className="bg-white rounded-xl px-4 py-2 shadow-md">
                            <p className="text-xs text-gray-400">Total collecté</p>
                            <p className="font-bold text-yellow-600">
                                {stats.total_amount.toLocaleString()} FCFA
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banner */}
                <div className="relative bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 mb-8 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>

                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                🏛️ {communeInfo?.name || 'Gestion des Taxes'}
                            </h1>
                            <p className="text-blue-200 text-sm">
                                {communeInfo?.province
                                    ? `${communeInfo.province}${communeInfo.city ? ` - ${communeInfo.city}` : ''}`
                                    : 'Suivez tous les paiements de taxes effectués'}
                            </p>
                            {communeInfo?.phone && (
                                <p className="text-blue-300 text-xs mt-1">📞 {communeInfo.phone}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={generateFullReport}
                                disabled={generatingReport || filteredPayments.length === 0}
                                className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {generatingReport ? (
                                    <><FaSpinner className="animate-spin" /> Génération...</>
                                ) : (
                                    <><FaDownload /> Rapport complet</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <p className="text-xs text-gray-400">Total paiements</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <p className="text-xs text-gray-400">Montant total</p>
                        <p className="text-2xl font-bold text-green-600">
                            {stats.total_amount.toLocaleString()} FCFA
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <p className="text-xs text-gray-400">Aujourd'hui</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {stats.today.toLocaleString()} FCFA
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <p className="text-xs text-gray-400">Ce mois</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {stats.this_month.toLocaleString()} FCFA
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                        <p className="text-xs text-gray-400">En attente</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-blue-950/90 rounded-xl shadow-md p-4 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, téléphone, reçu..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 bg-blue-900 text-white"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="paid">Payé</option>
                            <option value="pending">En attente</option>
                            <option value="cancelled">Annulé</option>
                        </select>

                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 bg-blue-900 text-white"
                        />

                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterStatus('all');
                                setStartDate('');
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                        >
                            Réinitialiser
                        </button>

                        <button
                            onClick={generateFullReport}
                            disabled={generatingReport || filteredPayments.length === 0}
                            className="ml-auto px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {generatingReport ? (
                                <><FaSpinner className="animate-spin" /> Génération...</>
                            ) : (
                                <><FaDownload /> Exporter PDF</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Liste paiements */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b flex flex-wrap justify-between items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FaReceipt className="text-yellow-500" /> Liste des paiements
                            <span className="text-sm text-black font-normal">
                                ({filteredPayments.length} paiements)
                            </span>
                        </h2>
                    </div>

                    {filteredPayments.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <FaReceipt className="w-16 h-16 mx-auto text-black mb-4" />
                            <p className="font-medium">Aucun paiement trouvé</p>
                            <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reçu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contribuable</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentItems.map((payment, index) => (
                                        <tr key={payment.id || index} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                    {payment.receipt_number?.slice(0, 12)}...
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-800">{payment.taxpayer_name}</p>
                                                <p className="text-xs text-gray-500">{payment.taxpayer_phone}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-black">{payment.tax_type || 'N/A'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-gray-800">
                                                    {payment.amount?.toLocaleString() || 0} FCFA
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {formatDateShort(payment.payment_date)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    payment.payment_status === 'paid' || !payment.payment_status
                                                        ? 'bg-green-100 text-green-700'
                                                        : payment.payment_status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {payment.payment_status === 'paid' || !payment.payment_status
                                                        ? '✅ Payé'
                                                        : payment.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition text-sm"
                                                        title="Voir détails"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={() => generatePDF(payment)}
                                                        className="text-yellow-600 hover:text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg hover:bg-yellow-100 transition text-sm"
                                                        title="Télécharger PDF"
                                                    >
                                                        <FaPrint />
                                                    </button>
                                                    <button
                                                        onClick={() => copyReceipt(payment)}
                                                        className="text-gray-600 hover:text-gray-700 bg-gray-50 px-2 py-1 rounded-lg hover:bg-gray-100 transition text-sm"
                                                        title="Copier"
                                                    >
                                                        <FaCopy />
                                                    </button>
                                                    <button
                                                        onClick={() => shareWhatsApp(payment)}
                                                        className="text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100 transition text-sm"
                                                        title="Partager WhatsApp"
                                                    >
                                                        <FaWhatsapp />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 font-bold text-right">Total:</td>
                                        <td className="px-4 py-3 font-bold text-green-600 text-right">
                                            {currentItems.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()} FCFA
                                        </td>
                                        <td colSpan="3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredPayments.length > itemsPerPage && (
                        <div className="bg-gray-50 px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-gray-500">
                                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredPayments.length)} sur {filteredPayments.length}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Précédent
                                </button>
                                <span className="px-3 py-1 bg-yellow-500 text-white rounded-lg">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Suivant
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Détails */}
            {showDetailModal && selectedPayment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-blue-950/60 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaReceipt /> Détail du paiement
                            </h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-2">✅</div>
                                <p className="text-2xl font-bold text-green-600">
                                    {selectedPayment.amount?.toLocaleString() || 0} FCFA
                                </p>
                                <p className="text-sm text-gray-500 font-mono">
                                    Reçu: {selectedPayment.receipt_number}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Contribuable</p>
                                    <p className="text-black font-semibold">{selectedPayment.taxpayer_name}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Téléphone</p>
                                    <p className="text-black font-semibold">{selectedPayment.taxpayer_phone}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Type de taxe</p>
                                    <p className="text-black font-semibold">{selectedPayment.tax_type}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Période</p>
                                    <p className="text-black font-semibold">{selectedPayment.tax_period || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Montant</p>
                                    <p className="text-black font-semibold">{selectedPayment.amount?.toLocaleString()} FCFA</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-black">Frais</p>
                                    <p className="text-black font-semibold">{selectedPayment.fee?.toLocaleString()} FCFA</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                                    <p className="text-xs text-black">Total payé</p>
                                    <p className="font-bold text-green-600 text-lg">
                                        {selectedPayment.total_amount?.toLocaleString()} FCFA
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                                    <p className="text-xs text-black">Date</p>
                                    <p className="text-black font-semibold">{formatDate(selectedPayment.payment_date)}</p>
                                </div>
                                {selectedPayment.taxpayer_address && (
                                    <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                                        <p className="text-xs text-black">Adresse</p>
                                        <p className="text-black font-semibold">{selectedPayment.taxpayer_address}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    onClick={() => generatePDF(selectedPayment)}
                                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2.5 rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    <FaPrint /> Télécharger PDF
                                </button>
                                <button
                                    onClick={() => printReceipt(selectedPayment)}
                                    disabled={printing}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {printing ? (
                                        <><FaSpinner className="animate-spin" /> Génération...</>
                                    ) : (
                                        <><FaPrint /> Impression</>
                                    )}
                                </button>
                                <button
                                    onClick={() => copyReceipt(selectedPayment)}
                                    className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-300 transition flex items-center justify-center gap-2"
                                >
                                    <FaCopy /> Copier
                                </button>
                                <button
                                    onClick={() => shareWhatsApp(selectedPayment)}
                                    className="flex-1 bg-green-500 text-white py-2.5 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                                >
                                    <FaWhatsapp /> Partager
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxManagement;