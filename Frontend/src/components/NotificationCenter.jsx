// src/components/NotificationCenter.jsx
import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaBell, FaTimes, FaCheckCircle, FaExclamationTriangle, 
  FaInfoCircle, FaMoneyBillWave, FaTrash, FaCheckDouble,
  FaDownload, FaEye, FaEyeSlash
} from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'
import fr from 'date-fns/locale/fr'

function NotificationCenter({ user, socket }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    startPolling()
    
    // Écouter les notifications en temps réel via Socket.IO
    if (socket) {
      socket.on('new_notification', (notification) => {
        addNotification(notification)
      })
      
      socket.on('transaction_notification', (data) => {
        addTransactionNotification(data)
      })
    }
    
    return () => {
      if (socket) {
        socket.off('new_notification')
        socket.off('transaction_notification')
      }
    }
  }, [socket])

  // Polling toutes les 30 secondes
  const startPolling = () => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }

  // Fermer le dropdown au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(response.data || [])
      const unread = (response.data || []).filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    // Afficher un toast
    toast.custom((t) => (
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-4 shadow-2xl border-l-4 border-blue-500 max-w-sm animate-slide-down">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 text-xl">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">{notification.title}</p>
            <p className="text-white/70 text-sm">{notification.message}</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-white/40">
            <FaTimes size={14} />
          </button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  const addTransactionNotification = (data) => {
    const notification = {
      id: Date.now(),
      title: data.type === 'deposit' ? '💰 Dépôt réussi' : '💸 Retrait effectué',
      message: data.type === 'deposit' 
        ? `${data.amount.toLocaleString()} FCFA ont été ajoutés à votre compte`
        : `${data.amount.toLocaleString()} FCFA ont été retirés de votre compte`,
      type: 'transaction',
      is_read: false,
      created_at: new Date().toISOString(),
      data: data
    }
    addNotification(notification)
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'transaction': return <FaMoneyBillWave />
      case 'alert': return <FaExclamationTriangle />
      case 'success': return <FaCheckCircle />
      default: return <FaInfoCircle />
    }
  }

  const getNotificationColor = (type) => {
    switch(type) {
      case 'transaction': return 'border-green-500'
      case 'alert': return 'border-yellow-500'
      case 'success': return 'border-green-500'
      default: return 'border-blue-500'
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erreur marquage notification:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('Toutes les notifications ont été marquées comme lues')
    } catch (error) {
      toast.error('Erreur lors du marquage')
    }
  }

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notifications.find(n => n.id === notificationId)?.is_read === false) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success('Notification supprimée')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const deleteAllNotifications = async () => {
    if (!window.confirm('Supprimer toutes les notifications ?')) return
    
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete('/api/notifications/all', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications([])
      setUnreadCount(0)
      toast.success('Toutes les notifications ont été supprimées')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const formatDate = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-all"
      >
        <FaBell className="text-white text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown des notifications */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-blue-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 z-50 max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div>
              <h3 className="text-white font-semibold">Notifications</h3>
              <p className="text-white/40 text-xs">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                    title="Tout marquer comme lu"
                  >
                    <FaCheckDouble size={12} /> Tout lire
                  </button>
                  <button
                    onClick={deleteAllNotifications}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                    title="Supprimer tout"
                  >
                    <FaTrash size={12} /> Tout supprimer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <FaBell className="text-white/20 text-4xl mx-auto mb-2" />
                <p className="text-white/50 text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-white/10 hover:bg-white/5 transition-all cursor-pointer ${
                    !notif.is_read ? 'bg-blue-800/50' : ''
                  }`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className={`text-xl ${getNotificationColor(notif.type)}`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-medium text-sm truncate">
                          {notif.title}
                        </p>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notif.id)
                            }}
                            className="text-white/30 hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <FaTrash size={10} />
                          </button>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-white/30 text-xs mt-2">
                        {formatDate(notif.created_at)}
                      </p>
                      {notif.data && notif.data.amount && (
                        <div className="mt-2 p-2 bg-white/5 rounded-lg">
                          <p className="text-green-400 text-xs">
                            Montant: {notif.data.amount.toLocaleString()} FCFA
                          </p>
                          {notif.data.agent_name && (
                            <p className="text-white/40 text-xs">
                              Agent: {notif.data.agent_name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  setShowDropdown(false)
                  // Naviguer vers la page des notifications
                }}
                className="text-white/50 text-xs hover:text-white transition-colors"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationCenter