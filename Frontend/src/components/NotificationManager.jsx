// src/components/NotificationManager.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  FaBell, FaMoneyBillWave, FaIdCard, FaExclamationTriangle,
  FaCheckCircle, FaTimes, FaSpinner, FaArrowUp, FaArrowDown,
  FaStore, FaReceipt, FaUserCheck, FaClock, FaEye
} from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

function NotificationManager({ user, socket }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { isDark } = useTheme()

  useEffect(() => {
    fetchNotifications()
    
    if (socket) {
      socket.on('notification', (notification) => {
        addNotification(notification)
        showToastNotification(notification)
      })
    }
    
    return () => {
      if (socket) {
        socket.off('notification')
      }
    }
  }, [socket])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(response.data || [])
      setUnreadCount(response.data.filter(n => !n.is_read).length)
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNotification = (notification) => {
    const newNotif = {
      id: Date.now(),
      ...notification,
      is_read: false,
      created_at: new Date().toISOString()
    }
    setNotifications(prev => [newNotif, ...prev.slice(0, 49)])
    setUnreadCount(prev => prev + 1)
  }

  const showToastNotification = (notification) => {
    // Afficher un toast différent selon le type
    let icon = ''
    let bgColor = ''
    let soundFile = ''
    
    switch(notification.category) {
      case 'transaction':
        if (notification.title.includes('Transfert reçu')) {
          icon = '💰'
          bgColor = 'bg-green-500'
          soundFile = '/sounds/coins.mp3'
        } else if (notification.title.includes('Transfert envoyé')) {
          icon = '💸'
          bgColor = 'bg-blue-500'
          soundFile = '/sounds/send.mp3'
        } else if (notification.title.includes('Dépôt')) {
          icon = '🏦'
          bgColor = 'bg-green-500'
          soundFile = '/sounds/deposit.mp3'
        } else if (notification.title.includes('Retrait')) {
          icon = '💵'
          bgColor = 'bg-yellow-500'
          soundFile = '/sounds/withdraw.mp3'
        }
        break
      case 'kyc':
        icon = '🆔'
        bgColor = 'bg-purple-500'
        soundFile = '/sounds/kyc.mp3'
        break
      case 'alert':
        icon = '⚠️'
        bgColor = 'bg-red-500'
        soundFile = '/sounds/alert.mp3'
        break
      default:
        icon = '🔔'
        bgColor = 'bg-blue-500'
    }
    
    // Jouer le son
    const audio = new Audio(soundFile)
    audio.play().catch(e => console.log('Son non joué'))
    
    // Afficher le toast
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-slide-down' : 'hidden'} max-w-md w-full bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl shadow-2xl p-4 border-l-4 border-blue-500`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{icon}</div>
          <div className="flex-1">
            <p className="text-white font-semibold">{notification.title}</p>
            <p className="text-white/70 text-sm">{notification.message}</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-white/40 hover:text-white">
            <FaTimes />
          </button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erreur marquage:', error)
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
      console.error('Erreur:', error)
    }
  }

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification supprimée')
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const getNotificationIcon = (notification) => {
    const title = notification.title || ''
    if (title.includes('Transfert reçu')) return <FaArrowDown className="text-green-400" size={18} />
    if (title.includes('Transfert envoyé')) return <FaArrowUp className="text-blue-400" size={18} />
    if (title.includes('Dépôt')) return <FaStore className="text-green-400" size={18} />
    if (title.includes('Retrait')) return <FaMoneyBillWave className="text-yellow-400" size={18} />
    if (title.includes('Frais')) return <FaReceipt className="text-purple-400" size={18} />
    if (title.includes('KYC')) return <FaIdCard className="text-purple-400" size={18} />
    if (title.includes('Alerte') || notification.type === 'alert') return <FaExclamationTriangle className="text-yellow-400" size={18} />
    if (title.includes('Demande')) return <FaUserCheck className="text-blue-400" size={18} />
    return <FaBell className="text-blue-400" size={18} />
  }

  const getNotificationBgColor = (notification) => {
    const title = notification.title || ''
    if (title.includes('Transfert reçu')) return 'bg-green-900/30 border-green-500/30'
    if (title.includes('Transfert envoyé')) return 'bg-blue-900/30 border-blue-500/30'
    if (title.includes('Dépôt')) return 'bg-green-900/30 border-green-500/30'
    if (title.includes('Retrait')) return 'bg-yellow-900/30 border-yellow-500/30'
    if (title.includes('KYC')) return 'bg-purple-900/30 border-purple-500/30'
    if (notification.type === 'alert') return 'bg-red-900/30 border-red-500/30'
    return 'bg-blue-900/30 border-blue-500/30'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'transaction') return n.category === 'transaction' || n.type === 'transaction'
    if (filter === 'kyc') return n.category === 'kyc'
    if (filter === 'alert') return n.category === 'alert' || n.type === 'alert'
    return true
  })

  const getFilterCount = (filterType) => {
    if (filterType === 'all') return notifications.length
    if (filterType === 'transaction') return notifications.filter(n => n.category === 'transaction' || n.type === 'transaction').length
    if (filterType === 'kyc') return notifications.filter(n => n.category === 'kyc').length
    if (filterType === 'alert') return notifications.filter(n => n.category === 'alert' || n.type === 'alert').length
    return 0
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full transition-all hover:bg-white/10"
      >
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-blue-800/95' : 'bg-white'} backdrop-blur-lg border border-white/20`}>
          {/* En-tête */}
          <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FaBell className="text-blue-400" />
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-blue-400 text-xs hover:text-blue-300"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Filtres */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : `${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`
                }`}
              >
                Toutes ({getFilterCount('all')})
              </button>
              <button
                onClick={() => setFilter('transaction')}
                className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${
                  filter === 'transaction' 
                    ? 'bg-green-600 text-white' 
                    : `${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`
                }`}
              >
                <FaMoneyBillWave size={10} /> Transactions ({getFilterCount('transaction')})
              </button>
              <button
                onClick={() => setFilter('kyc')}
                className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${
                  filter === 'kyc' 
                    ? 'bg-purple-600 text-white' 
                    : `${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`
                }`}
              >
                <FaIdCard size={10} /> KYC ({getFilterCount('kyc')})
              </button>
              <button
                onClick={() => setFilter('alert')}
                className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${
                  filter === 'alert' 
                    ? 'bg-red-600 text-white' 
                    : `${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`
                }`}
              >
                <FaExclamationTriangle size={10} /> Alertes ({getFilterCount('alert')})
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-[450px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <FaSpinner className="text-white text-2xl animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <FaBell className="text-white/20 text-4xl mx-auto mb-2" />
                <p className="text-white/50 text-sm">Aucune notification</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`p-4 border-b cursor-pointer transition-all ${
                    isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
                  } ${!notif.is_read ? (isDark ? 'bg-blue-700/30' : 'bg-blue-50') : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notif)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notif.id)
                          }}
                          className="text-white/30 hover:text-white/60 transition-all"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <FaClock className="text-white/30 text-xs" />
                        <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          {formatTime(notif.created_at)}
                        </p>
                        {notif.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            notif.category === 'transaction' ? 'bg-green-500/20 text-green-400' :
                            notif.category === 'kyc' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {notif.category === 'transaction' ? 'Transaction' : notif.category === 'kyc' ? 'KYC' : 'Alerte'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationManager