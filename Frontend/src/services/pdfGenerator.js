// src/services/pdfGenerator.js
// Générateur de reçus PDF professionnel - Version corrigée et structurée

import jsPDF from 'jspdf';

// Configuration des couleurs
const COLORS = {
    primary: [37, 99, 235],     // Bleu
    secondary: [245, 158, 11],  // Orange
    success: [16, 185, 129],    // Vert
    dark: [31, 41, 55],         // Gris foncé
    gray: [107, 114, 128],      // Gris moyen
    lightGray: [243, 244, 246], // Gris clair
    white: [255, 255, 255],
    border: [229, 231, 235]     // Couleur de bordure
};

// Dimensions A4
const A4 = {
    width: 210,
    height: 297,
    margin: {
        top: 15,
        bottom: 20,
        left: 15,
        right: 15
    }
};

// Fonction pour formater la date
const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

// Fonction pour formater le montant
const formatAmount = (amount) => {
    return `${amount.toLocaleString()} FCFA`;
};

// Fonction pour dessiner une ligne horizontale
const drawLine = (doc, y, color = COLORS.border) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(A4.margin.left, y, A4.width - A4.margin.right, y);
};

// Fonction pour dessiner un tableau simple
const drawInfoRow = (doc, label, value, x, y, labelWidth = 45) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.text(label, x, y);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.text(String(value), x + labelWidth, y);
};

/**
 * Génère un reçu PDF pour le paiement de taxe - Version corrigée
 */
export const generateTaxReceiptPDF = (receipt) => {
    if (!receipt) {
        console.error('❌ Reçu invalide');
        return;
    }

    console.log('📄 Génération du PDF pour:', receipt.receipt_number);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const { margin } = A4;
    let y = margin.top;

    // ============================================
    // EN-TÊTE
    // ============================================
    
    // Rectangle bleu
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(margin.left, y, A4.width - margin.left - margin.right, 35, 'F');
    
    // Texte AlkherPay
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AlkherPay', margin.left + 10, y + 22);
    
    // Sous-titre
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Plateforme de paiement sécurisé', margin.left + 10, y + 30);
    
    // Badge REÇU OFFICIEL
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REÇU OFFICIEL', A4.width - margin.right - 45, y + 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Document fiscal valide', A4.width - margin.right - 45, y + 28);
    
    y += 45;

    // ============================================
    // BANDEAU STATUT
    // ============================================
    
    doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 10, 4, 4, 'F');
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ PAIEMENT CONFIRMÉ', A4.width / 2, y + 7, { align: 'center' });
    y += 18;

    // ============================================
    // SECTION 1: INFORMATIONS DE LA TRANSACTION
    // ============================================
    
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE LA TRANSACTION', margin.left, y);
    drawLine(doc, y + 4);
    y += 12;

    // Tableau 2x2
    const col1 = margin.left;
    const col2 = A4.width / 2 + 5;
    
    drawInfoRow(doc, 'N° Reçu', receipt.receipt_number || 'N/A', col1, y, 35);
    drawInfoRow(doc, 'Date de paiement', formatDate(receipt.payment_date || receipt.created_at || new Date()), col2, y, 40);
    y += 8;
    
    drawInfoRow(doc, 'Mode de paiement', 'Wallet AlkherPay', col1, y, 45);
    drawInfoRow(doc, 'Statut', '✓ PAYÉ', col2, y, 30);
    y += 15;

    // ============================================
    // SECTION 2: INFORMATIONS DU CONTRIBUABLE
    // ============================================
    
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DU CONTRIBUABLE', margin.left, y);
    drawLine(doc, y + 4);
    y += 12;

    // Cadre gris
    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 38, 4, 4, 'F');
    
    drawInfoRow(doc, 'Nom complet', receipt.taxpayer_name || 'N/A', margin.left + 8, y + 10, 40);
    drawInfoRow(doc, 'Téléphone', receipt.taxpayer_phone || 'N/A', margin.left + 8, y + 20, 40);
    drawInfoRow(doc, 'Adresse', (receipt.taxpayer_address || 'Non renseignée').substring(0, 35), margin.left + 8, y + 30, 40);
    
    y += 48;

    // ============================================
    // SECTION 3: DÉTAILS DE LA TAXE
    // ============================================
    
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DE LA TAXE', margin.left, y);
    drawLine(doc, y + 4);
    y += 12;

    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 32, 4, 4, 'F');
    
    drawInfoRow(doc, 'Type de taxe', receipt.tax_type || 'N/A', margin.left + 8, y + 10, 40);
    drawInfoRow(doc, 'Période', receipt.tax_period || 'N/A', margin.left + 8, y + 20, 40);
    drawInfoRow(doc, 'Commune', receipt.office_name || receipt.commune_name || 'N/A', margin.left + 8, y + 30, 40);
    
    y += 42;

    // ============================================
    // SECTION 4: MONTANT (CARTE MISE EN VALEUR)
    // ============================================
    
    const amountValue = receipt.amount || 0;
    const feeValue = receipt.fee || Math.floor(amountValue * 0.01);
    const totalValue = receipt.total_amount || (amountValue + feeValue);
    
    // Carte orange
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 55, 6, 6, 'F');
    doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 55, 6, 6, 'S');
    
    let amountY = y + 12;
    
    // Montant de la taxe
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Montant de la taxe', margin.left + 15, amountY);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(amountValue), margin.left + 100, amountY);
    
    amountY += 12;
    
    // Frais de service
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.text('Frais de service (1%)', margin.left + 15, amountY);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(feeValue), margin.left + 100, amountY);
    
    amountY += 10;
    
    // Ligne de séparation
    drawLine(doc, amountY, COLORS.secondary);
    
    amountY += 10;
    
    // Total
    doc.setFontSize(14);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAYÉ', margin.left + 15, amountY);
    doc.setFontSize(18);
    doc.text(formatAmount(totalValue), margin.left + 100, amountY);
    
    y += 65;

    // ============================================
    // INFORMATIONS COMPLÉMENTAIRES (si présentes)
    // ============================================
    
    if (receipt.business_number || receipt.property_address) {
        doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMATIONS COMPLÉMENTAIRES', margin.left, y);
        drawLine(doc, y + 4);
        y += 12;
        
        doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
        doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 28, 4, 4, 'F');
        
        let extraY = y + 12;
        if (receipt.business_number) {
            drawInfoRow(doc, 'N° boutique', receipt.business_number, margin.left + 8, extraY, 40);
            extraY += 12;
        }
        if (receipt.property_address) {
            drawInfoRow(doc, 'Adresse bien', receipt.property_address.substring(0, 35), margin.left + 8, extraY, 40);
        }
        
        y += 40;
    }

    // ============================================
    // PIED DE PAGE
    // ============================================
    
    const footerY = A4.height - A4.margin.bottom - 5;
    
    drawLine(doc, footerY - 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.text('AlkherPay - Solution de paiement sécurisé', A4.width / 2, footerY, { align: 'center' });
    doc.text('Ce document fait foi de paiement et est valable fiscalement', A4.width / 2, footerY + 5, { align: 'center' });
    doc.text(`Généré le ${formatDate(new Date())}`, A4.width / 2, footerY + 10, { align: 'center' });
    
    // Référence en bas à droite
    doc.setFontSize(7);
    doc.text(`REF: ${receipt.receipt_number || 'N/A'}`, A4.width - margin.right, footerY + 10, { align: 'right' });
    doc.text('✓ Document authentifié par AlkherPay', margin.left, footerY + 10);

    // Sauvegarde
    const fileName = `recu_taxe_${receipt.receipt_number || Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF généré avec succès');
};

/**
 * Génère un reçu pour les factures d'eau/électricité
 */
export const generateBillReceiptPDF = (receipt) => {
    if (!receipt) {
        console.error('❌ Reçu invalide');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const { margin } = A4;
    let y = margin.top;

    // Couleurs selon le type
    const isWater = receipt.service_type === 'water';
    const primaryColor = isWater ? [59, 130, 246] : [245, 158, 11];
    const icon = isWater ? '💧' : '⚡';
    const serviceName = isWater ? 'EAU' : 'ÉLECTRICITÉ';

    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin.left, y, A4.width - margin.left - margin.right, 35, 'F');
    
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`AlkherPay ${icon}`, margin.left + 10, y + 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paiement de facture ${serviceName}`, margin.left + 10, y + 30);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE ACQUITTÉE', A4.width - margin.right - 55, y + 20);
    
    y += 45;

    // Bandeau statut
    doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 10, 4, 4, 'F');
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ FACTURE PAYÉE', A4.width / 2, y + 7, { align: 'center' });
    y += 18;

    // Informations de la facture
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE LA FACTURE', margin.left, y);
    drawLine(doc, y + 4);
    y += 12;

    const col1 = margin.left;
    const col2 = A4.width / 2 + 5;
    
    drawInfoRow(doc, 'N° Facture', receipt.invoice_number || receipt.receipt_number || 'N/A', col1, y, 40);
    drawInfoRow(doc, 'Date de paiement', formatDate(receipt.payment_date || receipt.created_at || new Date()), col2, y, 45);
    y += 8;
    
    drawInfoRow(doc, 'Fournisseur', receipt.company_name || 'N/A', col1, y, 40);
    drawInfoRow(doc, 'N° Compteur', receipt.meter_number || 'N/A', col2, y, 45);
    y += 15;

    // Client
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DU CLIENT', margin.left, y);
    drawLine(doc, y + 4);
    y += 12;

    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 32, 4, 4, 'F');
    
    drawInfoRow(doc, 'Nom', receipt.customer_name || 'N/A', margin.left + 8, y + 10, 30);
    drawInfoRow(doc, 'Téléphone', receipt.customer_phone || 'N/A', margin.left + 8, y + 20, 30);
    drawInfoRow(doc, 'Adresse', (receipt.customer_address || 'Non renseignée').substring(0, 35), margin.left + 8, y + 30, 30);
    
    y += 42;

    // Montant
    const amountValue = receipt.amount || 0;
    const feeValue = receipt.fee || Math.floor(amountValue * 0.015);
    const totalValue = receipt.total_amount || (amountValue + feeValue);

    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 50, 6, 6, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin.left, y, A4.width - margin.left - margin.right, 50, 6, 6, 'S');
    
    let amountY = y + 12;
    
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.setFontSize(10);
    doc.text('Montant de la facture', margin.left + 15, amountY);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(amountValue), margin.left + 100, amountY);
    
    amountY += 12;
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.text('Frais de service (1.5%)', margin.left + 15, amountY);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(formatAmount(feeValue), margin.left + 100, amountY);
    
    amountY += 10;
    drawLine(doc, amountY, primaryColor);
    
    amountY += 10;
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TOTAL PAYÉ', margin.left + 15, amountY);
    doc.setFontSize(18);
    doc.text(formatAmount(totalValue), margin.left + 100, amountY);

    // Pied de page
    const footerY = A4.height - A4.margin.bottom - 5;
    drawLine(doc, footerY - 10);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.text('AlkherPay - Paiement de factures sécurisé', A4.width / 2, footerY, { align: 'center' });
    doc.text(`Généré le ${formatDate(new Date())}`, A4.width / 2, footerY + 5, { align: 'center' });
    doc.text(`REF: ${receipt.receipt_number || 'N/A'}`, A4.width - margin.right, footerY + 10, { align: 'right' });

    doc.save(`recu_facture_${receipt.receipt_number || Date.now()}.pdf`);
    console.log('✅ PDF généré avec succès');
};


// src/services/pdfGenerator.js - Ajouter cette fonction à la fin du fichier

/**
 * Génère un contrat d'investissement PDF
 * @param {Object} investment - Les données de l'investissement
 */
export const generateInvestmentContract = (investment) => {
    if (!investment) {
        console.error('❌ Investissement invalide, impossible de générer le contrat');
        return;
    }

    console.log('📄 Génération du contrat d\'investissement pour:', investment.company_name);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Couleurs
    const colors = {
        primary: [37, 99, 235],     // Bleu
        secondary: [16, 185, 129],  // Vert
        dark: [31, 41, 55],         // Gris foncé
        gray: [107, 114, 128],      // Gris moyen
        lightGray: [243, 244, 246]  // Gris clair
    };

    // ============================================
    // EN-TÊTE
    // ============================================
    
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(margin, y, contentWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AlkherPay', pageWidth / 2, y + 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Contrat d\'investissement', pageWidth / 2, y + 26, { align: 'center' });
    
    y += 45;

    // ============================================
    // TITRE DU CONTRAT
    // ============================================
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRAT D\'INVESTISSEMENT', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('Document officiel - Fait foi de droit', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ============================================
    // NUMÉRO DU CONTRAT
    // ============================================
    
    const contractNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    doc.setFontSize(10);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° Contrat:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(contractNumber, margin + 40, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Date:`, pageWidth - margin - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - margin - 30, y);
    y += 15;

    // ============================================
    // INFORMATIONS DE L'INVESTISSEUR
    // ============================================
    
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(margin, y, contentWidth, 35, 'F');
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('👤 INFORMATIONS DE L\'INVESTISSEUR', margin + 5, y + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const investorInfo = [
        `Nom: ${investment.investor_name || 'N/A'}`,
        `Téléphone: ${investment.investor_phone || 'N/A'}`,
        `Email: ${investment.investor_email || 'N/A'}`
    ];
    
    investorInfo.forEach((info, index) => {
        doc.text(info, margin + 5, y + 18 + (index * 8));
    });
    
    y += 45;

    // ============================================
    // INFORMATIONS DE L'ENTREPRISE
    // ============================================
    
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(margin, y, contentWidth, 35, 'F');
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('🏢 INFORMATIONS DE L\'ENTREPRISE', margin + 5, y + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const companyInfo = [
        `Nom: ${investment.company_name || 'N/A'}`,
        `Secteur: ${investment.sector || 'N/A'}`,
        `Propriétaire: ${investment.company_owner || 'N/A'}`
    ];
    
    companyInfo.forEach((info, index) => {
        doc.text(info, margin + 5, y + 18 + (index * 8));
    });
    
    y += 45;

    // ============================================
    // DÉTAILS DE L'INVESTISSEMENT
    // ============================================
    
    doc.setFillColor(255, 251, 235);
    doc.rect(margin, y, contentWidth, 45, 'F');
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 45, 'S');
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 DÉTAILS DE L\'INVESTISSEMENT', margin + 5, y + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const investDetails = [
        { label: 'Montant investi:', value: `${(investment.amount || 0).toLocaleString()} FCFA` },
        { label: 'Nombre d\'actions:', value: `${investment.shares || 0}` },
        { label: 'Prix par action:', value: `${(investment.share_price || 0).toLocaleString()} FCFA` },
        { label: 'Total des actions:', value: `${(investment.shares || 0)} actions` }
    ];
    
    investDetails.forEach((detail, index) => {
        const x1 = margin + 5;
        const x2 = margin + contentWidth - 50;
        const yPos = y + 18 + (index * 8);
        
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(detail.label, x1, yPos);
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(detail.value, x2, yPos);
        doc.setFont('helvetica', 'normal');
    });
    
    y += 55;

    // ============================================
    // CONDITIONS
    // ============================================
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 CONDITIONS GÉNÉRALES', margin, y);
    y += 8;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    
    const conditions = [
        '1. L\'investisseur reconnaît avoir pris connaissance des risques liés à cet investissement.',
        '2. Cet investissement est effectué volontairement et en connaissance de cause.',
        '3. L\'entreprise s\'engage à utiliser les fonds conformément à son projet.',
        '4. L\'investisseur recevra un rapport trimestriel sur l\'avancement du projet.',
        '5. Les droits de vote sont proportionnels au nombre d\'actions détenues.',
        '6. Le présent contrat est régi par la loi du Tchad.'
    ];
    
    conditions.forEach((condition, index) => {
        doc.text(condition, margin + 2, y + (index * 6));
    });
    
    y += 45;

    // ============================================
    // SIGNATURES
    // ============================================
    
    doc.setFontSize(10);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURES', pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Lignes de signature
    const signatureY = y + 15;
    const signX1 = margin + 20;
    const signX2 = pageWidth - margin - 20;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(signX1, signatureY, signX1 + 60, signatureY);
    doc.line(signX2, signatureY, signX2 + 60, signatureY);
    
    doc.setFontSize(8);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature de l\'investisseur', signX1 + 30, signatureY + 5, { align: 'center' });
    doc.text('Signature du représentant', signX2 + 30, signatureY + 5, { align: 'center' });
    
    y += 35;

    // ============================================
    // PIED DE PAGE
    // ============================================
    
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('AlkherPay - Contrat d\'investissement', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`REF: ${contractNumber}`, pageWidth - margin, footerY + 5, { align: 'right' });

    // ============================================
    // SAUVEGARDE
    // ============================================
    
    const fileName = `contrat_investissement_${contractNumber}.pdf`;
    doc.save(fileName);
    
    console.log('✅ Contrat généré avec succès:', fileName);
};

// Mettre à jour l'export par défaut
export default {
    generateTaxReceiptPDF,
    generateBillReceiptPDF,
    generateInvestmentContract
};