import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaSearch, FaDownload, FaFilter } from 'react-icons/fa'
import Layout from '../components/Layout'

function History({ user }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchTransactions()
  }, [page, filter])

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/wallet/history?limit=20&offset=${(page-1)*20}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTransactions(response.data.transactions)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Erreur chargement historique:', error)
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
    } catch (error) {
      console.error('Erreur téléchargement XML:', error)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'sent') return tx.sender_phone === user.phone
    if (filter === 'received') return tx.receiver_phone === user.phone
    return true
  }).filter(tx => {
    if (!searchTerm) return true
    return tx.reference.includes(searchTerm) ||
           tx.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tx.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount) => {
    return amount.toLocaleString() + ' FCFA'
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

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Rechercher..."
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
        </div>

        {/* Liste des transactions */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status_label}
                      </span>
                      <span className="text-white/40 text-xs">{tx.reference}</span>
                    </div>
                    <p className="text-white font-medium">
                      {tx.sender_phone === user.phone ? (
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
                      tx.sender_phone === user.phone ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {tx.sender_phone === user.phone ? '-' : '+'}{formatAmount(tx.amount)}
                    </p>
                    {tx.fee > 0 && (
                      <p className="text-white/30 text-xs">Frais: {formatAmount(tx.fee)}</p>
                    )}
                    <button
                      onClick={() => downloadXML(tx.reference)}
                      className="text-blue-400 text-xs hover:text-blue-300 mt-1 flex items-center gap-1 ml-auto"
                    >
                      <FaDownload size={10} /> XML ISO 20022
                    </button>
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
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-4 py-1 text-white">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default History