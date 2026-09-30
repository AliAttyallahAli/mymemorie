import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FaFacebook, FaWhatsapp, FaTelegram, FaGlobe, FaCalendarAlt } from 'react-icons/fa'
import Layout from '../components/Layout'

function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('/api/announcements')
      setAnnouncements(response.data)
    } catch (error) {
      console.error('Erreur chargement annonces:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Layout user={null}>
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">📢 Annonces officielles</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/50">Aucune annonce pour le moment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map((announce) => (
              <div key={announce.id} className="bg-white/5 rounded-xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-white text-xl font-semibold">{announce.title}</h3>
                  <div className="flex items-center gap-1 text-white/40 text-sm">
                    <FaCalendarAlt size={12} />
                    <span>{formatDate(announce.created_at)}</span>
                  </div>
                </div>
                <p className="text-white/80 mb-4 whitespace-pre-wrap">{announce.content}</p>
                
                {/* Réseaux sociaux */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-white/10">
                  {announce.facebook_link && (
                    <a href={announce.facebook_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-[#1877f2]/20 rounded-lg text-[#1877f2] hover:bg-[#1877f2]/30 transition-all">
                      <FaFacebook /> Facebook
                    </a>
                  )}
                  {announce.whatsapp_link && (
                    <a href={announce.whatsapp_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-[#25d366]/20 rounded-lg text-[#25d366] hover:bg-[#25d366]/30 transition-all">
                      <FaWhatsapp /> WhatsApp
                    </a>
                  )}
                  {announce.telegram_link && (
                    <a href={announce.telegram_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-[#0088cc]/20 rounded-lg text-[#0088cc] hover:bg-[#0088cc]/30 transition-all">
                      <FaTelegram /> Telegram
                    </a>
                  )}
                  {announce.website_link && (
                    <a href={announce.website_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all">
                      <FaGlobe /> Site web
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Announcements