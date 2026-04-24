// src/pages/BlogPost.jsx
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaArrowLeft, FaCalendarAlt, FaUser, FaTag, FaEye, FaHeart, FaShare, FaWhatsapp, FaTwitter, FaFacebook } from 'react-icons/fa'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'

function BlogPost({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState([])

  useEffect(() => {
    fetchPost()
  }, [slug])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/blog/posts/${slug}`)
      setPost(response.data)
      
      // Charger les articles similaires
      const relatedRes = await axios.get('/api/blog/posts', {
        params: { category: response.data.category, limit: 3 }
      })
      setRelatedPosts(relatedRes.data.posts.filter(p => p.slug !== slug))
    } catch (error) {
      console.error('Erreur chargement article:', error)
      if (error.response?.status === 404) {
        navigate('/blog')
        toast.error('Article non trouvé')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const shareOnSocial = (platform) => {
    const url = window.location.href
    const title = encodeURIComponent(post.title)
    
    let shareUrl = ''
    switch(platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${title}%20${url}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
    }
    
    window.open(shareUrl, '_blank')
  }

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  if (!post) return null

  return (
    <Layout user={user}>
      {/* Back button */}
      <Link to="/blog" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <FaArrowLeft /> Retour au blog
      </Link>

      {/* Article header */}
      <div className="card mb-8">
        {/* Catégorie */}
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            {post.category}
          </span>
        </div>
        
        {/* Titre */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {post.title}
        </h1>
        
        {/* Meta infos */}
        <div className="flex flex-wrap items-center gap-4 text-white/40 text-sm mb-6">
          <span className="flex items-center gap-1">
            <FaCalendarAlt size={12} /> {formatDate(post.published_at || post.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <FaUser size={12} /> {post.author_fullname || post.author_name || 'Admin'}
          </span>
          <span className="flex items-center gap-1">
            <FaEye size={12} /> {post.views || 0} vues
          </span>
        </div>
        
        {/* Image de couverture */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full rounded-xl mb-6"
          />
        )}
        
        {/* Contenu */}
        <div className="prose prose-invert max-w-none">
          {post.content.split('\n').map((paragraph, i) => (
            <p key={i} className="text-white/80 leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>
        
        {/* Tags */}
        {post.tags && (
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            <FaTag className="text-white/40 mt-0.5" />
            {post.tags.split(',').map(tag => (
              <span key={tag} className="text-white/50 text-sm bg-white/5 px-3 py-1 rounded-full">
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}
        
        {/* Share buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => shareOnSocial('facebook')}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1877f2]/20 hover:bg-[#1877f2]/30 text-white rounded-lg transition-all"
          >
            <FaFacebook /> Facebook
          </button>
          <button
            onClick={() => shareOnSocial('twitter')}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1da1f2]/20 hover:bg-[#1da1f2]/30 text-white rounded-lg transition-all"
          >
            <FaTwitter /> Twitter
          </button>
          <button
            onClick={() => shareOnSocial('whatsapp')}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white rounded-lg transition-all"
          >
            <FaWhatsapp /> WhatsApp
          </button>
        </div>
      </div>

      {/* Articles similaires */}
      {relatedPosts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Articles similaires</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {relatedPosts.map(relatedPost => (
              <div key={relatedPost.id} className="card">
                <Link to={`/blog/${relatedPost.slug}`}>
                  <h3 className="text-white font-semibold mb-2 hover:text-blue-300 transition-colors">
                    {relatedPost.title}
                  </h3>
                </Link>
                <p className="text-white/50 text-sm">
                  {formatDate(relatedPost.published_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default BlogPost