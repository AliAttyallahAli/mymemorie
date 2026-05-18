// src/components/ThemeToggle.jsx
import React from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        isDark ? 'bg-blue-800' : 'bg-gray-200'
      } ${className}`}
      aria-label="Changer de thème"
    >
      <div
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
          isDark ? 'translate-x-7' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <FaMoon className="text-blue-800 text-xs" />
        ) : (
          <FaSun className="text-yellow-500 text-xs" />
        )}
      </div>
    </button>
  )
}

export default ThemeToggle