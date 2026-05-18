// src/components/TransactionCard.jsx
import React, { useState } from 'react'
import { FaDownload, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import axios from 'axios'
import toast from 'react-hot-toast'

function TransactionCard({ transaction, currentUserPhone }) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isSent = transaction.sender_phone === currentUserPhone
  const amount = transaction.amount
  const fee = transaction.fee || 0
  const total = isSent ? amount + fee : amount

  const formatAmount = (amount) => {
    return amount.toLocaleString() + ' FCFA'
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (days === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  }

  const getStatusBadge = () => {
    const status = transaction.status
    const colors = {
      completed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400'
    }
    return colors[status] || colors.completed
  }

  const getStatusText = () => {
    const status = transaction.status
    const texts = {
      completed: 'Complété',
      pending: 'En attente',
      failed: 'Échoué',
      cancelled: 'Annulé'
    }
    return texts[status] || 'Complété'
  }

  const downloadXML = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/transaction/${transaction.reference}/xml`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `transaction_${transaction.reference}.xml`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Fichier XML téléchargé')
    } catch (error) {
      console.error('Erreur téléchargement:', error)
      toast.error('Erreur lors du téléchargement')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-xl hover:bg-white/10 transition-all">
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Avatar & Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isSent ? 'bg-red-500/20' : 'bg-green-500/20'
            }`}>
              <span className="text-xl">
                {isSent ? '📤' : '📥'}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {isSent 
                  ? transaction.receiver_name || transaction.receiver_phone
                  : transaction.sender_name || transaction.sender_phone
                }
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge()}`}>
                  {getStatusText()}
                </span>
                <span className="text-white/30 text-xs">{formatDate(transaction.created_at)}</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Amount */}
          <div className="text-right">
            <p className={`font-bold ${isSent ? 'text-red-400' : 'text-green-400'}`}>
              {isSent ? '-' : '+'}{formatAmount(amount)}
            </p>
            {fee > 0 && (
              <p className="text-white/30 text-xs">Frais: {formatAmount(fee)}</p>
            )}
          </div>
          
          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-3 text-white/40 hover:text-white"
          >
            {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>
        </div>
        
        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-white/40 text-xs">Référence</p>
                <p className="text-white/70 text-xs font-mono">{transaction.reference}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Type</p>
                <p className="text-white/70 text-xs">{transaction.type_label || transaction.type}</p>
              </div>
              {isSent && fee > 0 && (
                <div>
                  <p className="text-white/40 text-xs">Total débité</p>
                  <p className="text-white/70 text-xs">{formatAmount(amount + fee)}</p>
                </div>
              )}
              {transaction.description && (
                <div className="col-span-2">
                  <p className="text-white/40 text-xs">Description</p>
                  <p className="text-white/70 text-xs">{transaction.description}</p>
                </div>
              )}
              <div className="col-span-2 mt-2">
                <button
                  onClick={downloadXML}
                  disabled={downloading}
                  className="flex items-center gap-2 text-blue-400 text-xs hover:text-blue-300 transition-colors"
                >
                  <FaDownload size={12} />
                  {downloading ? 'Téléchargement...' : 'Télécharger XML ISO 20022'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionCard