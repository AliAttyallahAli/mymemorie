// src/styles/themes.js
export const themes = {
  dark: {
    // Couleurs principales
    primary: '#0A2F6C',      // Blue Marine
    primaryLight: '#1A4A8B',
    primaryDark: '#061A40',
    secondary: '#2E6EB5',
    
    // Couleurs d'arrière-plan
    background: {
      main: 'from-blue-900 via-blue-800 to-blue-900',
      card: 'bg-white/10',
      cardHover: 'bg-white/15',
      overlay: 'bg-black/50',
      input: 'bg-white/10',
      sidebar: 'bg-blue-900/40',
      header: 'bg-blue-900/80',
    },
    
    // Couleurs de texte
    text: {
      primary: 'text-white',
      secondary: 'text-white/70',
      muted: 'text-white/50',
      disabled: 'text-white/30',
      accent: 'text-blue-300',
    },
    
    // Couleurs de bordure
    border: {
      primary: 'border-white/20',
      secondary: 'border-white/10',
      hover: 'hover:border-white/30',
    },
    
    // Boutons
    button: {
      primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
      secondary: 'bg-white/20 hover:bg-white/30 text-white',
      danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
      success: 'bg-green-500/20 hover:bg-green-500/30 text-green-400',
    },
    
    // États
    status: {
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    
    // Ombres
    shadow: {
      sm: 'shadow-lg shadow-black/20',
      md: 'shadow-xl shadow-black/30',
      lg: 'shadow-2xl shadow-black/40',
    }
  },
  
  light: {
    // Couleurs principales
    primary: '#0A2F6C',      // Blue Marine (conservé pour la marque)
    primaryLight: '#E8F0FE',
    primaryDark: '#05204A',
    secondary: '#4A90E2',
    
    // Couleurs d'arrière-plan
    background: {
      main: 'from-gray-50 via-blue-50 to-gray-100',
      card: 'bg-white',
      cardHover: 'bg-gray-50',
      overlay: 'bg-black/30',
      input: 'bg-gray-50',
      sidebar: 'bg-white/80',
      header: 'bg-white/90',
    },
    
    // Couleurs de texte
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      muted: 'text-gray-400',
      disabled: 'text-gray-300',
      accent: 'text-blue-600',
    },
    
    // Couleurs de bordure
    border: {
      primary: 'border-gray-200',
      secondary: 'border-gray-100',
      hover: 'hover:border-gray-300',
    },
    
    // Boutons
    button: {
      primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      danger: 'bg-red-50 hover:bg-red-100 text-red-600',
      success: 'bg-green-50 hover:bg-green-100 text-green-600',
    },
    
    // États
    status: {
      success: 'bg-green-50 text-green-700 border-green-200',
      error: 'bg-red-50 text-red-700 border-red-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    
    // Ombres
    shadow: {
      sm: 'shadow-md shadow-gray-200/50',
      md: 'shadow-lg shadow-gray-300/30',
      lg: 'shadow-xl shadow-gray-400/20',
    }
  }
}

// Helper pour obtenir les classes CSS du thème actuel
export const getThemeClasses = (theme) => {
  const t = themes[theme] || themes.dark
  
  return {
    // Classes globales
    body: `bg-gradient-to-br ${t.background.main} min-h-screen transition-colors duration-300`,
    
    // Classes de carte
    card: `${t.background.card} backdrop-blur-lg rounded-2xl ${t.shadow.sm} p-6 border ${t.border.primary} transition-all duration-200`,
    
    // Classes d'entrée
    input: `w-full px-4 py-3 rounded-xl ${t.background.input} border ${t.border.primary} ${t.text.primary} placeholder-${t.text.muted.replace('text-', '')} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200`,
    
    // Classes de label
    label: `block ${t.text.secondary} text-sm font-medium mb-2`,
    
    // Classes de bouton principal
    btnPrimary: `px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${t.button.primary} ${t.shadow.sm}`,
    
    // Classes de bouton secondaire
    btnSecondary: `px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${t.button.secondary}`,
    
    // Classes de tableau
    tableHeader: `px-6 py-3 text-left ${t.text.secondary} text-sm font-medium border-b ${t.border.primary}`,
    tableRow: `border-b ${t.border.secondary} ${t.text.primary}`,
    
    // Classes de navigation
    navLink: `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${t.text.secondary} hover:${t.background.cardHover} hover:${t.text.primary}`,
    navLinkActive: `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 bg-blue-600 text-white shadow-md`,
  }
}