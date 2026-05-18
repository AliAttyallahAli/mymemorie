// src/services/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateTaxReceiptPDF = (receipt) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // En-tête
    doc.setFillColor(106, 0, 255); // Purple
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('REÇU DE PAIEMENT', pageWidth / 2, 25, { align: 'center' });
    
    // Info reçu
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`N° Reçu: ${receipt.receipt_number}`, 14, 55);
    doc.text(`Date: ${new Date(receipt.payment_date).toLocaleString('fr-FR')}`, 14, 62);
    
    // Ligne séparatrice
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 70, pageWidth - 14, 70);
    
    // Informations du contribuable
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Informations du contribuable', 14, 80);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Nom: ${receipt.taxpayer_name}`, 14, 90);
    doc.text(`Téléphone: ${receipt.taxpayer_phone}`, 14, 97);
    if (receipt.taxpayer_address) doc.text(`Adresse: ${receipt.taxpayer_address}`, 14, 104);
    if (receipt.business_number) doc.text(`N° Boutique: ${receipt.business_number}`, 14, 111);
    if (receipt.property_address) doc.text(`Adresse propriété: ${receipt.property_address}`, 14, 118);
    
    // Détails du paiement
    let yPosition = receipt.property_address ? 125 : (receipt.business_number ? 118 : 111);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Détails du paiement', 14, yPosition);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPosition += 10;
    doc.text(`Type de taxe: ${receipt.tax_type}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Période: ${receipt.tax_period}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Commune: ${receipt.office_name}`, 14, yPosition);
    yPosition += 15;
    
    // Tableau des montants
    doc.autoTable({
        startY: yPosition,
        head: [['Description', 'Montant']],
        body: [
            [`${receipt.tax_type}`, `${receipt.amount.toLocaleString()} FCFA`],
            ['Frais de service (1%)', `${receipt.fee.toLocaleString()} FCFA`],
            ['Total payé', `${receipt.total_amount.toLocaleString()} FCFA`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [106, 0, 255] },
        margin: { left: 14 },
    });
    
    // Pied de page
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Ce reçu fait office de justificatif de paiement.', pageWidth / 2, finalY, { align: 'center' });
    doc.text('CashPays - Paiement sécurisé en ligne', pageWidth / 2, finalY + 7, { align: 'center' });
    
    // Télécharger
    doc.save(`recu_taxe_${receipt.receipt_number}.pdf`);
};