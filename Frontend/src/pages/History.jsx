// src/pages/History.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaSearch, FaDownload, FaFilePdf, FaFileExcel, 
  FaPrint, FaCalendarAlt, FaChevronLeft,
  FaChevronRight, FaSpinner, FaReceipt,
  FaChartLine, FaMoneyBillWave, FaBuilding,
  FaCheckCircle, FaClock, FaTimes, FaFilter,
  FaArrowUp, FaArrowDown, FaWallet, FaEye,
  FaPiggyBank, FaLock, FaHourglassHalf,
  FaCoins, FaPercentage
} from 'react-icons/fa'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Layout from '../components/Layout'

function History({ user }) {
  const [transactions, setTransactions] = useState([])
  const [investments, setInvestments] = useState([])
  const [savingsTransactions, setSavingsTransactions] = useState([])
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    fetchAllHistory()
  }, [page, dateRange])

  // ✅ Récupérer toutes les transactions (transferts + investissements + épargnes)
  const fetchAllHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      
      // 1. Récupérer les transactions du wallet
      let url = `/api/wallet/history?limit=50&offset=${(page-1)*50}`
      if (dateRange.start) url += `&startDate=${dateRange.start}`
      if (dateRange.end) url += `&endDate=${dateRange.end}`
      
      const txResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const walletTransactions = txResponse.data.transactions || []
      setTransactions(walletTransactions)
      setTotal(txResponse.data.total || 0)
      
      // 2. Récupérer les investissements
      let investmentsData = []
      try {
        const invResponse = await axios.get('/api/investment/my-investments', {
          headers: { Authorization: `Bearer ${token}` }
        })
        investmentsData = invResponse.data.data || invResponse.data || []
        setInvestments(investmentsData)
      } catch (invError) {
        console.log('ℹ️ Aucun investissement trouvé:', invError.message)
      }
      
      // 3. Récupérer les transactions d'épargne
      let savingsData = []
      try {
        const savingsResponse = await axios.get('/api/savings/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        savingsData = savingsResponse.data.data || []
        setSavingsTransactions(savingsData)
      } catch (savError) {
        console.log('ℹ️ Aucune transaction d\'épargne trouvée:', savError.message)
      }
      
      // 4. Récupérer les demandes de retrait d'épargne
      let withdrawalData = []
      try {
        const withdrawalResponse = await axios.get('/api/savings/withdrawal-requests', {
          headers: { Authorization: `Bearer ${token}` }
        })
        withdrawalData = withdrawalResponse.data.data || []
        setWithdrawalRequests(withdrawalData)
      } catch (wrError) {
        console.log('ℹ️ Aucune demande de retrait trouvée:', wrError.message)
      }
      
      // 5. Fusionner toutes les listes
      const merged = [
        // Transferts
        ...walletTransactions.map(tx => ({
          ...tx,
          item_type: 'transaction',
          item_date: tx.created_at,
          type_label: getTransactionTypeLabel(tx.transaction_type),
          status_label: getStatusLabel(tx.status)
        })),
        
        // Investissements
        ...investmentsData.map(inv => ({
          id: `inv-${inv.id}`,
          reference: `INV-${inv.id}`,
          amount: inv.amount,
          fee: 0,
          net_amount: inv.amount,
          status: inv.status || 'active',
          status_label: getInvestmentStatusLabel(inv.status),
          description: `Investissement dans ${inv.company_name || 'entreprise'}`,
          created_at: inv.created_at,
          sender_phone: user?.phone,
          receiver_phone: inv.company_phone,
          receiver_name: inv.company_name,
          sender_name: user?.fullname,
          shares: inv.shares,
          share_price: inv.share_price,
          company_id: inv.company_id,
          company_name: inv.company_name,
          company_sector: inv.sector,
          item_type: 'investment',
          item_date: inv.created_at,
          type_label: 'Investissement'
        })),
        
        // Transactions d'épargne (dépôts, retraits, intérêts)
        ...savingsData.map(st => ({
          id: `sav-${st.id}`,
          reference: st.reference || `SAV-${st.id}`,
          amount: st.amount,
          fee: st.fee || 0,
          net_amount: st.net_amount || st.amount,
          status: st.status || 'completed',
          status_label: getStatusLabel(st.status),
          description: getSavingsDescription(st),
          created_at: st.created_at,
          sender_phone: user?.phone,
          receiver_phone: null,
          receiver_name: st.savings_name || 'Épargne',
          sender_name: user?.fullname,
          savings_id: st.savings_id,
          savings_name: st.savings_name,
          savings_type: st.savings_type,
          balance_before: st.balance_before,
          balance_after: st.balance_after,
          transaction_type: st.type,
          item_type: 'savings',
          item_date: st.created_at,
          type_label: getSavingsTypeLabel(st.type)
        })),
        
        // Demandes de retrait d'épargne
        ...withdrawalData.map(wr => ({
          id: `wdr-${wr.id}`,
          reference: `WDR-${wr.id}`,
          amount: wr.amount,
          fee: wr.fee || 0,
          net_amount: wr.net_amount || wr.amount,
          status: wr.status || 'pending',
          status_label: getStatusLabel(wr.status),
          description: `Demande de retrait - ${wr.savings_name || 'Épargne'}`,
          created_at: wr.requested_at,
          sender_phone: user?.phone,
          receiver_phone: null,
          receiver_name: wr.savings_name || 'Épargne',
          sender_name: user?.fullname,
          savings_id: wr.savings_id,
          savings_name: wr.savings_name,
          admin_comment: wr.admin_comment,
          item_type: 'savings_request',
          item_date: wr.requested_at,
          type_label: 'Demande retrait'
        }))
      ]
      
      // Trier par date décroissante
      merged.sort((a, b) => new Date(b.item_date) - new Date(a.item_date))
      setAllTransactions(merged)
      
    } catch (error) {
      console.error('Erreur chargement historique:', error)
      toast.error('Erreur lors du chargement de l\'historique')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Labels
  const getTransactionTypeLabel = (type) => {
    const labels = {
      'transfer': 'Transfert',
      'deposit': 'Dépôt',
      'withdrawal': 'Retrait',
      'bill_payment': 'Paiement',
      'investments': 'Investissement',
      'bus_booking': 'Bus',
      'fee_collection': 'Frais',
      'tax_payment': 'Taxe',
      'refund': 'Remboursement',
      'travel_payment': 'Voyage'
    }
    return labels[type] || type || 'Transaction'
  }

  const getSavingsTypeLabel = (type) => {
    const labels = {
      'deposit': 'Dépôt épargne',
      'withdrawal': 'Retrait épargne',
      'interest': 'Intérêts',
      'penalty': 'Pénalité'
    }
    return labels[type] || 'Épargne'
  }

  const getSavingsDescription = (st) => {
    const type = st.type
    const name = st.savings_name || 'Épargne'
    if (type === 'deposit') return `Dépôt dans "${name}"`
    if (type === 'withdrawal') return `Retrait de "${name}"`
    if (type === 'interest') return `Intérêts sur "${name}"`
    return `Transaction "${name}"`
  }

  const getInvestmentStatusLabel = (status) => {
    const labels = {
      'active': 'Actif',
      'pending': 'En attente',
      'completed': 'Complété',
      'cancelled': 'Annulé'
    }
    return labels[status] || 'Actif'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'completed': 'Complété',
      'pending': 'En attente',
      'failed': 'Échoué',
      'cancelled': 'Annulé',
      'active': 'Actif',
      'approved': 'Approuvé',
      'rejected': 'Rejeté'
    }
    return labels[status] || status || 'Complété'
  }

  // ✅ Télécharger XML
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

  // ✅ Couleurs et icônes par type
  const getItemColors = (item) => {
    if (item.item_type === 'investment') {
      return {
        bg: 'bg-gradient-to-r from-green-500/10 to-green-500/5',
        border: 'border-green-500/20',
        icon: 'bg-green-500/20 text-green-400',
        text: 'text-green-400'
      }
    }
    if (item.item_type === 'savings') {
      if (item.transaction_type === 'deposit') {
        return {
          bg: 'bg-gradient-to-r from-purple-500/10 to-purple-500/5',
          border: 'border-purple-500/20',
          icon: 'bg-purple-500/20 text-purple-400',
          text: 'text-purple-400'
        }
      }
      return {
        bg: 'bg-gradient-to-r from-green-500/10 to-green-500/5',
        border: 'border-green-500/20',
        icon: 'bg-green-500/20 text-green-400',
        text: 'text-green-400'
      }
    }
    if (item.item_type === 'savings_request') {
      return {
        bg: 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5',
        border: 'border-yellow-500/20',
        icon: 'bg-yellow-500/20 text-yellow-400',
        text: 'text-yellow-400'
      }
    }
    if (item.sender_phone === user?.phone) {
      return {
        bg: 'bg-white/5',
        border: '',
        icon: 'bg-red-500/20 text-red-400',
        text: 'text-red-400'
      }
    }
    return {
      bg: 'bg-white/5',
      border: '',
      icon: 'bg-blue-500/20 text-blue-400',
      text: 'text-blue-400'
    }
  }

  const getItemIcon = (item) => {
    if (item.item_type === 'investment') return <FaChartLine />
    if (item.item_type === 'savings') {
      if (item.transaction_type === 'deposit') return <FaArrowUp />
      if (item.transaction_type === 'withdrawal') return <FaArrowDown />
      if (item.transaction_type === 'interest') return <FaCoins />
      return <FaPiggyBank />
    }
    if (item.item_type === 'savings_request') return <FaHourglassHalf />
    if (item.sender_phone === user?.phone) return <FaArrowUp />
    return <FaArrowDown />
  }

  const getAmountSign = (item) => {
    if (item.item_type === 'investment') return '-'
    if (item.item_type === 'savings') {
      if (item.transaction_type === 'deposit') return '-'
      return '+'
    }
    if (item.item_type === 'savings_request') return '⏳'
    return item.sender_phone === user?.phone ? '-' : '+'
  }

  // ✅ Générer le reçu PDF (transfert, investissement ou épargne)
  const generateReceiptPDF = async (item) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      const isInvestment = item.item_type === 'investment'
      const isSavings = item.item_type === 'savings' || item.item_type === 'savings_request'
      
      // En-tête
      doc.setFillColor(10, 47, 108)
      doc.rect(0, 0, pageWidth, 45, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('AlkherPay', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        isInvestment ? 'Reçu d\'investissement' : 
        isSavings ? 'Reçu d\'épargne' : 
        'Reçu de transaction',
        pageWidth / 2, 32, { align: 'center' }
      )
      
      // Corps
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
      doc.text(item.reference || '-', 75, y)
      y += 8
      
      doc.text('DATE', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(formatDateTime(item.created_at), 75, y)
      y += 8
      
      doc.text('TYPE', 20, y)
      doc.setTextColor(
        isInvestment ? 76 : isSavings ? 139 : 33, 
        isInvestment ? 175 : isSavings ? 92 : 150, 
        isInvestment ? 80 : isSavings ? 246 : 243
      )
      doc.setFont('helvetica', 'bold')
      doc.text(
        isInvestment ? 'INVESTISSEMENT' : isSavings ? 'ÉPARGNE' : 'TRANSFERT', 
        75, y
      )
      y += 8
      
      doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'normal')
      doc.text('STATUT', 20, y)
      doc.setTextColor(76, 175, 80)
      doc.setFont('helvetica', 'bold')
      doc.text(item.status_label?.toUpperCase() || 'COMPLÉTÉ', 75, y)
      y += 15
      
      // Parties prenantes
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
      
      doc.text('UTILISATEUR', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text((item.sender_name || user?.fullname || 'N/A').substring(0, 30), 75, y)
      y += 8
      
      doc.text('TÉLÉPHONE', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text((item.sender_phone || user?.phone || 'N/A' ).substring(0, 30), 75, y)
      y += 12
      
      doc.text(
        isInvestment ? 'ENTREPRISE' : isSavings ? 'ÉPARGNE' : 'DESTINATAIRE', 
        20, y
      )
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(
        (item.receiver_name || item.company_name || item.savings_name || 'N/A').substring(0, 30), 
        75, y
      )
      y += 15
      
      // Montants
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
      
      doc.text('MONTANT', 20, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(formatAmount(item.amount), 75, y)
      y += 8
      
      if (item.fee > 0) {
        doc.text('FRAIS', 20, y)
        doc.setTextColor(255, 152, 0)
        doc.setFont('helvetica', 'bold')
        doc.text(formatAmount(item.fee), 75, y)
        y += 8
        
        doc.setTextColor(80, 80, 80)
        doc.setFont('helvetica', 'normal')
        doc.text('NET', 20, y)
        doc.setTextColor(10, 47, 108)
        doc.setFont('helvetica', 'bold')
        doc.text(formatAmount(item.net_amount || item.amount), 75, y)
        y += 8
      }
      
      if (isInvestment) {
        if (item.shares) {
          doc.setTextColor(80, 80, 80)
          doc.setFont('helvetica', 'normal')
          doc.text('NOMBRE D\'ACTIONS', 20, y)
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'bold')
          doc.text(`${item.shares}`, 75, y)
          y += 8
        }
        
        if (item.share_price) {
          doc.setTextColor(80, 80, 80)
          doc.setFont('helvetica', 'normal')
          doc.text('PRIX PAR ACTION', 20, y)
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'bold')
          doc.text(formatAmount(item.share_price), 75, y)
          y += 8
        }
      }
      
      if (isSavings && item.balance_after) {
        doc.setTextColor(80, 80, 80)
        doc.setFont('helvetica', 'normal')
        doc.text('SOLDE APRÈS', 20, y)
        doc.setTextColor(10, 47, 108)
        doc.setFont('helvetica', 'bold')
        doc.text(formatAmount(item.balance_after), 75, y)
        y += 8
      }
      
      // Pied de page
      const footerY = pageHeight - 50
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(14, footerY, pageWidth - 28, 40, 5, 5, 'F')
      
      doc.setTextColor(10, 47, 108)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Merci d\'utiliser AlkherPay', pageWidth / 2, footerY + 12, { align: 'center' })
      
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Service client: 62 78 73 07 |supportalkher@gmail.com', pageWidth / 2, footerY + 22, { align: 'center' })
      doc.text('© 2026 AlkherPay - GOUROUSDJA', pageWidth / 2, footerY + 32, { align: 'center' })
      
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      
      doc.save(`recu_${item.reference || 'transaction'}.pdf`)
      toast.success('Reçu téléchargé avec succès')
      
    } catch (error) {
      console.error('Erreur génération reçu:', error)
      toast.error('Erreur lors de la génération du reçu')
    }
  }

  // ✅ Générer le PDF d'historique
  const generatePDF = async () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      const filtered = getFilteredItems()
      
      // En-tête
      doc.setFillColor(10, 47, 108)
      doc.rect(0, 0, 210, 45, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('AlkherPay', 105, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Historique complet des transactions', 105, 32, { align: 'center' })
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
      
      const tableData = filtered.map(item => [
        item.reference || '-',
        formatDateShort(item.created_at),
        item.item_type === 'investment' ? 'INVESTISSEMENT' : 
        (item.item_type === 'savings' || item.item_type === 'savings_request') ? 'ÉPARGNE' : 
        'TRANSFERT',
        item.item_type === 'investment' 
          ? (item.company_name || 'N/A')
          : (item.item_type === 'savings' || item.item_type === 'savings_request')
            ? (item.savings_name || 'Épargne')
            : (item.sender_phone === user?.phone 
                ? (item.receiver_name || item.receiver_phone) 
                : (item.sender_name || item.sender_phone)),
        formatAmountNumber(item.amount),
        item.fee > 0 ? formatAmountNumber(item.fee) : '-',
        formatAmountNumber(item.net_amount || item.amount),
        item.status_label || 'COMPLETE'
      ])
      
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
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 32, halign: 'left' },
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
      
      const totalSent = filtered.filter(t => 
        t.item_type === 'transaction' && t.sender_phone === user?.phone
      ).reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalReceived = filtered.filter(t => 
        t.item_type === 'transaction' && t.receiver_phone === user?.phone
      ).reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalInvested = filtered.filter(t => 
        t.item_type === 'investment'
      ).reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalSavings = filtered.filter(t => 
        t.item_type === 'savings' && t.transaction_type === 'deposit'
      ).reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalFees = filtered.reduce((sum, t) => sum + (t.fee || 0), 0)
      
      doc.text(`Total envoyé: ${formatAmountNumber(totalSent)}`, 14, finalY + 10)
      doc.text(`Total reçu: ${formatAmountNumber(totalReceived)}`, 14, finalY + 18)
      doc.text(`Total investi: ${formatAmountNumber(totalInvested)}`, 14, finalY + 26)
      doc.text(`Total épargné: ${formatAmountNumber(totalSavings)}`, 14, finalY + 34)
      doc.text(`Total frais: ${formatAmountNumber(totalFees)}`, 14, finalY + 42)
      doc.text(`Nombre de transactions: ${filtered.length}`, 14, finalY + 50)
      
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `AlkherPay - Page ${i} sur ${pageCount} - Service client: 62 78 73 07`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }
      
      doc.save(`historique_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setExporting(false)
    }
  }

  // ✅ Export CSV
  const exportToCSV = () => {
    try {
      const filtered = getFilteredItems()
      const headers = ['Référence', 'Date', 'Type', 'Partenaire', 'Montant', 'Frais', 'Net', 'Statut', 'Description']
      const rows = filtered.map(item => [
        item.reference || '',
        formatDateTime(item.created_at),
        item.item_type === 'investment' ? 'Investissement' : 
        (item.item_type === 'savings' || item.item_type === 'savings_request') ? 'Épargne' : 
        'Transfert',
        item.item_type === 'investment' 
          ? item.company_name 
          : (item.item_type === 'savings' || item.item_type === 'savings_request')
            ? item.savings_name
            : (item.sender_phone === user?.phone ? item.receiver_name : item.sender_name),
        item.amount,
        item.fee || 0,
        item.net_amount || item.amount,
        item.status_label || 'Complété',
        item.description || ''
      ])
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
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

  // ✅ Imprimer
  const printHistory = () => {
    const filtered = getFilteredItems()
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>AlkherPay - Historique</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #1e3a8a; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .investment { background-color: #f0fdf4; }
            .savings { background-color: #faf5ff; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; }
            .badge-inv { background: #dcfce7; color: #166534; }
            .badge-tx { background: #dbeafe; color: #1e40af; }
            .badge-sav { background: #fae8ff; color: #86198f; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">AlkherPay</div>
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
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(item => `
                <tr class="${item.item_type === 'investment' ? 'investment' : (item.item_type === 'savings' ? 'savings' : '')}">
                  <td>${item.reference || '-'}</td>
                  <td>${formatDateTime(item.created_at)}</td>
                  <td>
                    <span class="badge ${item.item_type === 'investment' ? 'badge-inv' : (item.item_type === 'savings' || item.item_type === 'savings_request' ? 'badge-sav' : 'badge-tx')}">
                      ${item.item_type === 'investment' ? 'Investissement' : (item.item_type === 'savings' || item.item_type === 'savings_request' ? 'Épargne' : 'Transfert')}
                    </span>
                  </td>
                  <td>${item.item_type === 'investment' 
                    ? item.company_name 
                    : (item.item_type === 'savings' || item.item_type === 'savings_request')
                      ? item.savings_name
                      : (item.sender_phone === user?.phone ? item.receiver_name : item.sender_name)}</td>
                  <td>${formatAmount(item.amount)}</td>
                  <td>${item.status_label || 'Complété'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>AlkherPay - Service client: 62 78 73 07</p>
          </div>
        </body>
      </html>
    `)
    printWindow.print()
    printWindow.close()
  }

  // ✅ Filtrer les éléments
  const getFilteredItems = () => {
    let filtered = allTransactions

    // Filtrer par type
    if (filter === 'sent') {
      filtered = filtered.filter(t => 
        t.item_type === 'transaction' && t.sender_phone === user?.phone
      )
    } else if (filter === 'received') {
      filtered = filtered.filter(t => 
        t.item_type === 'transaction' && t.receiver_phone === user?.phone
      )
    } else if (filter === 'investments') {
      filtered = filtered.filter(t => t.item_type === 'investment')
    } else if (filter === 'transactions') {
      filtered = filtered.filter(t => t.item_type === 'transaction')
    } else if (filter === 'savings') {
      filtered = filtered.filter(t => 
        t.item_type === 'savings' || t.item_type === 'savings_request'
      )
    }

    // Filtrer par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.reference?.toLowerCase().includes(search) ||
        t.sender_name?.toLowerCase().includes(search) ||
        t.receiver_name?.toLowerCase().includes(search) ||
        t.company_name?.toLowerCase().includes(search) ||
        t.savings_name?.toLowerCase().includes(search) ||
        t.sender_phone?.includes(search) ||
        t.receiver_phone?.includes(search)
      )
    }

    return filtered
  }

  const filteredItems = getFilteredItems()

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

  const getStatusBadge = (status, itemType) => {
    if (itemType === 'investment') {
      const colors = {
        active: 'bg-green-500/20 text-green-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        completed: 'bg-blue-500/20 text-blue-400',
        cancelled: 'bg-red-500/20 text-red-400'
      }
      return colors[status] || 'bg-green-500/20 text-green-400'
    }
    
    if (itemType === 'savings' || itemType === 'savings_request') {
      const colors = {
        completed: 'bg-green-500/20 text-green-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        approved: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400'
      }
      return colors[status] || 'bg-purple-500/20 text-purple-400'
    }
    
    const colors = {
      completed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  // ✅ Statistiques
  const stats = {
    totalSent: allTransactions.filter(t => 
      t.item_type === 'transaction' && t.sender_phone === user?.phone
    ).reduce((sum, t) => sum + (t.amount || 0), 0),
    totalReceived: allTransactions.filter(t => 
      t.item_type === 'transaction' && t.receiver_phone === user?.phone
    ).reduce((sum, t) => sum + (t.amount || 0), 0),
    totalInvested: allTransactions.filter(t => 
      t.item_type === 'investment'
    ).reduce((sum, t) => sum + (t.amount || 0), 0),
    totalSavingsDeposits: allTransactions.filter(t => 
      t.item_type === 'savings' && t.transaction_type === 'deposit'
    ).reduce((sum, t) => sum + (t.amount || 0), 0),
    totalSavingsWithdrawals: allTransactions.filter(t => 
      t.item_type === 'savings' && t.transaction_type === 'withdrawal'
    ).reduce((sum, t) => sum + (t.amount || 0), 0),
    totalFees: allTransactions.reduce((sum, t) => sum + (t.fee || 0), 0),
    countInvestments: allTransactions.filter(t => t.item_type === 'investment').length,
    countTransactions: allTransactions.filter(t => t.item_type === 'transaction').length,
    countSavings: allTransactions.filter(t => t.item_type === 'savings').length
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <Layout user={user}>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Historique</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchAllHistory}
              className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all flex items-center gap-2"
            >
              🔄 Actualiser
            </button>
          </div>
        </div>

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
                placeholder="Rechercher par référence, nom, entreprise..."
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaWallet /> Tous
            </button>
            <button
              onClick={() => setFilter('transactions')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaMoneyBillWave /> Transferts
            </button>
            <button
              onClick={() => setFilter('investments')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'investments' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaChartLine /> Investissements
            </button>
            <button
              onClick={() => setFilter('savings')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'savings' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaPiggyBank /> Épargnes
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'sent' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaArrowUp /> Envoyés
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'received' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <FaArrowDown /> Reçus
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total envoyé</p>
            <p className="text-red-400 font-bold text-sm">
              {formatAmount(stats.totalSent)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total reçu</p>
            <p className="text-green-400 font-bold text-sm">
              {formatAmount(stats.totalReceived)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total investi</p>
            <p className="text-green-400 font-bold text-sm">
              {formatAmount(stats.totalInvested)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total épargné</p>
            <p className="text-purple-400 font-bold text-sm">
              {formatAmount(stats.totalSavingsDeposits)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Total frais</p>
            <p className="text-yellow-400 font-bold text-sm">
              {formatAmount(stats.totalFees)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs">Transactions</p>
            <p className="text-white font-bold text-sm">
              {stats.countTransactions + stats.countInvestments + stats.countSavings}
            </p>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="text-white text-3xl animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <FaReceipt className="text-white/20 text-5xl mx-auto mb-3" />
            <p className="text-white/50">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const colors = getItemColors(item)
              
              return (
                <div
                  key={`${item.item_type}-${item.id}`}
                  className={`rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer ${colors.bg} ${colors.border} border`}
                  onClick={() => {
                    setSelectedItem(item)
                    setShowDetailModal(true)
                  }}
                >
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icône */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                        {getItemIcon(item)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(item.status, item.item_type)}`}>
                            {item.type_label}
                          </span>
                          <span className="text-white/40 text-xs font-mono">{item.reference}</span>
                        </div>
                        
                        <p className="text-white font-medium">
                          {item.item_type === 'investment' ? (
                            <>
                              Investissement dans <span className="text-green-300">{item.company_name}</span>
                            </>
                          ) : item.item_type === 'savings' || item.item_type === 'savings_request' ? (
                            <>{item.description || `Épargne: ${item.savings_name}`}</>
                          ) : item.sender_phone === user?.phone ? (
                            <>Envoi à <span className="text-blue-300">{item.receiver_name || item.receiver_phone}</span></>
                          ) : (
                            <>Réception de <span className="text-green-300">{item.sender_name || item.sender_phone}</span></>
                          )}
                        </p>
                        
                        <p className="text-white/40 text-sm">
                          {formatDate(item.created_at)}
                        </p>
                        
                        {item.item_type === 'investment' && item.shares && (
                          <p className="text-green-400/80 text-sm mt-1">
                            {item.shares} action(s) × {formatAmount(item.share_price)}
                          </p>
                        )}
                        
                        {(item.item_type === 'savings' || item.item_type === 'savings_request') && (
                          <p className="text-purple-400/80 text-sm mt-1">
                            {item.savings_type === 'term' ? '🔒 À terme' : '💰 Simple'}
                            {item.balance_after && ` • Solde: ${formatAmount(item.balance_after)}`}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-lg ${colors.text}`}>
                        {getAmountSign(item)}{formatAmount(item.amount)}
                      </p>
                      
                      {item.fee > 0 && (
                        <p className="text-white/30 text-xs">Frais: {formatAmount(item.fee)}</p>
                      )}
                      
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            generateReceiptPDF(item)
                          }}
                          className="text-green-400 text-xs hover:text-green-300 flex items-center gap-1"
                          title="Télécharger le reçu"
                        >
                          <FaFilePdf size={12} /> Reçu
                        </button>
                        {item.item_type === 'transaction' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadXML(item.reference)
                            }}
                            className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"
                            title="Télécharger XML"
                          >
                            <FaDownload size={10} /> XML
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* Modal Détails */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className={`p-4 rounded-t-2xl flex justify-between items-center ${
              selectedItem.item_type === 'investment'
                ? 'bg-gradient-to-r from-green-600 to-green-700'
                : selectedItem.item_type === 'savings' || selectedItem.item_type === 'savings_request'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700'
            }`}>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedItem.item_type === 'investment' ? (
                  <><FaChartLine /> Détails de l'investissement</>
                ) : selectedItem.item_type === 'savings' || selectedItem.item_type === 'savings_request' ? (
                  <><FaPiggyBank /> Détails de l'épargne</>
                ) : (
                  <><FaReceipt /> Détails de la transaction</>
                )}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">
                  {selectedItem.item_type === 'investment' ? '📈' : 
                   selectedItem.item_type === 'savings' ? '🐷' : 
                   selectedItem.item_type === 'savings_request' ? '⏳' : '✅'}
                </div>
                <p className={`text-3xl font-bold ${getItemColors(selectedItem).text}`}>
                  {formatAmount(selectedItem.amount)}
                </p>
                <p className="text-white/50 text-sm font-mono mt-1">
                  {selectedItem.reference}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/50">Date</span>
                  <span className="text-white font-medium text-sm">
                    {formatDateTime(selectedItem.created_at)}
                  </span>
                </div>
                
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/50">Type</span>
                  <span className={`font-medium ${getItemColors(selectedItem).text}`}>
                    {selectedItem.type_label}
                  </span>
                </div>
                
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/50">Statut</span>
                  <span className={`font-medium ${getStatusBadge(selectedItem.status, selectedItem.item_type)} px-2 py-1 rounded-full text-xs`}>
                    {selectedItem.status_label}
                  </span>
                </div>

                {selectedItem.item_type === 'investment' && (
                  <>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/50">Entreprise</span>
                      <span className="text-green-300 font-medium">{selectedItem.company_name}</span>
                    </div>
                    {selectedItem.shares && (
                      <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-white/50">Actions</span>
                        <span className="text-white font-medium">{selectedItem.shares}</span>
                      </div>
                    )}
                    {selectedItem.share_price && (
                      <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-white/50">Prix unitaire</span>
                        <span className="text-white font-medium">{formatAmount(selectedItem.share_price)}</span>
                      </div>
                    )}
                  </>
                )}

                {(selectedItem.item_type === 'savings' || selectedItem.item_type === 'savings_request') && (
                  <>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/50">Épargne</span>
                      <span className="text-purple-300 font-medium">{selectedItem.savings_name}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/50">Type d'épargne</span>
                      <span className="text-white font-medium">
                        {selectedItem.savings_type === 'term' ? '🔒 À terme' : '💰 Simple'}
                      </span>
                    </div>
                    {selectedItem.balance_after && (
                      <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-white/50">Nouveau solde</span>
                        <span className="text-green-400 font-medium">{formatAmount(selectedItem.balance_after)}</span>
                      </div>
                    )}
                    {selectedItem.admin_comment && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <span className="text-white/50 text-sm">Commentaire admin</span>
                        <p className="text-white mt-1">{selectedItem.admin_comment}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedItem.item_type === 'transaction' && (
                  <>
                    <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/50">
                        {selectedItem.sender_phone === user?.phone ? 'Destinataire' : 'Expéditeur'}
                      </span>
                      <span className="text-white font-medium">
                        {selectedItem.sender_phone === user?.phone 
                          ? (selectedItem.receiver_name || selectedItem.receiver_phone)
                          : (selectedItem.sender_name || selectedItem.sender_phone)
                        }
                      </span>
                    </div>
                    {selectedItem.description && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <span className="text-white/50 text-sm">Description</span>
                        <p className="text-white mt-1">{selectedItem.description}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedItem.fee > 0 && (
                  <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white/50">Frais</span>
                    <span className="text-yellow-400 font-medium">{formatAmount(selectedItem.fee)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => generateReceiptPDF(selectedItem)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2"
                >
                  <FaFilePdf /> Télécharger le reçu
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 bg-white/10 text-white py-2.5 rounded-lg hover:bg-white/20 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default History