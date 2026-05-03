// src/components/ThemeSelector.jsx
import React from 'react'
import { FaPalette } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-selector">
      <button
        className={`theme-option ${theme === 'blue' ? 'active' : ''}`}
        onClick={() => setTheme('blue')}
        data-theme="blue"
      >
        🔵 Bleu
      </button>
      <button
        className={`theme-option ${theme === 'red' ? 'active' : ''}`}
        onClick={() => setTheme('red')}
        data-theme="red"
      >
        🔴 Rouge
      </button>
      <button
        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
      >
        🌙 Sombre
      </button>
    </div>
  )
}

export default ThemeSelector