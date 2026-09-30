// src/components/AgentApplicationsManager.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaUsers, FaUserCheck, FaUserTimes, FaEye, FaDownload,
  FaCheckCircle, FaTimesCircle, FaClock,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding,
  FaIdCard, FaFileAlt, FaComment, FaCalendarAlt,
  FaSearch, FaChevronLeft, FaChevronRight
} from 'react-icons/fa'
// Supprimer FaSpinner pour éviter les erreurs DOM

function AgentApplicationsManager() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalApps, setTotalApps] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState(null)
  
  const itemsPerPage = 10

  useEffect(() => {
    fetchApplications()
  }, [currentPage, filter])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/agent-applications?status=${filter}&limit=${itemsPerPage}&offset=${(currentPage-1)*itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApplications(response.data.applications || [])
      setTotalPages(Math.ceil(response.data.total / itemsPerPage))
      setTotalApps(response.data.total)
    } catch (error) {
      console.error('Erreur chargement candidatures:', error)
      toast.error('Erreur lors du chargement des candidatures')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (application) => {
    setSelectedApp(application)
    setShowModal(true)
  }

  const handleApprove = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir approuver cette candidature ?')) return
    
    setProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/agent-applications/${id}/review`, 
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidature approuvée avec succès')
      fetchApplications()
      setShowModal(false)
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
      await axios.post(`/api/admin/agent-applications/${selectedAppId}/review`, 
        { action: 'reject', rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Candidature rejetée')
      fetchApplications()
      setShowRejectModal(false)
      setShowModal(false)
      setRejectionReason('')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  const openRejectModal = (id) => {
    setSelectedAppId(id)
    setShowRejectModal(true)
  }

  const downloadDocument = async (id, type) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/agent-applications/${id}/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}_${Date.now()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Document téléchargé')
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
    }
  }

  // Spinner CSS personnalisé (remplace FaSpinner)
  const Spinner = () => (
    <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  )

  const getStatusBadge = (status) => {
    switch(status) {
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

  const filteredApplications = applications.filter(app => 
    app.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.phone?.includes(searchTerm) ||
    app.agency_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* En-tête avec filtres */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Toutes ({totalApps})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'approved' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Approuvés
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Rejetés
          </button>
        </div>
        
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={14} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 w-64 text-sm"
          />
        </div>
      </div>

      {/* Liste des candidatures */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <FaUsers className="text-white/20 text-5xl mx-auto mb-3" />
          <p className="text-white/50">Aucune candidature trouvée</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead className="border-b border-white/20">
              <tr className="text-left text-white/60 text-sm">
                <th className="pb-3">Candidat</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Agence</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((app) => {
                const status = getStatusBadge(app.status)
                const StatusIcon = status.icon
                return (
                  <tr key={app.id} className="border-b border-white/10 hover:bg-white/5 transition-all">
                    <td className="py-3">
                      <p className="font-medium">{app.fullname}</p>
                      <p className="text-xs text-white/40">{app.id_card_number || 'N° pièce non fourni'}</p>
                    </td>
                    <td className="py-3">
                      <p className="text-sm">{app.phone}</p>
                      {app.email && <p className="text-xs text-white/40">{app.email}</p>}
                    </td>
                    <td className="py-3">
                      <p className="text-sm">{app.agency_name}</p>
                      <p className="text-xs text-white/40">{app.city || app.province || 'Ville non spécifiée'}</p>
                    </td>
                    <td className="py-3 text-sm">
                      {new Date(app.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${status.color}`}>
                        <StatusIcon size={10} /> {status.text}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(app)}
                          className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                          title="Voir détails"
                        >
                          <FaEye size={14} />
                        </button>
                        {app.id_card_path && (
                          <button
                            onClick={() => downloadDocument(app.id, 'id_card')}
                            className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                            title="Télécharger CNI"
                          >
                            <FaIdCard size={14} />
                          </button>
                        )}
                        {app.business_license_path && (
                          <button
                            onClick={() => downloadDocument(app.id, 'business_license')}
                            className="p-1.5 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
                            title="Télécharger registre"
                          >
                            <FaFileAlt size={14} />
                          </button>
                        )}
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={processing}
                              className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                              title="Approuver"
                            >
                              <FaCheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => openRejectModal(app.id)}
                              disabled={processing}
                              className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                              title="Rejeter"
                            >
                              <FaTimesCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p-1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
          >
            <FaChevronLeft size={14} />
          </button>
          <span className="px-4 py-1 text-white text-sm">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modal Détails */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaUserCheck className="text-blue-400" />
                Détails de la candidature
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedApp(null)
                }}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Informations personnelles */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaUserCheck className="text-blue-400" /> Informations personnelles
                </h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/50 text-xs">Nom complet</p>
                    <p className="text-white font-medium">{selectedApp.fullname}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Téléphone</p>
                    <p className="text-white">{selectedApp.phone}</p>
                  </div>
                  {selectedApp.email && (
                    <div>
                      <p className="text-white/50 text-xs">Email</p>
                      <p className="text-white">{selectedApp.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-white/50 text-xs">Pièce d'identité</p>
                    <p className="text-white">{selectedApp.id_card_number || 'Non renseigné'}</p>
                  </div>
                </div>
              </div>

              {/* Informations agence */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaBuilding className="text-blue-400" /> Informations de l'agence
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-white/50 text-xs">Nom de l'agence</p>
                    <p className="text-white font-medium">{selectedApp.agency_name}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Adresse</p>
                    <p className="text-white">{selectedApp.agency_address}</p>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FaComment className="text-blue-400" /> Motivation
                </h4>
                <p className="text-white/80 text-sm">{selectedApp.motivation}</p>
              </div>

              {/* Documents */}
              {(selectedApp.id_card_path || selectedApp.business_license_path) && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FaFileAlt className="text-blue-400" /> Documents joints
                  </h4>
                  <div className="flex gap-3">
                    {selectedApp.id_card_path && (
                      <button
                        onClick={() => downloadDocument(selectedApp.id, 'id_card')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg text-green-400 hover:bg-green-500/30 text-sm transition-all"
                      >
                        <FaIdCard /> CNI/Passeport
                      </button>
                    )}
                    {selectedApp.business_license_path && (
                      <button
                        onClick={() => downloadDocument(selectedApp.id, 'business_license')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/30 text-sm transition-all"
                      >
                        <FaFileAlt /> Registre de commerce
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Rejet reason */}
              {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <p className="text-red-400 text-sm font-semibold mb-1">Raison du rejet</p>
                  <p className="text-red-300 text-sm">{selectedApp.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={processing}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {processing ? <Spinner /> : <FaCheckCircle />}
                    Approuver
                  </button>
                  <button
                    onClick={() => openRejectModal(selectedApp.id)}
                    disabled={processing}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {processing ? <Spinner /> : <FaTimesCircle />}
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                ✕
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
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {processing ? <Spinner /> : <span>✓</span>}
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentApplicationsManager