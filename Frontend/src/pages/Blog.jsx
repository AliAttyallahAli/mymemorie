// src/pages/Blog.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  FaNewspaper, FaSearch, FaCalendarAlt, FaUser, 
  FaTag, FaEye, FaHeart, FaShare, FaArrowRight,
  FaSpinner, FaFilter
} from 'react-icons/fa'
import Layout from '../components/Layout'
import BlogPostCard from '../components/BlogPostCard'

function Blog({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)
  const postsPerPage = 9

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [currentPage, selectedCategory, searchTerm])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = {
        limit: postsPerPage,
        offset: (currentPage - 1) * postsPerPage
      }
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory
      }
      
      if (searchTerm) {
        params.search = searchTerm
      }
      
      const response = await axios.get('/api/blog/posts', { params })
      setPosts(response.data.posts || [])
      setTotalPages(Math.ceil(response.data.total / postsPerPage))
      setTotalPosts(response.data.total)
    } catch (error) {
      console.error('Erreur chargement articles:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/blog/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('Erreur chargement catégories:', error)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchPosts()
  }

  const categoriesList = [
    { name: 'Tous', value: 'all', count: totalPosts },
    { name: 'Tutoriels', value: 'tutoriel', icon: '📚' },
    { name: 'Actualités', value: 'actualite', icon: '📰' },
    { name: 'Sécurité', value: 'securite', icon: '🔒' },
    { name: 'Promotions', value: 'promotion', icon: '🎉' },
    { name: 'Opportunités', value: 'opportunite', icon: '💼' }
  ]

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
          Actualités, conseils et tutoriels pour mieux utiliser CashPays
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
          <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary py-1 px-3 text-sm">
            Rechercher
          </button>
        </div>
      </form>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categoriesList.map(cat => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value)
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
            {cat.count !== undefined && (
              <span className="ml-1 text-xs opacity-70">({cat.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Articles count */}
      <div className="mb-4">
        <p className="text-white/50 text-sm">
          {totalPosts} article{totalPosts > 1 ? 's' : ''} trouvé{totalPosts > 1 ? 's' : ''}
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <FaSpinner className="text-white text-4xl animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/20 text-5xl mb-3">📭</div>
          <p className="text-white/50">Aucun article trouvé</p>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
              }}
              className="text-blue-400 text-sm mt-2"
            >
              Réinitialiser la recherche
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Articles grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                ← Précédent
              </button>
              
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1
                  // Afficher un nombre limité de pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-white/40">...</span>
                  }
                  return null
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-50 hover:bg-white/20 transition-all"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
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