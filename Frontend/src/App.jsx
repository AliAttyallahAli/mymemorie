// src/App.jsx (version améliorée)
import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transfer from './pages/Transfer'
import History from './pages/History'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import Announcements from './pages/Announcements'
import PrivateRoute from './components/PrivateRoute'
import NotificationToast from './components/NotificationToast'
import Settings from './pages/Settings'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Contact from './pages/Contact'
import CreateAgent from './pages/CreateAgent'

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false
})

function App() {
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      
      // Connexion socket
      socket.auth = { token }
      socket.connect()
      
      socket.on('connect', () => {
        console.log('Socket connecté')
        socket.emit('authenticate', token)
      })
      
      socket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev])
        
        // Son de notification (optionnel)
        const audio = new Audio('/notification.mp3')
        audio.play().catch(e => console.log('Audio non supporté'))
      })
      
      socket.on('transaction_update', (data) => {
        console.log('Mise à jour transaction:', data)
      })
    }
    
    return () => {
      socket.off('connect')
      socket.off('notification')
      socket.off('transaction_update')
      socket.disconnect()
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    socket.disconnect()
  }

  const removeNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen">
      {/* Notifications flottantes */}
      {notifications.map((notif, index) => (
        <NotificationToast
          key={index}
          notification={notif}
          onClose={() => removeNotification(index)}
        />
      ))}
      
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms" element={<Terms user={user} />} />
<Route path="/privacy" element={<Privacy user={user} />} />
<Route path="/contact" element={<Contact user={user} />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        <Route element={<PrivateRoute user={user} />}>
          <Route path="/dashboard" element={<Dashboard user={user} socket={socket} />} />
          <Route path="/admin/create-agent" element={<CreateAgent user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="/transfer" element={<Transfer user={user} />} />
          <Route path="/history" element={<History user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/admin/*" element={<AdminPanel user={user} />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App