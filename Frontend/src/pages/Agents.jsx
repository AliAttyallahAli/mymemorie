// src/pages/Agents.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  FaUserTie, FaMapMarkerAlt, FaPhone, FaStar, FaSearch,
  FaWhatsapp, FaEnvelope, FaChevronLeft, FaChevronRight,
  FaRegClock, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Agents({ user }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [cities, setCities] = useState([])
  const agentsPerPage = 6

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/admin/users?role=agent', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      const agentsData = response.data.users || []
      setAgents(agentsData)
      
      // Extraire les villes uniques
      const uniqueCities = [...new Set(agentsData.map(a => a.city || a.province).filter(Boolean))]
      setCities(uniqueCities)
    } catch (error) {
      console.error('Erreur chargement agents:', error)
      // Données fictives pour la démonstration
      const mockAgents = [
        {
          id: 1,
          fullname: 'Jean NDOUMBE',
          phone: '66234567',
          province: 'N\'Djaména',
          city: 'N\'Djaména',
          agency_name: 'Agence CashPays Moursal',
          agency_address: 'Quartier Moursal, près de la grande mosquée',
          rating: 4.8,
          verified: true
        },
        {
          id: 2,
          fullname: 'Marie MBALLA',
          phone: '66345678',
          province: 'Logone Occidental',
          city: 'Moundou',
          agency_name: 'Agence CashPays Moundou Centre',
          agency_address: 'Avenue Charles de Gaulle',
          rating: 4.9,
          verified: true
        },
        {
          id: 3,
          fullname: 'Pierre MADJI',
          phone: '66456789',
          province: 'Mayo-Kebbi Est',
          city: 'Bongor',
          agency_name: 'Agence CashPays Bongor',
          agency_address: 'Marché central',
          rating: 4.7,
          verified: true
        },
        {
          id: 4,
          fullname: 'Aïssa MAHAMAT',
          phone: '66567890',
          province: 'Ouaddaï',
          city: 'Abéché',
          agency_name: 'Agence CashPays Abéché',
          agency_address: 'Route de l\'aéroport',
          rating: 4.9,
          verified: true
        },
        {
          id: 5,
          fullname: 'Ali HASSAN',
          phone: '66678901',
          province: 'Batha',
          city: 'Ati',
          agency_name: 'Agence CashPays Ati',
          agency_address: 'Centre-ville',
          rating: 4.6,
          verified: true
        },
        {
          id: 6,
          fullname: 'Fatima ADAM',
          phone: '66789012',
          province: 'Lac',
          city: 'Bol',
          agency_name: 'Agence CashPays Bol',
          agency_address: 'Quartier administratif',
          rating: 4.8,
          verified: true
        }
      ]
      setAgents(mockAgents)
      setCities(['N\'Djaména', 'Moundou', 'Bongor', 'Abéché', 'Ati', 'Bol'])
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.phone.includes(searchTerm) ||
                         (agent.agency_name && agent.agency_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCity = selectedCity === 'all' || agent.city === selectedCity || agent.province === selectedCity
    return matchesSearch && matchesCity
  })

  // Pagination
  const indexOfLastAgent = currentPage * agentsPerPage
  const indexOfFirstAgent = indexOfLastAgent - agentsPerPage
  const currentAgents = filteredAgents.slice(indexOfFirstAgent, indexOfLastAgent)
  const totalPages = Math.ceil(filteredAgents.length / agentsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const getRatingStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="text-yellow-400 opacity-50" />)
    }
    const remainingStars = 5 - stars.length
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaStar key={i + fullStars} className="text-white/20" />)
    }
    return stars
  }

  return (
    <Layout user={user}>
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaUserTie className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Nos agents CashPays
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Trouvez un agent CashPays près de chez vous pour vos dépôts et retraits
        </p>
      </div>

      {/* Search and filters */}
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
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Agents count */}
      <div className="mb-4">
        <p className="text-white/50 text-sm">
          {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} trouvé{filteredAgents.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Agents grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/20 text-5xl mb-3">🏪</div>
          <p className="text-white/50">Aucun agent trouvé dans cette région</p>
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedCity('all')
            }}
            className="text-blue-400 text-sm mt-2"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentAgents.map((agent) => (
              <div key={agent.id} className="card hover:transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {agent.fullname.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{agent.fullname}</h3>
                      {agent.verified && (
                        <FaCheckCircle className="text-blue-400 text-sm" title="Agent vérifié" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {getRatingStars(agent.rating || 4.8)}
                      <span className="text-white/40 text-sm ml-1">({agent.rating || 4.8})</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaUserTie className="text-blue-400 text-sm" />
                    <span>{agent.agency_name || 'Agence CashPays'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaMapMarkerAlt className="text-blue-400 text-sm" />
                    <span>{agent.agency_address || agent.city || agent.province}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <FaPhone className="text-blue-400 text-sm" />
                    <span>{agent.phone}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                  >
                    <FaPhone /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${agent.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm flex items-center justify-center gap-2 rounded-lg py-2 transition-all"
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>
                </div>

                <div className="mt-3 flex items-center justify-between text-white/30 text-xs">
                  <div className="flex items-center gap-1">
                    <FaRegClock size={10} />
                    <span>Lun-Sam: 08h-18h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaShieldAlt size={10} />
                    <span>Agent officiel</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                <FaChevronLeft />
              </button>
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* CTA pour devenir agent */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Vous souhaitez devenir agent CashPays ?
        </h2>
        <p className="text-blue-100 mb-4">
          Rejoignez notre réseau et développez votre activité
        </p>
        <Link to="/become-agent" className="btn-primary bg-white text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2">
          Postuler maintenant
        </Link>
      </div>
    </Layout>
  )
}

export default Agents