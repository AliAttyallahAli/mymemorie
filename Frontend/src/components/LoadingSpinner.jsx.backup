// src/components/LoadingSpinner.jsx
import React from 'react'

function LoadingSpinner({ size = 'md', color = 'white', fullScreen = false }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const spinner = (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-4 border-${color}/20 border-t-${color} rounded-full animate-spin`}></div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
          <p className="text-white mt-4">Chargement...</p>
        </div>
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner