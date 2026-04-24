// src/App.jsx
import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
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



const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
let socket = null

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // État de chargement

  useEffect(() => {
    // Vérifier l'authentification au chargement
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setLoading(true)
    
    try {
      const token = localStorage.getItem('accessToken')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        // Vérifier si le token est toujours valide
        const userData = JSON.parse(savedUser)
        
        // Optionnel: Vérifier la validité du token avec le backend
        try {
          const response = await axios.get('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data.valid) {
            setUser(userData)
            initSocket(token)
          } else {
            // Token invalide, déconnexion
            handleLogout()
          }
        } catch (error) {
          // Si le serveur ne répond pas, on garde l'utilisateur
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
      auth: { token }
    })
    
    socket.on('connect', () => {
      console.log('Socket connecté')
      socket.emit('authenticate', token)
    })
    
    socket.on('connect_error', (error) => {
      console.error('Socket error:', error)
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    if (socket) {
      socket.disconnect()
    }
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
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/features" element={<Features user={user} />} />
        <Route path="/fees" element={<Fees user={user} />} />
        <Route path="/become-agent" element={<BecomeAgent user={user} />} />
        <Route path="/faq" element={<FAQ user={user} />} />
        <Route path="/blog" element={<Blog user={user} />} />
        <Route path="/agents" element={<Agents user={user} />} />
        <Route path="/licenses" element={<Licenses user={user} />} />
        
        <Route element={<PrivateRoute user={user} />}>
          <Route path="/dashboard" element={<Dashboard user={user} socket={socket} />} />
          <Route path="/transfer" element={<Transfer user={user} />} />
          <Route path="/history" element={<History user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/admin" element={<AdminPanel user={user} />} />
          <Route path="/admin/create-agent" element={<CreateAgent user={user} />} />
          <Route path="/terms" element={<Terms user={user} />} />
          <Route path="/privacy" element={<Privacy user={user} />} />
          <Route path="/contact" element={<Contact user={user} />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App