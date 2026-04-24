// src/pages/Blog.jsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FaNewspaper, FaCalendarAlt, FaUser, FaTag, FaSearch,
  FaArrowRight, FaShare, FaHeart, FaComment
} from 'react-icons/fa'
import Layout from '../components/Layout'

function Blog({ user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')

  const posts = [
    {
      id: 1,
      title: 'Comment envoyer de l\'argent avec CashPays',
      excerpt: 'Découvrez comment envoyer de l\'argent en quelques secondes avec CashPays...',
      date: '2026-04-15',
      author: 'Jean NDOUMBE',
      category: 'Tutoriel',
      tags: ['transfert', 'tutoriel'],
      image: 'https://placehold.co/600x400/1e3a8a/white?text=CashPays',
      readTime: '3 min'
    },
    {
      id: 2,
      title: 'Les avantages de devenir agent CashPays',
      excerpt: 'Rejoignez notre réseau d\'agents et développez votre activité...',
      date: '2026-04-10',
      author: 'Marie MBALLA',
      category: 'Opportunité',
      tags: ['agent', 'carrière'],
      image: 'https://placehold.co/600x400/1e3a8a/white?text=Agent',
      readTime: '5 min'
    },
    {
      id: 3,
      title: 'Sécurité des transactions : tout ce qu\'il faut savoir',
      excerpt: 'CashPays protège vos transactions avec un chiffrement de bout en bout...',
      date: '2026-04-05',
      author: 'Pierre MADJI',
      category: 'Sécurité',
      tags: ['sécurité', 'protection'],
      image: 'https://placehold.co/600x400/1e3a8a/white?text=Security',
      readTime: '4 min'
    },
    {
      id: 4,
      title: '1000 FCFA offerts à l\'inscription',
      excerpt: 'Créez votre compte CashPays et recevez 1000 FCFA gratuitement...',
      date: '2026-04-01',
      author: 'Admin CashPays',
      category: 'Promotion',
      tags: ['promo', 'bonus'],
      image: 'https://placehold.co/600x400/1e3a8a/white?text=Bonus',
      readTime: '2 min'
    },
    {
      id: 5,
      title: 'CashPays s\'étend dans les 23 provinces',
      excerpt: 'Notre réseau d\'agents couvre désormais tout le territoire tchadien...',
      date: '2026-03-25',
      author: 'Aïssa MAHAMAT',
      category: 'Actualité',
      tags: ['expansion', 'actualité'],
      image: 'https://placehold.co/600x400/1e3a8a/white?text=Tchad',
      readTime: '3 min'
    }
  ]

  const categories = ['Tous', 'Tutoriel', 'Actualité', 'Sécurité', 'Promotion', 'Opportunité']
  const tags = ['transfert', 'tutoriel', 'agent', 'carrière', 'sécurité', 'protection', 'promo', 'bonus', 'expansion', 'actualité']

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Layout user={user}>
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
          <FaNewspaper className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Blog CashPays
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Actualités, conseils et tutoriels sur CashPays
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Blog posts */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50">Aucun article trouvé</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div key={post.id} className="card group hover:transform hover:-translate-y-2 transition-all duration-300 overflow-hidden">
              <div className="relative h-48 overflow-hidden -m-6 mb-4">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {post.category}
                </span>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-4 text-white/40 text-xs mb-3">
                  <span className="flex items-center gap-1">
                    <FaCalendarAlt size={10} /> {formatDate(post.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaUser size={10} /> {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaNewspaper size={10} /> {post.readTime}
                  </span>
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-white/60 text-sm mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-white/30 text-xs bg-white/5 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button className="text-blue-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Lire la suite <FaArrowRight size={12} />
                  </button>
                  <div className="flex gap-2">
                    <button className="text-white/30 hover:text-red-400 transition-colors">
                      <FaHeart size={14} />
                    </button>
                    <button className="text-white/30 hover:text-blue-400 transition-colors">
                      <FaComment size={14} />
                    </button>
                    <button className="text-white/30 hover:text-green-400 transition-colors">
                      <FaShare size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter */}
      <div className="card mt-8 text-center">
        <h3 className="text-white text-xl font-bold mb-2">Restez informé</h3>
        <p className="text-white/60 text-sm mb-4">
          Recevez nos actualités et offres spéciales
        </p>
        <div className="flex max-w-md mx-auto gap-3">
          <input
            type="email"
            placeholder="Votre email"
            className="input-field flex-1"
          />
          <button className="btn-primary">
            S'abonner
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default Blog