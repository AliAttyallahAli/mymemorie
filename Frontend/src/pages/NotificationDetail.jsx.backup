// src/pages/NotificationDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaArrowLeft, FaBell, FaCheckCircle, FaExclamationTriangle, 
  FaInfoCircle, FaClock, FaTrash, FaDownload, FaEye,
  FaMoneyBillWave, FaExchangeAlt, FaStore, FaIdCard,
  FaUserCheck, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaSpinner, FaTimes, FaQuestionCircle
} from 'react-icons/fa'
import Layout from '../components/Layout'

function NotificationDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [relatedData, setRelatedData] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (id && id !== 'undefined' && id !== 'null') {
      fetchNotification()
    } else {
      toast.error('ID de notification invalide')
      navigate('/dashboard')
    }
  }, [id])

  const fetchNotification = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotification(response.data)
      
      if (response.data.metadata) {
        setRelatedData(response.data.metadata)
      }
    } catch (error) {
      console.error('Erreur chargement notification:', error)
      if (error.response?.status === 404) {
        toast.error('Notification non trouvée')
      } else {
        toast.error('Erreur lors du chargement de la notification')
      }
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotification(prev => ({ ...prev, is_read: true }))
      toast.success('Notification marquée comme lue')
    } catch (error) {
      console.error('Erreur marquage:', error)
    }
  }

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Notification supprimée')
      setShowDeleteModal(false)
      navigate('/dashboard')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
      setShowDeleteModal(false)
    }
  }

  const getIcon = () => {
    const title = notification?.title || ''
    if (title.includes('Transfert reçu')) return <FaExchangeAlt className="text-green-400 text-3xl" />
    if (title.includes('Transfert envoyé')) return <FaExchangeAlt className="text-blue-400 text-3xl" />
    if (title.includes('Dépôt')) return <FaStore className="text-green-400 text-3xl" />
    if (title.includes('Retrait')) return <FaMoneyBillWave className="text-yellow-400 text-3xl" />
    if (title.includes('KYC')) return <FaIdCard className="text-purple-400 text-3xl" />
    if (title.includes('Alerte')) return <FaExclamationTriangle className="text-yellow-400 text-3xl" />
    if (title.includes('Candidature')) return <FaUserCheck className="text-blue-400 text-3xl" />
    return <FaBell className="text-blue-400 text-3xl" />
  }

  const getTypeBadge = () => {
    const type = notification?.category || notification?.type || 'info'
    switch(type) {
      case 'transaction':
        return { color: 'bg-green-500/20 text-green-400', label: 'Transaction' }
      case 'kyc':
        return { color: 'bg-purple-500/20 text-purple-400', label: 'KYC' }
      case 'alert':
        return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Alerte' }
      default:
        return { color: 'bg-blue-500/20 text-blue-400', label: 'Information' }
    }
  }

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

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="text-white text-4xl animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!notification) return null

  const typeBadge = getTypeBadge()

  return (
    <Layout user={user}>
      <div className="max-w-3xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <FaArrowLeft /> Retour
        </button>

        {/* Contenu principal */}
        <div className="card">
          {/* En-tête */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-full">
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{notification.title}</h1>
                  <span className={`px-2 py-1 rounded-full text-xs ${typeBadge.color}`}>
                    {typeBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-white/40 text-sm">
                    <FaClock size={12} />
                    <span>{formatDate(notification.created_at)}</span>
                  </div>
                  {notification.is_read && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <FaCheckCircle size={12} />
                      <span>Lu</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!notification.is_read && (
                <button
                  onClick={markAsRead}
                  className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                  title="Marquer comme lu"
                >
                  <FaCheckCircle />
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                title="Supprimer"
              >
                <FaTrash />
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          {/* Informations complémentaires */}
          {relatedData && Object.keys(relatedData).length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white font-semibold mb-3">Informations complémentaires</h3>
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                {Object.entries(relatedData).map(([key, value]) => (
                  <div key={key} className="flex justify-between flex-wrap gap-2">
                    <span className="text-white/60 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white text-sm font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex-1"
            >
              Retour à l'accueil
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 flex-1 py-2 rounded-lg transition-all"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Barre de couleur en haut */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
            
            <div className="text-center pt-6 pb-2">
              <div className="inline-flex p-3 bg-red-500/20 rounded-full mb-3">
                <FaQuestionCircle className="text-red-400 text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Confirmer la suppression</h2>
              <p className="text-red-200 text-sm mt-1">
                Cette action est irréversible.
              </p>
            </div>

            <div className="bg-white/10 mx-4 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{notification.title}</p>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-3 mx-4 mb-4 border border-yellow-500/30">
              <p className="text-yellow-400 text-xs flex items-center gap-2">
                <FaExclamationTriangle size={12} />
                Êtes-vous sûr de vouloir supprimer définitivement cette notification ?
              </p>
            </div>

            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 btn-secondary"
              >
                <FaTimes className="inline mr-2" /> Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <FaTrash /> Supprimer
              </button>
            </div>

            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default NotificationDetail