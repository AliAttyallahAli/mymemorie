// src/services/reportGenerator.js
import jsPDF from 'jspdf';

export const generateInvestmentReportPDF = (reportData) => {
    if (!reportData) {
        console.error('❌ Données de rapport invalides');
        return;
    }

    console.log('📄 Génération du rapport d\'investissement...');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    const colors = {
        primary: [37, 99, 235],
        secondary: [16, 185, 129],
        dark: [31, 41, 55],
        gray: [107, 114, 128],
        lightGray: [243, 244, 246]
    };

    // ============================================
    // EN-TÊTE
    // ============================================
    
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(margin, y, contentWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('alkherpayS', pageWidth / 2, y + 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Rapport d\'investissement', pageWidth / 2, y + 26, { align: 'center' });
    
    y += 45;

    // ============================================
    // TITRE DU RAPPORT
    // ============================================
    
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportData.company.name, pageWidth / 2, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(`${reportData.company.sector} • ${reportData.company.owner.name}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ============================================
    // RÉSUMÉ
    // ============================================
    
    doc.setFontSize(12);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 RÉSUMÉ', margin, y);
    y += 8;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    // Grille de statistiques
    const stats = [
        { label: 'Investisseurs', value: reportData.stats.totalInvestors },
        { label: 'Montant total', value: `${reportData.stats.totalInvested.toLocaleString()} FCFA` },
        { label: 'Actions vendues', value: reportData.stats.totalShares },
        { label: 'Progression', value: `${reportData.stats.progress.toFixed(0)}%` }
    ];
    
    const colWidth = contentWidth / 4;
    stats.forEach((stat, index) => {
        const x = margin + (index * colWidth);
        doc.setFontSize(9);
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(stat.label, x, y);
        doc.setFontSize(14);
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.value), x, y + 7);
        doc.setFont('helvetica', 'normal');
    });
    y += 20;

    // ============================================
    // INFORMATIONS DE L'ENTREPRISE
    // ============================================
    
    doc.setFontSize(12);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('🏢 INFORMATIONS DE L\'ENTREPRISE', margin, y);
    y += 8;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    const companyInfo = [
        { label: 'Nom', value: reportData.company.name },
        { label: 'Secteur', value: reportData.company.sector },
        { label: 'Propriétaire', value: reportData.company.owner.name },
        { label: 'Contact', value: reportData.company.owner.phone },
        { label: 'Email', value: reportData.company.owner.email || 'N/A' },
        { label: 'Date de création', value: new Date(reportData.company.created_at).toLocaleDateString('fr-FR') }
    ];
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    companyInfo.forEach((info, index) => {
        const x1 = margin + 5;
        const x2 = margin + 80;
        const yPos = y + (index * 8);
        
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(info.label + ':', x1, yPos);
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.text(info.value, x2, yPos);
    });
    y += companyInfo.length * 8 + 8;

    // ============================================
    // OBJECTIF DE FINANCEMENT
    // ============================================
    
    doc.setFontSize(12);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('🎯 FINANCEMENT', margin, y);
    y += 8;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    const goal = reportData.company.funding_goal;
    const collected = reportData.stats.totalInvested;
    const progress = reportData.stats.progress;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(`Objectif: ${goal.toLocaleString()} FCFA`, margin + 5, y);
    doc.text(`Collecté: ${collected.toLocaleString()} FCFA`, margin + 5, y + 8);
    doc.text(`Progression: ${progress.toFixed(0)}%`, margin + 5, y + 16);
    
    // Barre de progression
    y += 24;
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    const progressWidth = Math.min(progress, 100);
    doc.rect(margin, y, (contentWidth * progressWidth) / 100, 6, 'F');
    y += 12;

    // ============================================
    // TOP INVESTISSEURS
    // ============================================
    
    if (reportData.topInvestors.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('🏆 TOP INVESTISSEURS', margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        
        const tableHeaders = ['#', 'Nom', 'Montant', 'Actions'];
        const colWidths = [15, 60, 50, 50];
        const startX = margin;
        
        // En-tête du tableau
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(startX, y - 4, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        
        let currentX = startX + 3;
        tableHeaders.forEach((header, index) => {
            doc.text(header, currentX, y + 2);
            currentX += colWidths[index];
        });
        
        y += 8;
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('helvetica', 'normal');
        
        reportData.topInvestors.slice(0, 10).forEach((investor, index) => {
            if (y > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                y = margin + 20;
            }
            
            doc.setFontSize(8);
            currentX = startX + 3;
            doc.text((index + 1).toString(), currentX, y + 2);
            currentX += colWidths[0];
            doc.text(investor.investor_name.substring(0, 20), currentX, y + 2);
            currentX += colWidths[1];
            doc.text(`${investor.amount.toLocaleString()} FCFA`, currentX, y + 2);
            currentX += colWidths[2];
            doc.text((investor.shares || 0).toString(), currentX, y + 2);
            
            y += 8;
        });
        y += 8;
    }

    // ============================================
    // STATISTIQUES MENSUELLES
    // ============================================
    
    if (reportData.monthlyStats && reportData.monthlyStats.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('📈 ÉVOLUTION MENSUELLE', margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        
        const months = reportData.monthlyStats.slice(0, 6);
        const maxTotal = Math.max(...months.map(m => m.total), 1);
        
        months.forEach((month, index) => {
            const x = margin + (index * (contentWidth / 6));
            const height = (month.total / maxTotal) * 40;
            const barY = y + 50 - height;
            
            // Barre
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(x + 5, barY, 15, height, 'F');
            
            // Valeur
            doc.setFontSize(7);
            doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
            doc.text(`${month.total.toLocaleString()} FCFA`, x + 5, barY - 3);
            
            // Mois
            doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
            doc.text(month.month, x + 5, y + 54);
        });
        y += 65;
    }

    // ============================================
    // PIED DE PAGE
    // ============================================
    
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('alkherpays - Rapport d\'investissement', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`Réf: INV-REPORT-${Date.now()}`, pageWidth - margin, footerY + 5, { align: 'right' });

    // ============================================
    // SAUVEGARDE
    // ============================================
    
    const fileName = `rapport_investissement_${reportData.company.name}_${Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log('✅ Rapport généré avec succès:', fileName);
};

export default generateInvestmentReportPDF;