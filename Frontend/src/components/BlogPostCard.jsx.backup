// src/components/BlogPostCard.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { FaCalendarAlt, FaUser, FaTag, FaEye, FaHeart, FaShare } from 'react-icons/fa'

function BlogPostCard({ post }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    const getCategoryColor = (category) => {
        const colors = {
            tutoriel: 'bg-blue-500/20 text-blue-400',
            actualite: 'bg-green-500/20 text-green-400',
            securite: 'bg-red-500/20 text-red-400',
            promotion: 'bg-yellow-500/20 text-yellow-400',
            opportunite: 'bg-purple-500/20 text-purple-400'
        }
        return colors[category] || 'bg-gray-500/20 text-gray-400'
    }

    return (
        <div className="card group hover:transform hover:-translate-y-2 transition-all duration-300 overflow-hidden">
            {/* Image de couverture */}
            <div className="relative h-48 overflow-hidden -m-6 mb-4">
                {post.image_url ? (
                    <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                        <span className="text-white text-4xl">📰</span>
                    </div>
                )}
                
                {/* Catégorie */}
                <span className={`absolute top-4 left-4 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                    {post.category}
                </span>
            </div>
            
            {/* Contenu */}
            <div className="p-4">
                <div className="flex items-center gap-4 text-white/40 text-xs mb-3">
                    <span className="flex items-center gap-1">
                        <FaCalendarAlt size={10} /> {formatDate(post.published_at || post.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                        <FaUser size={10} /> {post.author_fullname || post.author_name || 'Admin'}
                    </span>
                    <span className="flex items-center gap-1">
                        <FaEye size={10} /> {post.views || 0}
                    </span>
                </div>
                
                <Link to={`/blog/${post.slug}`}>
                    <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 hover:text-blue-300 transition-colors">
                        {post.title}
                    </h3>
                </Link>
                
                <p className="text-white/60 text-sm mb-4 line-clamp-3">
                    {post.excerpt || post.content.substring(0, 150)}...
                </p>
                
                {/* Tags */}
                {post.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.split(',').map(tag => (
                            <span key={tag} className="text-white/30 text-xs bg-white/5 px-2 py-1 rounded-full">
                                #{tag.trim()}
                            </span>
                        ))}
                    </div>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <Link to={`/blog/${post.slug}`} className="text-blue-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                        Lire la suite →
                    </Link>
                    <div className="flex gap-2">
                        <button className="text-white/30 hover:text-red-400 transition-colors">
                            <FaHeart size={14} />
                        </button>
                        <button className="text-white/30 hover:text-blue-400 transition-colors">
                            <FaShare size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BlogPostCard