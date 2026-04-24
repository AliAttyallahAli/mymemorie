// src/components/PrivateRoute.jsx
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

function PrivateRoute({ user }) {
  const token = localStorage.getItem('accessToken')
  
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  
  // Vérifier si le token n'est pas expiré (optionnel)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp < Date.now() / 1000) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      return <Navigate to="/login" replace />
    }
  } catch (e) {
    console.error('Token invalide')
  }
  
  return <Outlet />
}

export default PrivateRoute