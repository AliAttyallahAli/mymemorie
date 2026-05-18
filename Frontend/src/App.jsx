// src/App.jsx - Version corrigée
import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { Toaster } from 'react-hot-toast'
import { toast } from './utils/toast'
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
import TwoFactorAuth from './pages/TwoFactorAuth'
import NotificationDetail from './pages/NotificationDetail'
import AgentApplicationDetail from './pages/AgentApplicationDetail'
import KYCDetail from './pages/KYCDetail'
import TaxPayment from './pages/TaxPayment'
import AdminTaxes from './pages/AdminTaxes'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
let socket = null

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
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
      socket.emit('authenticate', token)
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket error:', error.message)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket déconnecté:', reason)
    })
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnecté après ${attemptNumber} tentatives`)
      socket.emit('authenticate', token)
    })
    
    // Gestion des notifications
    socket.on('notification', (notification) => {
      console.log('📢 Notification reçue:', notification)
      
      // Utiliser le toast personnalisé avec le bon type
      if (notification.type === 'security') {
        toast.security(notification.message || notification.title, {
          icon: '🔑',
          duration: 10000
        })
      } else if (notification.type === 'success') {
        toast.success(notification.message || notification.title)
      } else if (notification.type === 'error') {
        toast.error(notification.message || notification.title)
      } else {
        toast.info(notification.message || notification.title)
      }
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
    toast.success('Déconnecté avec succès')
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
      <Toaster position="top-right" />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          
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
          
          <Route element={<PrivateRoute user={user} />}>
            <Route path="/tax-payment" element={<TaxPayment user={user} />} />
            <Route path="/admin/taxes" element={<AdminTaxes user={user} />} />
            <Route path="/dashboard" element={<Dashboard user={user} socket={socket} />} />
            <Route path="/transfer" element={<Transfer user={user} socket={socket} />} />
            <Route path="/deposit" element={<Deposit user={user} />} />
            <Route path="/settings/2fa" element={<TwoFactorAuth user={user} />} />
            <Route path="/withdraw" element={<Withdraw user={user} />} />
            <Route path="/notifications/:id" element={<NotificationDetail user={user} />} />
            <Route path="/admin/agent-applications/:id" element={<AgentApplicationDetail user={user} />} />
            <Route path="/admin/kyc/:id" element={<KYCDetail user={user} />} />
            <Route path="/history" element={<History user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/admin" element={<AdminPanel user={user} socket={socket} />} />
            <Route path="/admin/create-agent" element={<CreateAgent user={user} />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App