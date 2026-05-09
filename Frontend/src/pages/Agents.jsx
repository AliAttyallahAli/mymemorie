// src/pages/Agents.jsx - Version corrigée
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from '../utils/toast'
import { 
  FaUserTie, FaMapMarkerAlt, FaPhone, FaStar, FaSearch,
  FaWhatsapp, FaEnvelope, FaChevronLeft, FaChevronRight,
  FaShieldAlt, FaCheckCircle, FaStore,
  FaTimes, FaSpinner, FaStarHalfAlt, FaRegStar,
  FaBuilding
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Agents({ user }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [cities, setCities] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAgents, setTotalAgents] = useState(0)
  
  const agentsPerPage = 9

  useEffect(() => {
    fetchAgents()
  }, [currentPage, selectedCity, searchTerm])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const params = {
        limit: agentsPerPage,
        offset: (currentPage - 1) * agentsPerPage
      }
      
      if (selectedCity !== 'all') {
        params.city = selectedCity
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      
      // Pas de token nécessaire pour cette requête publique
      const response = await axios.get('/api/agents', { params })
      
      if (response.data && response.data.agents) {
        setAgents(response.data.agents)
        setTotalPages(Math.ceil(response.data.total / agentsPerPage))
        setTotalAgents(response.data.total)
        setCities(response.data.cities || [])
      } else {
        setAgents([])
        setCities([])
      }
    } catch (error) {
      console.error('Erreur chargement agents:', error)
      setAgents([])
      setCities([])
      // Afficher l'erreur seulement si ce n'est pas une erreur d'authentification
      if (error.response?.status !== 401) {
        toast.error('Erreur lors du chargement des agents')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRatingStars = (rating) => {
    if (!rating) {
      // Retourner des étoiles grises par défaut
      const stars = []
      for (let i = 0; i < 5; i++) {
        stars.push(<FaRegStar key={i} className="text-yellow-400" />)
      }
      return stars
    }
    
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="text-yellow-400" />)
    }
    const remainingStars = 5 - stars.length
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaRegStar key={i + fullStars} className="text-white/30" />)
    }
    return stars
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Non disponible'
    return phone
  }

  // Afficher un message si aucun agent n'est trouvé
  if (!loading && agents.length === 0 && !searchTerm && selectedCity === 'all') {
    return (
      <Layout user={user}>
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
            <FaUserTie className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Nos agents CashPays
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Trouvez un agent CashPays près de chez vous
          </p>
        </div>
        
        <div className="card text-center py-12">
          <FaStore className="text-white/20 text-5xl mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Aucun agent disponible</h3>
          <p className="text-white/50 mb-4">
            Aucun agent n'est actuellement enregistré dans la base de données.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-flex items-center gap-2"
          >
            Recharger
          </button>
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Vous souhaitez devenir agent CashPays ?
          </h2>
          <p className="text-blue-100 mb-4">
            Rejoignez notre réseau de partenaires
          </p>
          <Link to="/become-agent" className="btn-primary bg-white text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2">
            Postuler maintenant →
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user}>
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaUserTie className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Nos agents CashPays
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Trouvez un agent CashPays près de chez vous pour vos dépôts, retraits et transactions
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, agence ou téléphone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="input-field pl-10"
          />
        </div>
        <div className="md:w-64">
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value)
              setCurrentPage(1)
            }}
            className="input-field"
          >
            <option value="all">Toutes les villes</option>
            {cities.map((city, index) => (
              <option key={index} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-white/50 text-sm">
          {totalAgents} agent{totalAgents > 1 ? 's' : ''} trouvé{totalAgents > 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <FaStore className="text-white/20 text-5xl mx-auto mb-3" />
          <p className="text-white/50">Aucun agent trouvé dans cette région</p>
          {(searchTerm || selectedCity !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCity('all')
                setCurrentPage(1)
              }}
              className="text-blue-400 text-sm mt-2 hover:underline"
            >
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="card hover:transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {agent.fullname?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-bold">{agent.fullname}</h3>
                      {agent.agency_type === 'principale' && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          Principale
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {getRatingStars(agent.rating)}
                      <span className="text-white/40 text-sm ml-1">
                        ({agent.reviews_count || 0} avis)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <FaCheckCircle size={10} /> En activité
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaBuilding className="text-blue-400 text-sm flex-shrink-0" />
                    <span className="truncate">{agent.agency_name || 'Agence CashPays'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaMapMarkerAlt className="text-blue-400 text-sm flex-shrink-0" />
                    <span className="truncate">{agent.agency_address || agent.city || agent.province || 'Tchad'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaPhone className="text-blue-400 text-sm flex-shrink-0" />
                    <span>{formatPhoneNumber(agent.phone)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1 py-2"
                  >
                    <FaPhone size={12} /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${agent.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm flex items-center justify-center gap-1 py-2 rounded-lg transition-all"
                  >
                    <FaWhatsapp size={12} /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                <FaChevronLeft />
              </button>
              <span className="px-4 py-1 text-white">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Vous souhaitez devenir agent CashPays ?
        </h2>
        <p className="text-blue-100 mb-4">
          Rejoignez notre réseau de partenaires et développez votre activité
        </p>
        <Link to="/become-agent" className="btn-primary bg-white text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2">
          Postuler maintenant →
        </Link>
      </div>
    </Layout>
  )
}

export default Agents