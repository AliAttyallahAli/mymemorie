// src/components/PrivateRoute.jsx
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

function PrivateRoute({ user }) {
  // Vérifier le token dans localStorage à chaque fois
  const token = localStorage.getItem('accessToken')
  const savedUser = localStorage.getItem('user')
  
  // Si pas de token ou pas d'utilisateur, rediriger vers login
  if (!token || !savedUser || !user) {
    return <Navigate to="/login" replace />
  }
  
  // Vérifier que l'utilisateur correspond
  try {
    const userData = JSON.parse(savedUser)
    if (userData.id !== user?.id) {
      return <Navigate to="/login" replace />
    }
  } catch (e) {
    return <Navigate to="/login" replace />
  }
  
  return <Outlet />
}

export default PrivateRoute