// src/pages/History.jsx - Version complète avec autoTable fonctionnel
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaSearch, FaDownload, FaFilePdf, FaFileExcel, 
  FaPrint, FaCalendarAlt, FaChevronLeft,
  FaChevronRight, FaSpinner, FaReceipt
} from 'react-icons/fa'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Layout from '../components/Layout'

function History({ user }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [page, filter, dateRange])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      let url = `/api/wallet/history?limit=20&offset=${(page-1)*20}`
      
      if (dateRange.start) {
        url += `&startDate=${dateRange.start}`
      }
      if (dateRange.end) {
        url += `&endDate=${dateRange.end}`
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(response.data.transactions || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error('Erreur chargement historique:', error)
      toast.error('Erreur lors du chargement de l\'historique')
    } finally {
      setLoading(false)
    }
  }

  const downloadXML = async (reference) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/transaction/${reference}/xml`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `transaction_${reference}.xml`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('XML téléchargé avec succès')
    } catch (error) {
      console.error('Erreur téléchargement XML:', error)
      toast.error('Erreur lors du téléchargement')
    }
  }

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '0 FCFA'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) return '0 FCFA'
    return numAmount.toLocaleString('fr-FR') + ' FCFA'
  }

  const formatAmountNumber = (amount) => {
    if (amount === null || amount === undefined) return '0'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount)) return '0'
    return numAmount.toLocaleString('fr-FR') + ' FCFA'
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).toUpperCase()
  }

  const formatDateShort = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Générer le reçu PDF individuel
  const generateReceiptPDF = async (tx) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      doc.setFillColor(10, 47, 108)
      doc.rect(0, 0, pageWidth, 45, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('CASHPAYS', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Transfert d\'argent instantané - GOUROUSDJA', pageWidth / 2, 32, { align: 'center' })
      
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(250, 250, 250)
      doc.roundedRect(14, 55, pageWidth - 28, pageHeight - 65, 5, 5, 'FD')
      
      let y = 70
      
      doc.setTextColor(10, 47, 108)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DÉTAILS DE LA TRANSACTION', 20, y)
      y += 12
      
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      doc.text('RÉFÉRENCE', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(tx.reference || '-', 75, y)
      y += 8
      
      doc.text('DATE', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(formatDateTime(tx.created_at), 75, y)
      y += 8
      
      doc.text('STATUT', 20, y)
      doc.setTextColor(76, 175, 80)
      doc.setFont('helvetica', 'bold')
      doc.text(tx.status_label?.toUpperCase() || 'COMPLÉTÉ', 75, y)
      y += 15
      
      doc.setDrawColor(200, 200, 200)
      doc.line(20, y - 5, pageWidth - 20, y - 5)
      doc.setTextColor(10, 47, 108)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PARTIES PRENANTES', 20, y)
      y += 10
      
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      doc.text('EXPÉDITEUR', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      const sender = (tx.sender_name || tx.sender_phone || 'N/A').substring(0, 25)
      doc.text(sender, 75, y)
      y += 8
      
      doc.text('TÉLÉPHONE EXP', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(tx.sender_phone || 'N/A', 75, y)
      y += 12
      
      doc.text('DESTINATAIRE', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      const receiver = (tx.receiver_name || tx.receiver_phone || 'N/A').substring(0, 25)
      doc.text(receiver, 75, y)
      y += 8
      
      doc.text('TÉLÉPHONE DEST', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(tx.receiver_phone || 'N/A', 75, y)
      y += 15
      
      doc.setDrawColor(200, 200, 200)
      doc.line(20, y - 5, pageWidth - 20, y - 5)
      doc.setTextColor(10, 47, 108)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('MONTANTS', 20, y)
      y += 10
      
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      doc.text('MONTANT ENVOYÉ', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(tx.amount), 75, y)
      y += 8
      
      if (tx.fee > 0) {
        doc.text('FRAIS (2%)', 20, y)
        doc.setTextColor(255, 152, 0)
        doc.setFont('helvetica', 'bold')
        doc.text(formatAmount(tx.fee), 75, y)
        y += 8
      }
      
      doc.setDrawColor(200, 200, 200)
      doc.line(20, y - 3, pageWidth - 20, y - 3)
      doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL DÉBITÉ', 20, y)
      doc.setTextColor(10, 47, 108)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount((tx.amount || 0) + (tx.fee || 0)), 75, y)
      
      const footerY = pageHeight - 50
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(14, footerY, pageWidth - 28, 40, 5, 5, 'F')
      
      doc.setTextColor(10, 47, 108)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Merci d\'utiliser CashPays - Transfert d\'argent instantané au Tchad', pageWidth / 2, footerY + 12, { align: 'center' })
      
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Service client: 62 78 73 07 | support@cashpays.td', pageWidth / 2, footerY + 22, { align: 'center' })
      doc.text('© 2026 CashPays - GOUROUSDJA', pageWidth / 2, footerY + 32, { align: 'center' })
      
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      
      doc.save(`reçu_${tx.reference || 'transaction'}.pdf`)
      toast.success('Reçu téléchargé avec succès')
      
    } catch (error) {
      console.error('Erreur génération reçu:', error)
      toast.error('Erreur lors de la génération du reçu')
    }
  }

  // Générer le PDF d'historique avec autoTable
  const generatePDF = async () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      const filtered = filteredTransactions
      
      // En-tête
      doc.setFillColor(10, 47, 108)
      doc.rect(0, 0, 210, 45, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('CASHPAYS', 105, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Historique des transactions', 105, 32, { align: 'center' })
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 105, 40, { align: 'center' })
      
      // Informations utilisateur
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text(`Utilisateur: ${user?.fullname || 'N/A'}`, 14, 60)
      doc.text(`Téléphone: ${user?.phone || 'N/A'}`, 14, 68)
      
      if (dateRange.start || dateRange.end) {
        let dateText = 'Période: '
        if (dateRange.start) dateText += `du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} `
        if (dateRange.end) dateText += `au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
        doc.text(dateText, 14, 76)
      }
      
      const tableData = filtered.map(tx => [
        tx.reference || '-',
        formatDateShort(tx.created_at),
        tx.sender_phone === user?.phone ? 'ENVOI' : 'RECEPTION',
        tx.sender_phone === user?.phone ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone),
        formatAmountNumber(tx.amount),
        tx.fee > 0 ? formatAmountNumber(tx.fee) : '-',
        formatAmountNumber(tx.net_amount || tx.amount),
        tx.status_label || 'COMPLETE'
      ])
      
      // Utilisation correcte de autoTable
      autoTable(doc, {
        startY: 85,
        head: [['Référence', 'Date', 'Type', 'Partenaire', 'Montant', 'Frais', 'Net', 'Statut']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [10, 47, 108], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 35, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 35, halign: 'left' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' },
          7: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: 10, right: 10 }
      })
      
      const finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('RÉCAPITULATIF', 14, finalY)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const totalSent = transactions.filter(t => t.sender_phone === user?.phone).reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalReceived = transactions.filter(t => t.receiver_phone === user?.phone).reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalFees = transactions.reduce((sum, t) => sum + (t.fee || 0), 0)
      
      doc.text(`Total envoyé: ${formatAmountNumber(totalSent)}`, 14, finalY + 10)
      doc.text(`Total reçu: ${formatAmountNumber(totalReceived)}`, 14, finalY + 18)
      doc.text(`Total frais: ${formatAmountNumber(totalFees)}`, 14, finalY + 26)
      doc.text(`Nombre de transactions: ${transactions.length}`, 14, finalY + 34)
      
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `CashPays - Page ${i} sur ${pageCount} - Service client: 62 78 73 07`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }
      
      doc.save(`historique_transactions_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = () => {
    try {
      const headers = ['Référence', 'Date', 'Type', 'Expéditeur', 'Destinataire', 'Montant', 'Frais', 'Net', 'Statut', 'Description']
      const rows = filteredTransactions.map(tx => [
        tx.reference || '',
        formatDateTime(tx.created_at),
        tx.sender_phone === user?.phone ? 'Envoi' : 'Réception',
        tx.sender_name || tx.sender_phone,
        tx.receiver_name || tx.receiver_phone,
        tx.amount,
        tx.fee || 0,
        tx.net_amount || tx.amount,
        tx.status_label || 'Complété',
        tx.description || ''
      ])
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `historique_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('CSV exporté avec succès')
    } catch (error) {
      console.error('Erreur export CSV:', error)
      toast.error('Erreur lors de l\'export CSV')
    }
  }

  const printHistory = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>CashPays - Historique des transactions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e3a8a; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CASHPAYS</div>
            <p>Historique des transactions</p>
            <p>Généré le: ${new Date().toLocaleString('fr-FR')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Type</th>
                <th>Partenaire</th>
                <th>Montant</th>
                <th>Frais</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(tx => `
                <tr>
                  <td>${tx.reference || '-'}</td>
                  <td>${formatDateTime(tx.created_at)}</td>
                  <td>${tx.sender_phone === user?.phone ? 'Envoi' : 'Réception'}</td>
                  <td>${tx.sender_phone === user?.phone ? (tx.receiver_name || tx.receiver_phone) : (tx.sender_name || tx.sender_phone)}</td>
                  <td>${formatAmount(tx.amount)}</td>
                  <td>${tx.fee > 0 ? formatAmount(tx.fee) : '-'}</td>
                  <td>${tx.status_label || 'Complété'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>CashPays - Transfert d'argent instantané au Tchad</p>
            <p>Service client: 62 78 73 07 | support@cashpays.td</p>
          </div>
        </body>
      </html>
    `)
    printWindow.print()
    printWindow.close()
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'sent') return tx.sender_phone === user?.phone
    if (filter === 'received') return tx.receiver_phone === user?.phone
    return true
  }).filter(tx => {
    if (!searchTerm) return true
    return tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tx.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tx.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tx.sender_phone?.includes(searchTerm) ||
           tx.receiver_phone?.includes(searchTerm)
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <Layout user={user}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Historique des transactions</h2>

        {/* Filtres et actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Rechercher par référence, nom, téléphone..."
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'sent' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              Envoyés
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'received' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              Reçus
            </button>
          </div>
          
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              showDateFilter ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            <FaCalendarAlt /> Date
          </button>
          
          <div className="relative group">
            <button className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all flex items-center gap-2">
              <FaDownload /> Exporter
            </button>
            <div className="absolute right-0 top-full mt-1 bg-blue-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-10 min-w-[150px]">
              <button
                onClick={generatePDF}
                disabled={exporting}
                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
              >
                <FaFilePdf /> PDF complet
              </button>
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
              >
                <FaFileExcel /> CSV
              </button>
              <button
                onClick={printHistory}
                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2"
              >
                <FaPrint /> Imprimer
              </button>
            </div>
          </div>
        </div>

        {/* Filtre date */}
        {showDateFilter && (
          <div className="bg-white/5 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="label text-sm">Date début</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label text-sm">Date fin</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="input-field"
              />
            </div>
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="text-red-400 text-sm hover:text-red-300"
            >
              Réinitialiser
            </button>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total envoyé</p>
            <p className="text-red-400 font-bold text-lg">
              {formatAmount(transactions.filter(t => t.sender_phone === user?.phone).reduce((sum, t) => sum + (t.amount || 0), 0))}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total reçu</p>
            <p className="text-green-400 font-bold text-lg">
              {formatAmount(transactions.filter(t => t.receiver_phone === user?.phone).reduce((sum, t) => sum + (t.amount || 0), 0))}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total frais</p>
            <p className="text-yellow-400 font-bold text-lg">
              {formatAmount(transactions.reduce((sum, t) => sum + (t.fee || 0), 0))}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Nombre transactions</p>
            <p className="text-white font-bold text-lg">{transactions.length}</p>
          </div>
        </div>

        {/* Liste des transactions */}
        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="text-white text-3xl animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <FaReceipt className="text-white/20 text-5xl mx-auto mb-3" />
            <p className="text-white/50">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status_label}
                      </span>
                      <span className="text-white/40 text-xs font-mono">{tx.reference}</span>
                    </div>
                    <p className="text-white font-medium">
                      {tx.sender_phone === user?.phone ? (
                        <>Envoi à <span className="text-blue-300">{tx.receiver_name || tx.receiver_phone}</span></>
                      ) : (
                        <>Réception de <span className="text-green-300">{tx.sender_name || tx.sender_phone}</span></>
                      )}
                    </p>
                    <p className="text-white/40 text-sm">
                      {formatDate(tx.created_at)}
                    </p>
                    {tx.description && (
                      <p className="text-white/50 text-sm mt-1">📝 {tx.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      tx.sender_phone === user?.phone ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {tx.sender_phone === user?.phone ? '-' : '+'}{formatAmount(tx.amount)}
                    </p>
                    {tx.fee > 0 && (
                      <p className="text-white/30 text-xs">Frais: {formatAmount(tx.fee)}</p>
                    )}
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => generateReceiptPDF(tx)}
                        className="text-green-400 text-xs hover:text-green-300 flex items-center gap-1"
                        title="Télécharger le reçu PDF"
                      >
                        <FaFilePdf size={12} /> Reçu
                      </button>
                      <button
                        onClick={() => downloadXML(tx.reference)}
                        className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"
                        title="Télécharger XML ISO 20022"
                      >
                        <FaDownload size={10} /> XML
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
            >
              <FaChevronLeft />
            </button>
            <span className="px-4 py-1 text-white">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default History