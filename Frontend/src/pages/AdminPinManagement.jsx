// src/components/AdminPinManagement.jsx
import React, { useState, useEffect } from 'react'
import { FaUsers, FaKey, FaCheckCircle, FaSync, FaTimes, FaSpinner } from 'react-icons/fa'
import axios from 'axios'
import toast from 'react-hot-toast'

function AdminPinManagement() {
  const [users, setUsers] = useState([])
  const [resetRequests, setResetRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      
      if (activeTab === 'users') {
        const response = await axios.get('/api/admin/users-without-pin', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUsers(response.data.users || [])
      } else {
        const response = await axios.get('/api/admin/pin-reset-requests', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setResetRequests(response.data.requests || [])
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const resetUserPin = async (userId, userName) => {
    if (!window.confirm(`Réinitialiser le PIN de ${userName} ?`)) return
    
    setProcessingId(userId)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/reset-user-pin/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(`PIN de ${userName} réinitialisé avec succès`)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la réinitialisation')
    } finally {
      setProcessingId(null)
    }
  }

  // Spinner CSS personnalisé (remplace FaSpinner)
  const Spinner = () => (
    <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  if (activeTab === 'users') {
    return (
      <div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('users')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            <FaUsers className="inline mr-2" size={14} />
            Utilisateurs sans PIN
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
          >
            <FaKey className="inline mr-2" size={14} />
            Demandes réinitialisation
          </button>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <FaCheckCircle className="text-green-400 text-5xl mx-auto mb-3" />
            <p className="text-white/50">Tous les utilisateurs ont un PIN défini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead className="border-b border-white/20">
                <tr className="text-left text-white/60">
                  <th className="pb-3">Nom</th>
                  <th className="pb-3">Téléphone</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-white/10">
                    <td className="py-3">{user.fullname}</td>
                    <td className="py-3">{user.phone}</td>
                    <td className="py-3">
                      <button
                        onClick={() => resetUserPin(user.id, user.fullname)}
                        disabled={processingId === user.id}
                        className="px-3 py-1 rounded text-sm bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 flex items-center gap-1 disabled:opacity-50"
                      >
                        {processingId === user.id ? (
                          <Spinner />
                        ) : (
                          <FaSync size={12} />
                        )}
                        Réinitialiser PIN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('users')}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
        >
          <FaUsers className="inline mr-2" size={14} />
          Utilisateurs sans PIN
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          <FaKey className="inline mr-2" size={14} />
          Demandes réinitialisation
        </button>
      </div>

      {resetRequests.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <FaCheckCircle className="text-green-400 text-5xl mx-auto mb-3" />
          <p className="text-white/50">Aucune demande de réinitialisation en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resetRequests.map(request => (
            <div key={request.id} className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">{request.fullname}</p>
                  <p className="text-white/60 text-sm">{request.phone}</p>
                  <p className="text-white/40 text-xs mt-1">
                    Demande le: {new Date(request.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => resetUserPin(request.user_id, request.fullname)}
                  disabled={processingId === request.user_id}
                  className="px-3 py-1 rounded text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 flex items-center gap-1 disabled:opacity-50"
                >
                  {processingId === request.user_id ? <Spinner /> : <FaSync size={12} />}
                  Réinitialiser PIN
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPinManagement