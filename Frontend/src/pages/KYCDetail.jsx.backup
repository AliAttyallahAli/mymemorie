// src/pages/KYCDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaArrowLeft, FaIdCard, FaCheckCircle, FaTimesCircle,
  FaClock, FaDownload, FaEye, FaUser, FaPhone,
  FaEnvelope, FaMapMarkerAlt, FaCalendarAlt,
  FaSpinner, FaShieldAlt, FaFilePdf, FaImage,
  FaHistory, FaUserCheck, FaTrash
} from 'react-icons/fa'
import Layout from '../components/Layout'

function KYCDetail({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [kycRequest, setKycRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    fetchKycRequest()
  }, [id])

  const fetchKycRequest = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/admin/kyc/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setKycRequest(response.data)
    } catch (error) {
      console.error('Erreur chargement KYC:', error)
      if (error.response?.status === 404) {
        toast.error('Demande KYC non trouvée')
      } else {
        toast.error('Erreur lors du chargement de la demande')
      }
      navigate('/admin')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!window.confirm('Approuver cette demande KYC ?')) return
    
    setProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`/api/admin/kyc/verify/${id}`, 
        { action: 'approve', level: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Demande KYC approuvée')
      fetchKycRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'approbation')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Raison du rejet:')
    if (!reason) return
    
    setProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`/api/admin/kyc/verify/${id}`, 
        { action: 'reject', rejection_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Demande KYC rejetée')
      fetchKycRequest()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  const downloadDocument = async (documentId, filename) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`/api/kyc/download/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
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
    if (!kycRequest) return { color: 'bg-gray-500/20 text-gray-400', text: 'Inconnu' }
    switch(kycRequest.status) {
      case 'verified':
        return { color: 'bg-green-500/20 text-green-400', text: 'Vérifié' }
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente' }
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400', text: 'Rejeté' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', text: 'Non soumis' }
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
          <FaSpinner className="text-white text-4xl animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!kycRequest) return null

  const status = getStatusBadge()

  return (
    <Layout user={user}>
      <div className="max-w-5xl mx-auto">
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
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full">
                <FaIdCard className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Demande KYC</h1>
                <p className="text-white/60">{kycRequest.fullname}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm ${status.color}`}>
                {status.text}
              </span>
              {kycRequest.status === 'pending' && user?.role === 'admin' && (
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
                    onClick={handleReject}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'details' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <FaUser className="inline mr-2" /> Détails
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'documents' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <FaFilePdf className="inline mr-2" /> Documents
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <FaHistory className="inline mr-2" /> Historique
          </button>
        </div>

        {/* Onglet Détails */}
        {activeTab === 'details' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <FaUser className="text-blue-400" /> Informations personnelles
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Nom complet</span>
                  <span className="text-white font-medium">{kycRequest.fullname}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Date de naissance</span>
                  <span className="text-white">{kycRequest.birth_date || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Lieu de naissance</span>
                  <span className="text-white">{kycRequest.birth_place || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Nationalité</span>
                  <span className="text-white">{kycRequest.nationality || 'Tchadienne'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Profession</span>
                  <span className="text-white">{kycRequest.occupation || '-'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <FaPhone className="text-blue-400" /> Contact
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Téléphone</span>
                  <span className="text-white">{kycRequest.user_phone || kycRequest.phone_number}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Email</span>
                  <span className="text-white">{kycRequest.user_email || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Adresse</span>
                  <span className="text-white">{kycRequest.address || '-'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <FaIdCard className="text-blue-400" /> Pièce d'identité
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Type de pièce</span>
                  <span className="text-white">{kycRequest.id_type?.toUpperCase() || 'CNI'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Numéro</span>
                  <span className="text-white font-mono">{kycRequest.id_number}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Date de délivrance</span>
                  <span className="text-white">{kycRequest.id_issue_date || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Date d'expiration</span>
                  <span className="text-white">{kycRequest.id_expiry_date || '-'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-400" /> Dates
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/60">Soumis le</span>
                  <span className="text-white">{formatDate(kycRequest.submitted_at)}</span>
                </div>
                {kycRequest.verified_at && (
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/60">Vérifié le</span>
                    <span className="text-white">{formatDate(kycRequest.verified_at)}</span>
                  </div>
                )}
                {kycRequest.verified_by && (
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/60">Vérifié par</span>
                    <span className="text-white">{kycRequest.verified_by_name || 'Admin'}</span>
                  </div>
                )}
              </div>
            </div>

            {kycRequest.status === 'rejected' && kycRequest.rejection_reason && (
              <div className="lg:col-span-2 card border-red-500/30 bg-red-500/10">
                <h3 className="text-red-400 text-lg font-semibold mb-2 flex items-center gap-2">
                  <FaTimesCircle /> Motif du rejet
                </h3>
                <p className="text-red-300">{kycRequest.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Onglet Documents */}
        {activeTab === 'documents' && (
          <div className="card">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <FaFilePdf className="text-blue-400" /> Documents joints
            </h3>
            {kycRequest.documents && kycRequest.documents.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {kycRequest.documents.map((doc, idx) => (
                  <button
                    key={idx}
                    onClick={() => downloadDocument(doc.id, doc.filename)}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
                  >
                    {doc.mime_type?.includes('pdf') ? (
                      <FaFilePdf className="text-red-400 text-xl group-hover:scale-110 transition-transform" />
                    ) : (
                      <FaImage className="text-blue-400 text-xl group-hover:scale-110 transition-transform" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-white/40 text-xs">
                        {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <FaDownload className="text-white/40 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaFilePdf className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucun document joint</p>
              </div>
            )}
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="card">
            <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <FaHistory className="text-blue-400" /> Historique des actions
            </h3>
            {kycRequest.history && kycRequest.history.length > 0 ? (
              <div className="space-y-3">
                {kycRequest.history.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      {item.action === 'submit' ? '📤' : item.action === 'approve' ? '✅' : '❌'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {item.action === 'submit' ? 'Soumission' : 
                         item.action === 'approve' ? 'Approbation' : 'Rejet'}
                      </p>
                      <p className="text-white/60 text-sm">{item.description}</p>
                      <p className="text-white/30 text-xs mt-1">
                        {formatDate(item.created_at)} par {item.created_by_name || 'Système'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaHistory className="text-white/20 text-5xl mx-auto mb-3" />
                <p className="text-white/50">Aucun historique disponible</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default KYCDetail