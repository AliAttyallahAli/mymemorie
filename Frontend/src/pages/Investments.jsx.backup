// src/pages/Investments.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
    FaChartLine, FaBuilding, FaUsers, FaMoneyBillWave, FaPlus,
    FaEye, FaCheckCircle, FaTimes, FaClock, FaUser, FaPhone,
    FaMapMarkerAlt, FaEnvelope, FaCalendarAlt, FaDollarSign,
    FaShare, FaRocket, FaShieldAlt, FaArrowLeft, FaWallet,
    FaHistory, FaStar, FaUserPlus, FaBriefcase, FaHandshake,
    FaPercent, FaAward, FaTrophy, FaMedal, FaCertificate,
    FaFileInvoice, FaIdCard, FaSearch, FaFilter, FaSpinner,
    FaGlobe, FaCrown, FaArrowRight, FaInfoCircle, FaChartBar,
    FaBullhorn, FaGift, FaThumbsUp, FaEdit, FaTrash, FaBell,
    FaCopy, FaQrcode, FaLink, FaDownload, FaExternalLinkAlt,
    FaFileContract, FaFilePdf, FaSignature
} from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import KYCStatus from '../components/KYCStatus';

const Investments = ({ user, socket }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('discover');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [myInvestments, setMyInvestments] = useState([]);
    const [myCompany, setMyCompany] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [showCompanyDetail, setShowCompanyDetail] = useState(false);
    const [showCreateCompany, setShowCreateCompany] = useState(false);
    const [showInvestModal, setShowInvestModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showEditCompany, setShowEditCompany] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showInvestmentDetail, setShowInvestmentDetail] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [investAmount, setInvestAmount] = useState('');
    const [shares, setShares] = useState(1);
    const [kycStatus, setKycStatus] = useState({ status: 'none', has_kyc: false, level: 0 });
    const [userBalance, setUserBalance] = useState(0);
    const [investorsCount, setInvestorsCount] = useState(0);
    const [showKYCModal, setShowKYCModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [statistics, setStatistics] = useState({
        totalInvested: 0,
        totalReturns: 0,
        activeInvestments: 0,
        roi: 0
    });
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [companyForm, setCompanyForm] = useState({
        name: '',
        fullName: '',
        description: '',
        sector: '',
        location: '',
        website: '',
        email: '',
        phone: '',
        fundingGoal: '',
        equityOffered: '',
        sharesOffered: '',
        sharePrice: '',
        pitch: '',
        team: '',
        achievements: ''
    });
    const [editForm, setEditForm] = useState({
        name: '',
        fullName: '',
        description: '',
        sector: '',
        location: '',
        website: '',
        email: '',
        phone: '',
        pitch: '',
        team: '',
        achievements: ''
    });

    useEffect(() => {
        if (user) {
            checkKYCStatus();
            fetchUserBalance();
            fetchCompanies();
            fetchMyInvestments();
            fetchMyCompany();
            fetchInvestorsCount();
            fetchStatistics();
        }
    }, [user]);

    // ============================================
    // VÉRIFICATION KYC
    // ============================================
    const checkKYCStatus = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data) {
                setKycStatus(response.data);
                console.log('✅ KYC Status:', response.data);
            } else {
                setKycStatus({ 
                    status: 'none', 
                    has_kyc: false, 
                    level: 0,
                    is_verified: false 
                });
            }
        } catch (error) {
            console.error('❌ Erreur KYC:', error);
            setKycStatus({ 
                status: 'error', 
                has_kyc: false, 
                level: 0,
                is_verified: false,
                message: 'Erreur de chargement'
            });
        }
    };

    const checkKYCBeforeCreate = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const status = response.data.status;
            const level = response.data.level || 0;
            
            if (status === 'verified' && level >= 1) {
                setShowCreateCompany(true);
                return true;
            }
            
            if (status === 'pending') {
                toast.error('⏳ Votre demande KYC est en attente de vérification.', { duration: 5000 });
                return false;
            }
            
            if (status === 'rejected') {
                toast.error('❌ Votre demande KYC a été rejetée.', { duration: 5000 });
                setShowKYCModal(true);
                return false;
            }
            
            if (status === 'none' || level < 1) {
                toast.error(`⚠️ Niveau KYC ${level} - Niveau 1 requis pour créer une entreprise.`, { duration: 5000 });
                setShowKYCModal(true);
                return false;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erreur vérification KYC:', error);
            toast.error('Erreur lors de la vérification KYC.');
            return false;
        }
    };

    const handleKYCUpgrade = () => {
        const currentLevel = kycStatus.level || 0;
        
        if (currentLevel === 1) {
            toast('📝 Soumettez les documents pour passer au niveau 2', {
                duration: 3000,
                icon: '📝'
            });
            navigate('/kyc-level-2');
        } else if (currentLevel === 2) {
            toast('📝 Soumettez les documents pour passer au niveau 3', {
                duration: 3000,
                icon: '👑'
            });
            navigate('/kyc-level-3');
        } else {
            toast('📝 Complétez votre profil KYC', {
                duration: 3000,
                icon: '📝'
            });
            navigate('/kyc');
        }
    };

    // ============================================
    // RÉCUPÉRATION DES DONNÉES
    // ============================================
    const fetchUserBalance = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserBalance(response.data.balance || 0);
        } catch (error) {
            console.error('Erreur solde:', error);
            setUserBalance(0);
        }
    };

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data || response.data || [];
            setCompanies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
            setCompanies([]);
            if (error.response?.status === 404) {
                setCompanies(getMockCompanies());
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchMyInvestments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/my-investments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data || response.data || [];
            setMyInvestments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement investissements:', error);
            setMyInvestments([]);
        }
    };

    const fetchMyCompany = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/my-company', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.data || response.data;
            setMyCompany(data || null);
            
            if (data && data.id) {
                const shareUrl = `${window.location.origin}/investment/${data.id}`;
                setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`);
            }
        } catch (error) {
            console.error('Erreur chargement entreprise:', error);
            setMyCompany(null);
        }
    };

    const fetchInvestorsCount = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/investors-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvestorsCount(response.data.count || 0);
        } catch (error) {
            console.error('Erreur récupération investisseurs:', error);
            setInvestorsCount(0);
        }
    };

    const fetchStatistics = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/investment/statistics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setStatistics(response.data);
            }
        } catch (error) {
            console.error('Erreur statistiques:', error);
            setStatistics({
                totalInvested: 0,
                totalReturns: 0,
                activeInvestments: 0,
                roi: 0
            });
        }
    };

    // ============================================
    // CRÉATION D'ENTREPRISE
    // ============================================
    const handleCreateCompany = async (e) => {
        e.preventDefault();

        const isKycVerified = kycStatus?.status === 'verified' && (kycStatus?.level || 0) >= 1;
        
        if (!isKycVerified) {
            toast.error('❌ Niveau KYC 1 requis pour créer une entreprise.');
            setShowKYCModal(true);
            return;
        }

        // Validation
        if (!companyForm.name || !companyForm.description || !companyForm.fundingGoal) {
            toast.error('Nom, description et objectif sont requis');
            return;
        }

        const fundingGoal = parseFloat(companyForm.fundingGoal);
        if (fundingGoal < 100000) {
            toast.error('L\'objectif minimum est de 100 000 FCFA');
            return;
        }

        const sharesOffered = parseInt(companyForm.sharesOffered) || 1000;
        const sharePrice = parseFloat(companyForm.sharePrice) || 1000;

        if (sharesOffered < 1) {
            toast.error('Le nombre d\'actions doit être supérieur à 0');
            return;
        }

        if (sharePrice < 100) {
            toast.error('Le prix par action minimum est de 100 FCFA');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            
            const payload = {
                name: companyForm.name.trim(),
                fullName: companyForm.fullName?.trim() || companyForm.name.trim(),
                description: companyForm.description.trim(),
                sector: companyForm.sector || 'Autre',
                location: companyForm.location?.trim() || '',
                website: companyForm.website?.trim() || '',
                email: companyForm.email?.trim() || '',
                phone: companyForm.phone?.trim() || '',
                fundingGoal: fundingGoal,
                equityOffered: parseFloat(companyForm.equityOffered) || 0,
                sharesOffered: sharesOffered,
                sharePrice: sharePrice,
                pitch: companyForm.pitch?.trim() || '',
                team: companyForm.team?.trim() || '',
                achievements: companyForm.achievements?.trim() || ''
            };

            console.log('📝 Création entreprise:', payload);

            const response = await axios.post('/api/investment/company', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('✅ Entreprise créée avec succès !');
                setShowCreateCompany(false);
                setCompanyForm({
                    name: '', fullName: '', description: '', sector: '',
                    location: '', website: '', email: '', phone: '',
                    fundingGoal: '', equityOffered: '', sharesOffered: '',
                    sharePrice: '', pitch: '', team: '', achievements: ''
                });
                fetchCompanies();
                fetchMyCompany();
                fetchStatistics();
            } else {
                toast.error(response.data.error || 'Erreur lors de la création');
            }
        } catch (error) {
            console.error('❌ Erreur création:', error);
            if (error.response?.data?.code === 'KYC_REQUIRED' || error.response?.data?.code === 'KYC_LEVEL_INSUFFICIENT') {
                toast.error(error.response?.data?.error || 'Vérification KYC requise');
                setShowKYCModal(true);
            } else {
                toast.error(error.response?.data?.error || 'Erreur lors de la création');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // MODIFICATION D'ENTREPRISE
    // ============================================
    const handleOpenEdit = () => {
        if (!myCompany) return;
        
        setEditForm({
            name: myCompany.name || '',
            fullName: myCompany.fullName || '',
            description: myCompany.description || '',
            sector: myCompany.sector || '',
            location: myCompany.location || '',
            website: myCompany.website || '',
            email: myCompany.email || '',
            phone: myCompany.phone || '',
            pitch: myCompany.pitch || '',
            team: myCompany.team || '',
            achievements: myCompany.achievements || ''
        });
        setShowEditCompany(true);
    };

    const handleUpdateCompany = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.put('/api/investment/company', editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('✅ Entreprise mise à jour !');
                setShowEditCompany(false);
                fetchMyCompany();
                fetchCompanies();
            } else {
                toast.error(response.data.error || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // SUPPRESSION D'ENTREPRISE
    // ============================================
    const handleDeleteCompany = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.delete('/api/investment/company', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Entreprise supprimée avec succès');
                setShowDeleteConfirm(false);
                setMyCompany(null);
                fetchCompanies();
                fetchStatistics();
            }
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
        }
    };

    // ============================================
    // INVESTISSEMENT
    // ============================================
    const handleInvest = async () => {
        if (!selectedCompany) {
            toast.error('Aucune entreprise sélectionnée');
            return;
        }

        const amount = parseFloat(investAmount);
        const sharesCount = parseInt(shares);

        if (!amount || amount < (selectedCompany.share_price || 1000)) {
            toast.error(`Montant minimum: ${(selectedCompany.share_price || 1000).toLocaleString()} FCFA`);
            return;
        }

        if (amount > userBalance) {
            toast.error('Solde insuffisant');
            return;
        }

        if (sharesCount < 1) {
            toast.error('Veuillez choisir au moins 1 action');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('/api/investment/invest', {
                company_id: selectedCompany.id,
                amount: amount,
                shares: sharesCount
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success(`✅ Investissement de ${amount.toLocaleString()} FCFA réussi !`);
                
                const investmentData = response.data.data || {
                    id: response.data.investment_id,
                    amount: amount,
                    shares: sharesCount,
                    share_price: selectedCompany.share_price,
                    total_amount: amount
                };
                
                await generateInvestmentContract(investmentData, selectedCompany);
                
                setShowInvestModal(false);
                setInvestAmount('');
                setShares(1);
                fetchUserBalance();
                fetchMyInvestments();
                fetchCompanies();
                fetchInvestorsCount();
                fetchStatistics();
            } else {
                toast.error(response.data.error || 'Erreur lors de l\'investissement');
            }
        } catch (error) {
            console.error('Erreur investissement:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de l\'investissement');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // CONTRAT D'INVESTISSEMENT PDF
    // ============================================
    const generateInvestmentContract = async (investment, company) => {
        try {
            toast.success('📄 Génération du contrat en cours...');
            
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            const contractNumber = `CONTRAT-INV-${investment.id || Date.now()}`;
            const contractDate = new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
            // EN-TÊTE
            doc.setFillColor(10, 47, 108);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('AlkherPay', pageWidth / 2, 18, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Plateforme d\'investissement - GOUROUSDJA', pageWidth / 2, 28, { align: 'center' });
            doc.text(`N° Contrat: ${contractNumber}`, pageWidth / 2, 35, { align: 'center' });
            
            // TITRE
            let y = 55;
            doc.setTextColor(10, 47, 108);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('CONTRAT D\'INVESTISSEMENT', pageWidth / 2, y, { align: 'center' });
            
            y += 8;
            doc.setDrawColor(10, 47, 108);
            doc.setLineWidth(0.5);
            doc.line(60, y, pageWidth - 60, y);
            
            y += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(`Fait le ${contractDate}`, pageWidth - 14, y, { align: 'right' });
            
            // PARTIES
            y += 15;
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(14, y, pageWidth - 28, 45, 3, 3, 'F');
            
            doc.setTextColor(10, 47, 108);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ENTRE LES SOUSSIGNÉS :', 20, y + 10);
            
            y += 20;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            
            doc.setFont('helvetica', 'bold');
            doc.text('L\'INVESTISSEUR :', 20, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${user?.fullname || 'N/A'}`, 25, y);
            y += 5;
            doc.text(`Téléphone : ${user?.phone || 'N/A'}`, 25, y);
            y += 5;
            doc.text(`Email : ${user?.email || 'N/A'}`, 25, y);
            
            y += 12;
            doc.setFont('helvetica', 'bold');
            doc.text('L\'ENTREPRISE :', 20, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${company?.name || 'N/A'}`, 25, y);
            y += 5;
            doc.text(`Secteur : ${company?.sector || 'N/A'}`, 25, y);
            y += 5;
            doc.text(`Localisation : ${company?.location || 'N/A'}`, 25, y);
            y += 5;
            doc.text(`Téléphone : ${company?.phone || 'N/A'}`, 25, y);
            
            // ARTICLE 1
            y += 20;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y, pageWidth - 14, y);
            y += 10;
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 70, 8, 2, 2, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 1 - OBJET', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            const objetText = `Le présent contrat a pour objet de définir les modalités de l'investissement réalisé par l'Investisseur dans l'entreprise ${company?.name || 'N/A'}, dans le cadre de la plateforme AlkherPay.`;
            const objetLines = doc.splitTextToSize(objetText, pageWidth - 40);
            doc.text(objetLines, 20, y);
            y += objetLines.length * 5 + 8;
            
            // ARTICLE 2 - MONTANT
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 80, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 2 - MONTANT INVESTI', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            autoTable(doc, {
                startY: y,
                head: [['Description', 'Valeur']],
                body: [
                    ['Montant investi', `${(investment.amount || 0).toLocaleString('fr-FR')} FCFA`],
                    ['Nombre d\'actions', `${investment.shares || 0} actions`],
                    ['Prix par action', `${(investment.share_price || company?.share_price || 1000).toLocaleString('fr-FR')} FCFA`],
                    ['Montant total', `${(investment.total_amount || investment.amount || 0).toLocaleString('fr-FR')} FCFA`]
                ],
                theme: 'grid',
                headStyles: { 
                    fillColor: [10, 47, 108], 
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'left'
                },
                bodyStyles: { fontSize: 10 },
                columnStyles: {
                    0: { cellWidth: 80, fontStyle: 'bold' },
                    1: { cellWidth: 'auto', halign: 'right' }
                },
                margin: { left: 20, right: 20 }
            });
            
            y = doc.lastAutoTable.finalY + 15;
            
            // ARTICLE 3 - DROITS
            if (y > pageHeight - 80) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 70, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 3 - DROITS', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            const droitsText = [
                `• L'Investisseur détient ${investment.shares || 0} actions de l'entreprise ${company?.name || 'N/A'}.`,
                `• Ces actions lui confèrent un droit de propriété proportionnel à sa participation.`,
                `• L'Investisseur bénéficiera des dividendes et des bénéfices selon les statuts de l'entreprise.`,
                `• L'Investisseur dispose d'un droit de vote proportionnel à ses actions lors des assemblées.`
            ];
            
            droitsText.forEach((text) => {
                const lines = doc.splitTextToSize(text, pageWidth - 40);
                doc.text(lines, 20, y);
                y += lines.length * 5 + 3;
            });
            
            // ARTICLE 4 - ENGAGEMENTS
            y += 8;
            if (y > pageHeight - 80) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 90, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 4 - ENGAGEMENTS', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const engagementsText = [
                `• L'Entreprise s'engage à utiliser les fonds conformément à son plan d'affaires.`,
                `• L'Entreprise informera l'Investisseur de toute évolution significative.`,
                `• L'Investisseur s'engage à ne pas retirer son investissement avant la période convenue.`
            ];
            
            engagementsText.forEach((text) => {
                const lines = doc.splitTextToSize(text, pageWidth - 40);
                doc.text(lines, 20, y);
                y += lines.length * 5 + 3;
            });
            
            // ARTICLE 5 - DURÉE
            y += 8;
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 70, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 5 - DURÉE', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const dureeText = `Le présent contrat prend effet à la date de signature et demeure valable jusqu'à la cession des actions ou la dissolution de l'entreprise.`;
            const dureeLines = doc.splitTextToSize(dureeText, pageWidth - 40);
            doc.text(dureeLines, 20, y);
            y += dureeLines.length * 5 + 10;
            
            // ARTICLE 6 - DROIT APPLICABLE
            if (y > pageHeight - 80) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFillColor(10, 47, 108);
            doc.setTextColor(255, 255, 255);
            doc.roundedRect(14, y - 5, 100, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('ARTICLE 6 - DROIT APPLICABLE', 18, y);
            
            y += 12;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const droitText = `Le présent contrat est régi par les lois en vigueur en République du Tchad. Tout litige sera soumis aux tribunaux compétents de N'Djamena.`;
            const droitLines = doc.splitTextToSize(droitText, pageWidth - 40);
            doc.text(droitLines, 20, y);
            y += droitLines.length * 5 + 15;
            
            // SIGNATURES
            if (y > pageHeight - 80) {
                doc.addPage();
                y = 20;
            }
            
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
            doc.text('L\'Investisseur', 20, y + 35);
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(user?.fullname || 'N/A', 20, y + 42);
            doc.text(`Le ${contractDate}`, 20, y + 48);
            
            doc.setDrawColor(0, 0, 0);
            doc.line(pageWidth - 90, y + 25, pageWidth - 20, y + 25);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('L\'Entreprise', pageWidth - 90, y + 35);
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(company?.name || 'N/A', pageWidth - 90, y + 42);
            doc.text(`Le ${contractDate}`, pageWidth - 90, y + 48);
            
            // PIED DE PAGE
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFillColor(245, 245, 245);
                doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `AlkherPay - Contrat d'investissement N°${contractNumber} - Page ${i}/${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' }
                );
            }
            
            doc.save(`contrat_investissement_${contractNumber}.pdf`);
            toast.success('✅ Contrat généré et téléchargé !');
            
        } catch (error) {
            console.error('❌ Erreur génération contrat:', error);
            toast.error('Erreur lors de la génération du contrat');
        }
    };

    // ============================================
    // PARTAGE
    // ============================================
    const shareCompany = (platform = 'copy') => {
        const company = selectedCompany || myCompany;
        if (!company) {
            toast.error('Aucune entreprise à partager');
            return;
        }

        const shareUrl = `${window.location.origin}/investment/${company.id}`;
        const message = `🚀 Découvrez "${company.name}" sur AlkherPay ! Investissez dès maintenant : ${shareUrl}`;
        
        switch(platform) {
            case 'copy':
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('🔗 Lien copié !');
                }
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                break;
            case 'email':
                window.open(`mailto:?subject=${encodeURIComponent('Découvrez ' + company.name)}&body=${encodeURIComponent(message)}`, '_blank');
                break;
            default:
                break;
        }
    };

    // ============================================
    // DÉTAILS
    // ============================================
    const handleViewCompanyDetail = (company) => {
        setSelectedCompany(company);
        setShowCompanyDetail(true);
    };

    const handleViewInvestmentDetail = (investment) => {
        setSelectedInvestment(investment);
        setShowInvestmentDetail(true);
    };

    const goToMyCompany = () => {
        if (!myCompany) {
            toast.error('Vous n\'avez pas encore d\'entreprise');
            return;
        }
        navigate('/my-company');
    };

    // ============================================
    // DONNÉES MOCK
    // ============================================
    const getMockCompanies = () => {
        return [
            {
                id: 1,
                name: 'Tech Innovation SA',
                fullName: 'Tech Innovation SA',
                sector: 'Technologie',
                description: 'Startup innovante dans le domaine de l\'IA et du machine learning.',
                funding_goal: 5000000,
                collected_amount: 3200000,
                share_price: 1000,
                shares_available: 5000,
                investors_count: 45,
                location: 'N\'Djamena, Tchad',
                website: 'https://techinnovation.td',
                email: 'contact@techinnovation.td',
                phone: '6622334455',
                color: '#4F46E5',
                is_active: true,
                created_at: new Date().toISOString(),
                user: { fullname: 'Ali Mahamat', phone: '6622334455' },
                pitch: 'Nous révolutionnons l\'accès à la technologie en Afrique centrale.',
                team: 'Une équipe de 12 experts en IA et développement.'
            }
        ];
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatAmount = (amount) => {
        if (!amount && amount !== 0) return '0 FCFA';
        return amount.toLocaleString() + ' FCFA';
    };

    const getProgressColor = (collected, goal) => {
        if (!collected || !goal) return 'bg-gray-200';
        const percentage = (collected / goal) * 100;
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 60) return 'bg-blue-500';
        if (percentage >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStatusBadge = (company) => {
        const progress = (company.collected_amount / company.funding_goal) * 100;
        if (progress >= 100) return { label: '✅ Financée', color: 'bg-green-100 text-green-700' };
        if (progress >= 50) return { label: '📈 En cours', color: 'bg-blue-100 text-blue-700' };
        return { label: '🔄 Nouvelle', color: 'bg-yellow-100 text-yellow-700' };
    };

    const filteredCompanies = companies
        .filter(company => {
            const matchSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               company.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchSector = filterSector === 'all' || company.sector === filterSector;
            return matchSearch && matchSector;
        })
        .sort((a, b) => {
            switch(sortBy) {
                case 'recent':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'progress':
                    return (b.collected_amount / b.funding_goal) - (a.collected_amount / a.funding_goal);
                case 'goal':
                    return b.funding_goal - a.funding_goal;
                default:
                    return 0;
            }
        });

    const sectors = ['all', ...new Set(companies.map(c => c.sector).filter(Boolean))];

    const goToKYC = () => navigate('/kyc');

    if (!user) {
        navigate('/login');
        return null;
    }

    const canCreateCompany = kycStatus?.status === 'verified' && (kycStatus?.level || 0) >= 1;

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8">
                {/* Bouton de retour */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
                >
                    <FaArrowLeft className="text-lg" />
                    <span>Retour au tableau de bord</span>
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-r from-green-800 via-green-700 to-teal-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">📈 Investissements</h1>
                            <p className="text-green-200">Investissez dans des entreprises innovantes</p>
                            <div className="flex gap-4 mt-3 text-sm text-green-200 flex-wrap">
                                <span>🏢 {companies.length} entreprises</span>
                                <span>👥 {investorsCount} investisseurs</span>
                                {myCompany && <span>⭐ Mon entreprise active</span>}
                            </div>
                        </div>
                        <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                            <p className="text-green-200 text-xs">Votre solde</p>
                            <p className="text-white font-bold text-xl">{formatAmount(userBalance)}</p>
                        </div>
                    </div>
                </div>

                {/* KYC Status */}
                <div className="mb-6">
                    <KYCStatus 
                        status={kycStatus.status}
                        level={kycStatus.level}
                        onVerify={goToKYC}
                        onUpgrade={handleKYCUpgrade}
                        message={kycStatus.rejection_reason || kycStatus.message}
                        showUpgrade={kycStatus.status === 'verified'}
                    />
                </div>

                {/* Statistiques */}
                {myInvestments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Total investi</p>
                            <p className="text-xl font-bold text-blue-600">{formatAmount(statistics.totalInvested)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Retours</p>
                            <p className="text-xl font-bold text-green-600">{formatAmount(statistics.totalReturns)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">Investissements actifs</p>
                            <p className="text-xl font-bold text-purple-600">{statistics.activeInvestments}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-sm text-gray-500">ROI</p>
                            <p className="text-xl font-bold text-yellow-600">{statistics.roi}%</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'discover'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaSearch /> Découvrir
                    </button>
                    <button
                        onClick={() => setActiveTab('my-investments')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'my-investments'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaWallet /> Mes investissements
                        {myInvestments.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs">
                                {myInvestments.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('my-company')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'my-company'
                                ? 'bg-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FaBuilding /> Mon entreprise
                        {myCompany && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                                Active
                            </span>
                        )}
                    </button>
                    <button
                        onClick={checkKYCBeforeCreate}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            canCreateCompany
                                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        }`}
                        disabled={!canCreateCompany}
                    >
                        <FaPlus /> Créer une entreprise
                        {!canCreateCompany && (
                            <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">KYC requis</span>
                        )}
                    </button>
                </div>

                {/* Tab: Découvrir */}
                {activeTab === 'discover' && (
                    <div>
                        <div className="bg-blue-900/50 rounded-xl shadow-md p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <select
                                    value={filterSector}
                                    onChange={(e) => setFilterSector(e.target.value)}
                                    className="bg-blue-900/100 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="all">Tous les secteurs</option>
                                    {sectors.filter(s => s !== 'all').map(sector => (
                                        <option key={sector} value={sector}>{sector}</option>
                                    ))}
                                </select>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-blue-900/90 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="recent">Plus récentes</option>
                                    <option value="progress">Plus avancées</option>
                                    <option value="goal">Plus gros objectifs</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <FaSpinner className="animate-spin text-green-500 text-3xl" />
                            </div>
                        ) : filteredCompanies.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaBuilding className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune entreprise disponible</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCompanies.map(company => {
                                    const progress = (company.collected_amount / company.funding_goal) * 100;
                                    const isFunded = progress >= 100;
                                    const status = getStatusBadge(company);

                                    return (
                                        <div key={company.id} className="bg-blue-900 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all border border-gray-100">
                                            <div className="p-4 border-b" style={{ borderColor: company.color || '#E5E7EB' }}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-100">{company.name}</h3>
                                                        <p className="text-sm text-rose-400">{company.sector}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-sm text-white line-clamp-2">{company.description}</p>

                                                <div className="mt-4">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-white">Collecté</span>
                                                        <span className="font-bold">{formatAmount(company.collected_amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray">Objectif</span>
                                                        <span className="font-bold">{formatAmount(company.funding_goal)}</span>
                                                    </div>
                                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${getProgressColor(company.collected_amount, company.funding_goal)}`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-xs mt-1">
                                                        <span className="text-gray-400">{Math.min(progress, 100).toFixed(0)}%</span>
                                                        <span className="text-gray-400">{company.investors_count || 0} investisseurs</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => handleViewCompanyDetail(company)}
                                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                                                    >
                                                        <FaEye /> Détails
                                                    </button>
                                                    {!isFunded && (
                                                        <button
                                                            onClick={() => {
                                                                if (!canCreateCompany) {
                                                                    toast.error('KYC niveau 1 requis pour investir');
                                                                    setShowKYCModal(true);
                                                                    return;
                                                                }
                                                                setSelectedCompany(company);
                                                                setInvestAmount('');
                                                                setShares(1);
                                                                setShowInvestModal(true);
                                                            }}
                                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <FaMoneyBillWave /> Investir
                                                        </button>
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

                {/* Tab: Mes investissements */}
                {activeTab === 'my-investments' && (
                    <div>
                        {myInvestments.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <FaWallet className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucun investissement</p>
                                <button
                                    onClick={() => setActiveTab('discover')}
                                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                                >
                                    Découvrir des entreprises →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myInvestments.map(investment => (
                                    <div key={investment.id} className="bg-blue-900 rounded-xl shadow-lg p-4 border border-gray-100">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{investment.company_name}</h3>
                                                <p className="text-sm text-green-400">{investment.sector}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                Actif
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs text-gray ">Montant investi</p>
                                                <p className="font-bold text-green-600">{formatAmount(investment.amount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray ">Actions</p>
                                                <p className="font-bold">{investment.shares}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray ">Date</p>
                                                <p className="text-sm">{formatDate(investment.created_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray ">Valeur actuelle</p>
                                                <p className="font-bold text-blue-600">
                                                    {formatAmount(investment.current_value || investment.amount)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    const company = companies.find(c => c.id === investment.company_id);
                                                    if (company) handleViewCompanyDetail(company);
                                                }}
                                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-2"
                                            >
                                                <FaEye size={14} /> Voir l'entreprise
                                            </button>
                                            <button
                                                onClick={() => handleViewInvestmentDetail(investment)}
                                                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center gap-2"
                                            >
                                                <FaInfoCircle size={14} /> Détails
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const company = companies.find(c => c.id === investment.company_id) || {
                                                        name: investment.company_name,
                                                        sector: investment.sector,
                                                        location: investment.location,
                                                        phone: investment.company_phone
                                                    };
                                                    generateInvestmentContract(investment, company);
                                                }}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                                            >
                                                <FaFileContract size={14} /> Télécharger le contrat
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Mon entreprise */}
                {activeTab === 'my-company' && (
                    <div>
                        {!myCompany ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl">
                                <FaBuilding className="text-gray-300 text-5xl mx-auto mb-3" />
                                <p className="text-gray-500">Aucune entreprise</p>
                                <button
                                    onClick={checkKYCBeforeCreate}
                                    className="mt-4 bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 font-medium"
                                >
                                    Créer votre entreprise →
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                                    <div className="flex justify-between items-start flex-wrap gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{myCompany.name}</h2>
                                            <p className="text-blue-200">{myCompany.sector}</p>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                onClick={goToMyCompany}
                                                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <FaChartBar /> Dashboard
                                            </button>
                                            <button
                                                onClick={handleOpenEdit}
                                                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <FaEdit /> Modifier
                                            </button>
                                            <button
                                                onClick={() => setShowShareModal(true)}
                                                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                                            >
                                                <FaShare />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="bg-red-500/50 hover:bg-red-500/70 px-4 py-2 rounded-lg transition-colors"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Objectif</p>
                                            <p className="text-xl font-bold text-blue-600">{formatAmount(myCompany.funding_goal)}</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Collecté</p>
                                            <p className="text-xl font-bold text-green-600">{formatAmount(myCompany.collected_amount)}</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Investisseurs</p>
                                            <p className="text-xl font-bold text-purple-600">{myCompany.investors_count || 0}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">Progression</span>
                                            <span className="font-bold">
                                                {((myCompany.collected_amount / myCompany.funding_goal) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full ${getProgressColor(myCompany.collected_amount, myCompany.funding_goal)}`}
                                                style={{ width: `${Math.min((myCompany.collected_amount / myCompany.funding_goal) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h3 className="font-bold mb-2">Description</h3>
                                        <p className="text-gray-700">{myCompany.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Créer une entreprise */}
            {showCreateCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold text-white">🚀 Créer votre entreprise</h3>
                            <button onClick={() => setShowCreateCompany(false)} className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCompany} className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                            {!canCreateCompany && (
                                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                                        <FaIdCard /> ⚠️ Niveau KYC 1 requis
                                        <button
                                            onClick={goToKYC}
                                            className="text-blue-400 underline font-medium"
                                        >
                                            Vérifier
                                        </button>
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Nom *</label>
                                    <input
                                        type="text"
                                        value={companyForm.name}
                                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        required
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Nom complet</label>
                                    <input
                                        type="text"
                                        value={companyForm.fullName}
                                        onChange={(e) => setCompanyForm({ ...companyForm, fullName: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Secteur *</label>
                                <select
                                    value={companyForm.sector}
                                    onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                                    required
                                    disabled={!canCreateCompany}
                                >
                                    <option value="" className="text-gray-800">Sélectionnez</option>
                                    <option value="Technologie" className="text-gray-800">💻 Technologie</option>
                                    <option value="Santé" className="text-gray-800">🏥 Santé</option>
                                    <option value="Éducation" className="text-gray-800">📚 Éducation</option>
                                    <option value="Agriculture" className="text-gray-800">🌾 Agriculture</option>
                                    <option value="Énergie" className="text-gray-800">⚡ Énergie</option>
                                    <option value="Transport" className="text-gray-800">🚚 Transport</option>
                                    <option value="Finance" className="text-gray-800">💰 Finance</option>
                                    <option value="Immobilier" className="text-gray-800">🏠 Immobilier</option>
                                    <option value="E-commerce" className="text-gray-800">🛒 E-commerce</option>
                                    <option value="Autre" className="text-gray-800">🔧 Autre</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Description *</label>
                                <textarea
                                    value={companyForm.description}
                                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="3"
                                    required
                                    disabled={!canCreateCompany}
                                    placeholder="Décrivez votre entreprise..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Pitch</label>
                                <textarea
                                    value={companyForm.pitch}
                                    onChange={(e) => setCompanyForm({ ...companyForm, pitch: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="2"
                                    disabled={!canCreateCompany}
                                    placeholder="Pourquoi investir ?"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Objectif (FCFA) *</label>
                                    <input
                                        type="number"
                                        value={companyForm.fundingGoal}
                                        onChange={(e) => setCompanyForm({ ...companyForm, fundingGoal: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        required
                                        min="100000"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Nombre d'actions</label>
                                    <input
                                        type="number"
                                        value={companyForm.sharesOffered}
                                        onChange={(e) => setCompanyForm({ ...companyForm, sharesOffered: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        min="1"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Prix/action (FCFA)</label>
                                    <input
                                        type="number"
                                        value={companyForm.sharePrice}
                                        onChange={(e) => setCompanyForm({ ...companyForm, sharePrice: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        min="100"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Localisation</label>
                                    <input
                                        type="text"
                                        value={companyForm.location}
                                        onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-200 mb-1">Site web</label>
                                    <input
                                        type="url"
                                        value={companyForm.website}
                                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                        disabled={!canCreateCompany}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">Équipe</label>
                                <textarea
                                    value={companyForm.team}
                                    onChange={(e) => setCompanyForm({ ...companyForm, team: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-yellow-500"
                                    rows="2"
                                    disabled={!canCreateCompany}
                                    placeholder="Présentez votre équipe"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateCompany(false)}
                                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 rounded-lg hover:bg-white/20"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !canCreateCompany}
                                    className="flex-1 bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Créer l'entreprise</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Modifier l'entreprise */}
            {showEditCompany && myCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-2xl w-full bg-yellow-600 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-800">✏️ Modifier l'entreprise</h3>
                            <button onClick={() => setShowEditCompany(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCompany} className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
                                    <input
                                        type="text"
                                        value={editForm.sector}
                                        onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pitch</label>
                                <textarea
                                    value={editForm.pitch}
                                    onChange={(e) => setEditForm({ ...editForm, pitch: e.target.value })}
                                    rows="2"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                                    <input
                                        type="text"
                                        value={editForm.location}
                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                                    <input
                                        type="url"
                                        value={editForm.website}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Équipe</label>
                                <textarea
                                    value={editForm.team}
                                    onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                                    rows="2"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditCompany(false)}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-red-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Enregistrer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Confirmation suppression */}
            {showDeleteConfirm && myCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                Supprimer l'entreprise ?
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Cette action est irréversible. Toutes les données associées à "{myCompany.name}" seront supprimées.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDeleteCompany}
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                                >
                                    <FaTrash /> Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Investir */}
            {showInvestModal && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Investir dans {selectedCompany.name}</h3>
                            <button onClick={() => setShowInvestModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-black">Prix par action</span>
                                    <span className="text-black font-bold">{formatAmount(selectedCompany.share_price || 1000)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-black">Votre solde</span>
                                    <span className={`font-bold ${userBalance >= (selectedCompany.share_price || 1000) ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatAmount(userBalance)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'actions</label>
                                    <input
                                        type="number"
                                        value={shares}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setShares(Math.max(1, val));
                                            setInvestAmount((val * (selectedCompany.share_price || 1000)).toString());
                                        }}
                                        className="text-black w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant total (FCFA)</label>
                                    <input
                                        type="number"
                                        value={investAmount}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setInvestAmount(val.toString());
                                            const price = selectedCompany.share_price || 1000;
                                            setShares(Math.max(1, Math.round(val / price)));
                                        }}
                                        className="text-black w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        min={selectedCompany.share_price || 1000}
                                        step="100"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800 flex items-start gap-2">
                                    <FaFileContract className="mt-0.5 flex-shrink-0" />
                                    <span>Un <strong>contrat d'investissement PDF</strong> sera généré automatiquement après validation.</span>
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowInvestModal(false)}
                                    className="flex-1 border text-black border-gray-900 py-2 rounded-lg hover:bg-red-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleInvest}
                                    disabled={submitting || parseFloat(investAmount) > userBalance || parseFloat(investAmount) < (selectedCompany.share_price || 1000)}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Confirmer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Détail Investissement */}
            {showInvestmentDetail && selectedInvestment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaChartLine /> Détails de l'investissement
                            </h3>
                            <button onClick={() => setShowInvestmentDetail(false)} className="text-white/80 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-2">📈</div>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatAmount(selectedInvestment.amount)}
                                </p>
                                <p className="text-sm text-gray-500 font-mono">
                                    Réf: INV-{selectedInvestment.id}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-900">Entreprise</span>
                                    <span className="text-gray-900 font-medium">{selectedInvestment.company_name}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-900">Secteur</span>
                                    <span className="text-gray-900 font-medium">{selectedInvestment.sector}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-900">Actions</span>
                                    <span className="font-bold text-green-600">{selectedInvestment.shares}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-900">Prix par action</span>
                                    <span className="text-gray-900 font-medium">{formatAmount(selectedInvestment.share_price || 1000)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-900">Date</span>
                                    <span className="text-gray-900 font-medium">{formatDate(selectedInvestment.created_at)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-green-700 font-medium">Statut</span>
                                    <span className="font-bold text-green-600">✅ Actif</span>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        const company = companies.find(c => c.id === selectedInvestment.company_id) || {
                                            name: selectedInvestment.company_name,
                                            sector: selectedInvestment.sector
                                        };
                                        generateInvestmentContract(selectedInvestment, company);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2"
                                >
                                    <FaFileContract /> Télécharger le contrat
                                </button>
                                <button
                                    onClick={() => setShowInvestmentDetail(false)}
                                    className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-red-600 transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Détail entreprise */}
            {showCompanyDetail && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className="relative max-w-3xl w-full bg-blue-900/75 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-800">Détails de l'entreprise</h3>
                            <button onClick={() => setShowCompanyDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                                    <FaBuilding className="text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray">{selectedCompany.name}</h2>
                                    <p className="text-white-500">{selectedCompany.sector}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray mb-2">Description</h4>
                                <p className="text-gray">{selectedCompany.description}</p>
                            </div>

                            {selectedCompany.pitch && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray mb-2">🎯 Pitch</h4>
                                    <p className="text-gray">{selectedCompany.pitch}</p>
                                </div>
                            )}

                            {selectedCompany.team && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-70 mb-2">👥 Équipe</h4>
                                    <p className="text-gray-60">{selectedCompany.team}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                {selectedCompany.collected_amount < selectedCompany.funding_goal && (
                                    <button
                                        onClick={() => {
                                            if (!canCreateCompany) {
                                                toast.error('KYC niveau 1 requis pour investir');
                                                setShowKYCModal(true);
                                                return;
                                            }
                                            setShowCompanyDetail(false);
                                            setInvestAmount('');
                                            setShares(1);
                                            setShowInvestModal(true);
                                        }}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaMoneyBillWave /> Investir
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowCompanyDetail(false)}
                                    className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Partager */}
            {showShareModal && myCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">🔗 Partager l'entreprise</h3>
                            <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            {qrCodeUrl && (
                                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mx-auto mb-4 border rounded-lg p-2" />
                            )}
                            <p className="text-sm text-gray-500 mb-4">Scannez ce QR code ou partagez le lien</p>
                            
                            <div className="flex justify-center gap-3 mb-4 flex-wrap">
                                <button
                                    onClick={() => shareCompany('whatsapp')}
                                    className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                                >
                                    <FaPhone />
                                </button>
                                <button
                                    onClick={() => shareCompany('facebook')}
                                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                >
                                    <FaShare />
                                </button>
                                <button
                                    onClick={() => shareCompany('email')}
                                    className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                                >
                                    <FaEnvelope />
                                </button>
                                <button
                                    onClick={() => shareCompany('copy')}
                                    className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                                >
                                    <FaCopy />
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 break-all">
                                    {`${window.location.origin}/investment/${myCompany.id}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Investments;