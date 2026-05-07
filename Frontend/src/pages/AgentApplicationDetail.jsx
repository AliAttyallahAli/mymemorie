// src/pages/AgentApplicationDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaArrowLeft, FaUserTie, FaCheckCircle, FaTimesCircle,
  FaClock, FaDownload, FaEye, FaBuilding, FaPhone,
  FaEnvelope, FaMapMarkerAlt, FaIdCard, FaFileAlt,
  FaComment, FaCalendarAlt, FaSpinner, FaUserCheck,
  FaUserTimes, FaShieldAlt
} from 'react-icons/fa'
import Layout from '../components/Layout'

function AgentApplicationDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/agent-applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplication(response.data)
    } catch (error) {
      console.error('Erreur chargement candidature:', error)
      toast.error('Candidature non trouvée')
      navigate('/admin')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!window.confirm('Approuver cette candidature ? L\'agent sera créé automatiquement.')) return
    
    setProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/agent-applications/${id}/review`, 
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidature approuvée ! L\'agent a été créé.')
      fetchApplication()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'approbation')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison de rejet')
      return
    }
    
    setProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/agent-applications/${id}/review`, 
        { action: 'reject', rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidature rejetée')
      setShowRejectModal(false)
      fetchApplication()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  const downloadDocument = async (type) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/agent-applications/${id}/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}_${application?.fullname}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Document téléchargé')
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
    }
  }

  const getStatusBadge = () => {
    if (!application) return { color: 'bg-gray-500/20 text-gray-400', text: 'Inconnu', icon: FaClock }
    switch(application.status) {
      case 'approved':
        return { color: 'bg-green-500/20 text-green-400', text: 'Approuvé', icon: FaCheckCircle }
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente', icon: FaClock }
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400', text: 'Rejeté', icon: FaTimesCircle }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', text: 'Inconnu', icon: FaClock }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  if (!application) return null

  const status = getStatusBadge()
  const StatusIcon = status.icon

  return (
    <Layout user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <FaArrowLeft /> Retour à l'administration
        </button>

        {/* En-tête */}
        <div className="card mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full">
                <FaUserTie className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{application.fullname}</h1>
                <p className="text-white/60">{application.agency_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${status.color}`}>
                <StatusIcon size={14} /> {status.text}
              </span>
              {application.status === 'pending' && user?.role === 'admin' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg flex items-center gap-2 transition-all"
                  >
                    {processing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    Approuver
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 transition-all"
                  >
                    <FaTimesCircle /> Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <div className="card">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <FaUserTie className="text-blue-400" /> Informations personnelles
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Nom complet</span>
                <span className="text-white font-medium">{application.fullname}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Téléphone</span>
                <span className="text-white">{application.phone}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Email</span>
                <span className="text-white">{application.email || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Province</span>
                <span className="text-white">{application.province || 'Non renseignée'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Ville</span>
                <span className="text-white">{application.city || 'Non renseignée'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Date de candidature</span>
                <span className="text-white">{formatDate(application.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Informations agence */}
          <div className="card">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <FaBuilding className="text-blue-400" /> Informations de l'agence
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Nom de l'agence</span>
                <span className="text-white font-medium">{application.agency_name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Adresse</span>
                <span className="text-white">{application.agency_address}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Téléphone agence</span>
                <span className="text-white">{application.agency_phone || application.phone}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-white/60">Type d'agence</span>
                <span className="text-white">{application.agency_type === 'principale' ? 'Principale' : 'Secondaire'}</span>
              </div>
            </div>
          </div>

          {/* Documents */}
          {(application.id_card_path || application.business_license_path) && (
            <div className="card lg:col-span-2">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <FaFileAlt className="text-blue-400" /> Documents joints
              </h3>
              <div className="flex gap-4 flex-wrap">
                {application.id_card_path && (
                  <button
                    onClick={() => downloadDocument('id_card')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all"
                  >
                    <FaIdCard /> Télécharger CNI/Passeport
                  </button>
                )}
                {application.business_license_path && (
                  <button
                    onClick={() => downloadDocument('business_license')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all"
                  >
                    <FaFileAlt /> Télécharger Registre de commerce
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expérience et motivation */}
          <div className="card lg:col-span-2">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <FaComment className="text-blue-400" /> Expérience et motivation
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Expérience professionnelle</p>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/80">{application.experience || 'Non renseignée'}</p>
                </div>
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Motivation</p>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/80 whitespace-pre-wrap">{application.motivation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rejet reason */}
          {application.status === 'rejected' && application.rejection_reason && (
            <div className="card lg:col-span-2 border-red-500/30 bg-red-500/10">
              <h3 className="text-red-400 text-lg font-semibold mb-2 flex items-center gap-2">
                <FaTimesCircle className="text-red-400" /> Motif du rejet
              </h3>
              <p className="text-red-300">{application.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-md w-full bg-gradient-to-br from-red-900 to-red-800 rounded-2xl shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Rejeter la candidature</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-white/60 hover:text-white"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-white/80 mb-4">Veuillez indiquer la raison du rejet :</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field w-full"
                rows="4"
                placeholder="Motif du rejet..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {processing ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AgentApplicationDetail