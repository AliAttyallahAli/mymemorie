// src/context/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react'
import { themes, getThemeClasses } from '../styles/themes'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Récupérer le thème sauvegardé ou détecter la préférence système
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      return savedTheme
    }
    // Détecter la préférence système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    return 'dark'
  })

  const [themeClasses, setThemeClasses] = useState(() => getThemeClasses(theme))

  useEffect(() => {
    // Sauvegarder le thème
    localStorage.setItem('theme', theme)
    
    // Mettre à jour les classes
    setThemeClasses(getThemeClasses(theme))
    
    // Appliquer le thème au document
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    }
    
    // Mettre à jour la meta viewport pour les couleurs
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0A2F6C' : '#E8F0FE')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const setThemeMode = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setTheme(newTheme)
    }
  }

  const value = {
    theme,
    themeClasses,
    toggleTheme,
    setThemeMode,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}