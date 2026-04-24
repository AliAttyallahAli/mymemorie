// src/components/Layout.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { 
  FaHome, 
  FaExchangeAlt, 
  FaHistory, 
  FaUser, 
  FaSignOutAlt, 
  FaBullhorn, 
  FaCog,
  FaBell,
  FaWallet,
  FaQrcode,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUserCircle,
  FaMoneyBillWave,
  FaPhone,
  FaEnvelope,
  FaFacebook,
  FaWhatsapp,
  FaTelegram
} from 'react-icons/fa'
import { IoMdClose } from 'react-icons/io'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'

function Layout({ user, children, socket }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, isDark } = useTheme()
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [balance, setBalance] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const notificationsRef = useRef(null)

  // Navigation items
  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Accueil' },
    { path: '/transfer', icon: FaExchangeAlt, label: 'Transfert' },
    { path: '/history', icon: FaHistory, label: 'Historique' },
    { path: '/profile', icon: FaUser, label: 'Profil' },
    { path: '/settings', icon: FaCog, label: 'Paramètres' },
    { path: '/announcements', icon: FaBullhorn, label: 'Annonces' },
  ]

  // Ajouter admin panel si l'utilisateur est admin
  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', icon: FaUserCircle, label: 'Admin' })
  }

  // Récupérer le solde
  useEffect(() => {
    if (user) {
      fetchBalance()
      fetchNotifications()
    }
  }, [user])

  // Écouter les notifications socket
  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        addNotification(notification)
      })
      
      socket.on('transaction_update', (data) => {
        fetchBalance()
        addNotification({
          title: 'Mise à jour transaction',
          message: data.message || 'Votre transaction a été mise à jour',
          type: 'transaction'
        })
      })
    }
    
    return () => {
      if (socket) {
        socket.off('notification')
        socket.off('transaction_update')
      }
    }
  }, [socket])

  // Fermer les notifications au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBalance(response.data.balance)
    } catch (error) {
      console.error('Erreur chargement solde:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data && Array.isArray(response.data)) {
        setNotifications(response.data)
        const unread = response.data.filter(n => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
      setNotifications([])
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
    
    // Afficher un toast
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-slide-down' : 'hidden'} 
        ${isDark ? 'bg-gradient-to-r from-blue-900 to-blue-800' : 'bg-white shadow-xl'} 
        rounded-xl p-4 border-l-4 ${getNotificationBorderColor(notification.type)} max-w-sm`}>
        <div className="flex items-start gap-3">
          <div className={`text-2xl ${getNotificationIconColor(notification.type)}`}>
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {notification.title}
            </p>
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              {notification.message}
            </p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className={isDark ? 'text-white/40' : 'text-gray-400'}>
            <IoMdClose />
          </button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'transaction': return <FaCheckCircle />
      case 'alert': return <FaExclamationTriangle />
      default: return <FaInfoCircle />
    }
  }

  const getNotificationIconColor = (type) => {
    switch (type) {
      case 'transaction': return 'text-green-400'
      case 'alert': return 'text-yellow-400'
      default: return 'text-blue-400'
    }
  }

  const getNotificationBorderColor = (type) => {
    switch (type) {
      case 'transaction': return 'border-green-500'
      case 'alert': return 'border-yellow-500'
      default: return 'border-blue-500'
    }
  }

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
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
      console.error('Erreur marquage toutes notifications:', error)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      toast.success('Déconnecté avec succès')
      navigate('/login')
    }
  }

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '--- FCFA'
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours} h`
    if (days < 7) return `Il y a ${days} j`
    return date.toLocaleDateString('fr-FR')
  }

  const isActiveLink = (path) => {
    if (path === '/admin') return location.pathname.startsWith('/admin')
    return location.pathname === path
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo et titre - Lien vers la page d'accueil */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <div>
                <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  CashPays
                </span>
                <span className="text-blue-400 text-xs block">GOUROUSDJA</span>
              </div>
            </Link>

            {/* Actions header */}
            <div className="flex items-center gap-3">
              {/* Solde rapide */}
              {balance !== null && (
                <div className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                  <FaWallet className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatAmount(balance)}
                  </span>
                </div>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* QR Code button */}
              <button
                onClick={() => setShowQR(true)}
                className={`p-2 rounded-full transition-all ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Mon QR Code"
              >
                <FaQrcode size={18} />
              </button>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-full transition-all ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <FaBell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown notifications */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-blue-800/95 border-white/20' : 'bg-white border-gray-200'} backdrop-blur-lg border`}>
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-blue-400 text-xs hover:text-blue-300"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    
                    <div className="overflow-y-auto max-h-[400px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <FaBell className={`text-4xl mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            Aucune notification
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && markNotificationAsRead(notif.id)}
                            className={`p-4 border-b cursor-pointer transition-all ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} ${
                              !notif.is_read && (isDark ? 'bg-blue-700/30' : 'bg-blue-50')
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`text-xl ${getNotificationIconColor(notif.type)}`}>
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {notif.title}
                                </p>
                                <p className={`text-xs mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                  {notif.message}
                                </p>
                                <p className={`text-xs mt-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                  {formatDate(notif.created_at)}
                                </p>
                              </div>
                              {!notif.is_read && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu (mobile) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-full ${isDark ? 'text-white' : 'text-gray-700'}`}
              >
                <FaUserCircle size={24} />
              </button>

              {/* Desktop logout */}
              <button
                onClick={handleLogout}
                className={`hidden md:flex items-center gap-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                title="Déconnexion"
              >
                <FaSignOutAlt />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t ${isDark ? 'border-white/10 bg-blue-900/30' : 'border-gray-200 bg-gray-50'} py-6`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Logo et copyright */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <FaMoneyBillWave className={`text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>CashPays</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                © 2026 CashPays - GOUROUSDJA. Tous droits réservés.
              </p>
            </div>

            {/* Liens footer - Utilisation de Link de react-router-dom */}
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/terms" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                Conditions
              </Link>
              <Link to="/privacy" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                Confidentialité
              </Link>
              <Link to="/contact" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                Contact
              </Link>
              <Link to="/faq" className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                FAQ
              </Link>
            </div>

            {/* Réseaux sociaux - Utilisation de <a> pour les liens externes */}
            <div className="flex gap-3">
              <a 
                href="https://www.facebook.com/cashpays" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-2 rounded-full transition-all ${isDark ? 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                aria-label="Facebook"
              >
                <FaFacebook size={14} />
              </a>
              <a 
                href="https://wa.me/23562787307" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-2 rounded-full transition-all ${isDark ? 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                aria-label="WhatsApp"
              >
                <FaWhatsapp size={14} />
              </a>
              <a 
                href="https://t.me/cashpays" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-2 rounded-full transition-all ${isDark ? 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                aria-label="Telegram"
              >
                <FaTelegram size={14} />
              </a>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className={`mt-4 pt-4 text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'} border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <p>CashPays est une marque de GOUROUSDJA - Agrément COBAC N° 2026/001</p>
            <p className="mt-1">
              <FaPhone className="inline mr-1" size={10} /> Service client: 62 78 73 07
              <span className="mx-2">•</span>
              <FaEnvelope className="inline mr-1" size={10} /> support@cashpays.td
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation (Mobile) */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t z-40 md:hidden ${isDark ? 'bg-blue-900/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-lg`}>
        <div className="container mx-auto px-2">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const isActive = isActiveLink(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                    isActive 
                      ? 'text-blue-400' 
                      : isDark ? 'text-white/50' : 'text-gray-500'
                  }`}
                >
                  <item.icon className="text-xl" />
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation (Desktop) */}
      <aside className={`hidden md:block fixed left-0 top-[73px] bottom-0 w-64 border-r z-30 ${isDark ? 'bg-blue-900/40 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-sm`}>
        <div className="p-4 h-full flex flex-col">
          {/* User info */}
          <div className={`mb-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full">
                <FaUser className="text-white" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.fullname || 'Utilisateur'}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  {user?.phone}
                </p>
              </div>
            </div>
            {balance !== null && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Solde
                  </span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatAmount(balance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation links */}
          <div className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = isActiveLink(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isDark 
                        ? 'text-white/70 hover:bg-white/10 hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Logout button desktop */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg transition-all ${
              isDark 
                ? 'text-white/50 hover:bg-white/10 hover:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <FaSignOutAlt />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Desktop content padding */}
      <div className="hidden md:block md:ml-64"></div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/30'}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={`absolute right-0 top-0 bottom-0 w-64 shadow-xl p-4 animate-slide-left ${isDark ? 'bg-blue-900' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Menu
              </h3>
              <button onClick={() => setMobileMenuOpen(false)} className={isDark ? 'text-white/60' : 'text-gray-500'}>
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className={`mb-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user?.fullname}
              </p>
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {user?.phone}
              </p>
              {balance !== null && (
                <p className={`text-sm mt-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                  {formatAmount(balance)}
                </p>
              )}
            </div>
            
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isDark 
                    ? 'text-white/70 hover:bg-white/10' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            ))}
            
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg transition-all ${
                isDark 
                  ? 'text-white/50 hover:bg-white/10' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FaSignOutAlt />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className={`relative max-w-sm w-full rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mon QR Code
              </h3>
              <button 
                onClick={() => setShowQR(false)} 
                className={`p-2 rounded-lg transition-all ${isDark ? 'text-white/60 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className={`p-4 rounded-xl inline-block mx-auto mb-4 ${isDark ? 'bg-white' : 'bg-gray-100'}`}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  JSON.stringify({
                    type: 'payment',
                    recipient: user?.phone,
                    name: user?.fullname,
                    currency: 'XAF'
                  })
                )}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className={`font-mono text-xl tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.phone}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.phone || '')
                    toast.success('Numéro copié !')
                  }}
                  className={`transition-all ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <FaCopy />
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Scannez ce code pour me payer
              </p>
            </div>
            
            <button
              onClick={() => setShowQR(false)}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                isDark 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout