// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import toast from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transfer from './pages/Transfer'
import History from './pages/History'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import Announcements from './pages/Announcements'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Contact from './pages/Contact'
import Settings from './pages/Settings'
import CreateAgent from './pages/CreateAgent'
import PrivateRoute from './components/PrivateRoute'
import Home from './pages/Home'
import ErrorBoundary from './components/ErrorBoundary'
import Features from './pages/Features'
import Fees from './pages/Fees'
import BecomeAgent from './pages/BecomeAgent'
import FAQ from './pages/FAQ'
import Blog from './pages/Blog'
import Agents from './pages/Agents'
import Licenses from './pages/Licenses'
import BlogPost from './pages/BlogPost'
import Deposit from './pages/Deposit'
import Withdraw from './pages/Withdraw'
import NotificationToast from './components/NotificationToast'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
let socket = null

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [socketConnected, setSocketConnected] = useState(false)

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth()
    
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const checkAuth = async () => {
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        const userData = JSON.parse(savedUser)
        
        try {
          const response = await axios.get('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data.valid) {
            setUser(userData)
            initSocket(token)
          } else {
            handleLogout()
          }
        } catch (error) {
          console.error('Erreur vérification token:', error)
          setUser(userData)
          initSocket(token)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error)
      handleLogout()
    } finally {
      setLoading(false)
    }
  }

  const initSocket = (token) => {
    if (socket && socket.connected) {
      socket.disconnect()
    }
    
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: { token }
    })
    
    socket.on('connect', () => {
      console.log('✅ Socket connecté')
      setSocketConnected(true)
      socket.emit('authenticate', token)
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket error:', error.message)
      setSocketConnected(false)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket déconnecté:', reason)
      setSocketConnected(false)
    })
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnecté après ${attemptNumber} tentatives`)
      setSocketConnected(true)
      socket.emit('authenticate', token)
    })
    
    // Écouter les notifications entrantes
    socket.on('notification', (notification) => {
      console.log('📢 Notification reçue:', notification)
      
      // Ajouter la notification à l'état
      setNotifications(prev => [{
        ...notification,
        id: notification.id || Date.now(),
        timestamp: notification.timestamp || new Date().toISOString()
      }, ...prev])
      
      // Afficher un toast pour les notifications importantes
      if (notification.type === 'transaction' || notification.type === 'alert') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-slide-down' : 'hidden'} max-w-md w-full bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl shadow-2xl p-4 border-l-4 border-blue-500`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-white font-semibold">{notification.title}</p>
                <p className="text-white/70 text-sm">{notification.message}</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>
          </div>
        ), { duration: 5000 })
      }
    })
    
    // Écouter les mises à jour de transaction
    socket.on('transaction_update', (data) => {
      console.log('🔄 Mise à jour transaction:', data)
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    if (socket && socket.connected) {
      socket.disconnect()
    }
    setSocketConnected(false)
    toast.success('Déconnecté avec succès')
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Notifications flottantes */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
      
      <ErrorBoundary>
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          
          {/* Pages statiques */}
          <Route path="/features" element={<Features user={user} />} />
          <Route path="/fees" element={<Fees user={user} />} />
          <Route path="/become-agent" element={<BecomeAgent user={user} />} />
          <Route path="/faq" element={<FAQ user={user} />} />
          <Route path="/blog" element={<Blog user={user} />} />
          <Route path="/blog/:slug" element={<BlogPost user={user} />} />
          <Route path="/agents" element={<Agents user={user} />} />
          <Route path="/licenses" element={<Licenses user={user} />} />
          <Route path="/terms" element={<Terms user={user} />} />
          <Route path="/privacy" element={<Privacy user={user} />} />
          <Route path="/contact" element={<Contact user={user} />} />
          
          {/* Routes protégées */}
          <Route element={<PrivateRoute user={user} />}>
            <Route path="/dashboard" element={<Dashboard user={user} socket={socket} />} />
            <Route path="/transfer" element={<Transfer user={user} socket={socket} />} />
            <Route path="/deposit" element={<Deposit user={user} />} />
            <Route path="/withdraw" element={<Withdraw user={user} socket={socket} />} />
            <Route path="/history" element={<History user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/admin" element={<AdminPanel user={user} />} />
            <Route path="/admin/create-agent" element={<CreateAgent user={user} />} />
          </Route>
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App